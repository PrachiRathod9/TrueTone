/**
 * TrueTone AI Voice Inference Service
 * Connects the Android/Web client to the secure TrueTone backend API.
 * The backend hosts the private Hugging Face model: `kathakundra/truetone-voice-model`
 * and performs FFmpeg 16kHz mono resampling, 4-second chunking, and probability aggregation.
 */

import { getCurrentUserToken } from "./firebase";

export interface AnalysisInput {
  audioBlob?: Blob;
  audioFile?: File;
  callerNumber?: string;
  callerName?: string;
  behaviorQuestions: {
    askedForMoney: boolean;
    askedForOtpOrPin: boolean;
    createdUrgency: boolean;
  };
  userId?: string;
}

export interface InferenceResult {
  id?: number | string;
  callerNumber?: string;
  callerName?: string;
  aiConfidence: number;        // e.g. 0.25793 (25.79%)
  humanConfidence: number;     // e.g. 0.74207 (74.21%)
  rawAiProbability: number;    // e.g. 0.25793
  threshold: number;           // 0.15 as specified in project parameters
  isAi: boolean;               // rawAiProbability >= threshold
  voiceAuthenticityScore: number; // 0 - 100%
  behaviorRiskScore: number;      // 0 - 100% based on affirmative answers
  combinedRiskScore: number;      // Weighted combined score (0 - 100%)
  verdict: "Safe" | "High Risk";
  chunkProbabilities?: number[];  // 4-second chunk evaluations
  behaviorFlags?: string[];
  blocked?: boolean;
  audioSource?: string;
  disclaimer?: string;
  timestamp: string;
}

const DEFAULT_BACKEND_URL =
  (import.meta.env.VITE_TRUETONE_API_URL as string | undefined) || "http://10.233.39.190:8000";

export class InferenceService {
  /**
   * Get currently configured backend base URL (from localStorage or default)
   */
  getBackendUrl(): string {
    try {
      const stored = localStorage.getItem("truetone_backend_url");
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, "");
      }
    } catch (_) {}
    return DEFAULT_BACKEND_URL.replace(/\/+$/, "");
  }

  /**
   * Save a user-specified backend URL (e.g. physical device IP or emulator 10.0.2.2)
   */
  setBackendUrl(url: string): void {
    try {
      const clean = url.trim().replace(/\/+$/, "");
      localStorage.setItem("truetone_backend_url", clean);
    } catch (_) {}
  }

  /**
   * Test backend connectivity and retrieve loaded model details
   */
  async checkHealth(targetUrl?: string): Promise<{ ok: boolean; status?: string; model?: string; device?: string; database?: any; error?: string }> {
    const base = (targetUrl ? targetUrl.trim().replace(/\/+$/, "") : this.getBackendUrl());
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${base}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          ok: true,
          status: data.status,
          model: data.model,
          device: data.device,
          database: data.database,
        };
      }
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return { ok: false, error: "Connection timed out (5s). Check if backend is reachable." };
      }
      return { ok: false, error: err?.message || "Could not reach TrueTone backend." };
    }
  }

  /**
   * Submit audio and behavior responses to backend for real Wav2Vec2 voice classification
   * Never falls back to simulated/random results.
   */
  async analyzeVoice(input: AnalysisInput): Promise<InferenceResult> {
    const backendUrl = this.getBackendUrl();
    const formData = new FormData();

    if (input.audioFile) {
      formData.append("file", input.audioFile, input.audioFile.name);
      formData.append("audioSource", input.audioFile.name);
    } else if (input.audioBlob) {
      const isWav = input.audioBlob.type.includes("wav");
      formData.append("file", input.audioBlob, isWav ? "recording.wav" : "recording.mp3");
      formData.append("audioSource", "Live Microphone Sample");
    } else {
      throw new Error("No audio recording or file was provided for analysis.");
    }

    const cleanNumber = (input.callerNumber || "").trim();
    const cleanName = (input.callerName || "").trim() || "Unknown caller";
    formData.append("callerNumber", cleanNumber);
    formData.append("callerName", cleanName);
    formData.append("behaviorAnswers", JSON.stringify(input.behaviorQuestions));

    const reqHeaders: Record<string, string> = {};
    const token = await getCurrentUserToken();
    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    }
    if (input.userId && input.userId.trim()) {
      formData.append("userId", input.userId.trim());
      reqHeaders["X-User-Id"] = input.userId.trim();
    }

    let response: Response;
    try {
      response = await fetch(`${backendUrl}/api/v1/analyze`, {
        method: "POST",
        headers: reqHeaders,
        body: formData,
      });
    } catch (networkErr: any) {
      throw new Error(
        `Unable to reach TrueTone backend at ${backendUrl}. Ensure the backend server is running and accessible from this device.`
      );
    }

    if (!response.ok) {
      let errorDetail = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData?.detail) {
          errorDetail = errorData.detail;
        }
      } catch (_) {}
      throw new Error(errorDetail);
    }

    const data = await response.json();
    const aiConfidence = Number(data.ai_confidence ?? data.ai_probability ?? 0);
    const humanConfidence = Number(data.human_confidence ?? Math.max(0, 1 - aiConfidence));
    const rawAiProbability = Number(data.ai_probability ?? aiConfidence);
    const threshold = Number(data.threshold ?? 0.15);
    const isAi = Boolean(data.is_ai ?? rawAiProbability >= threshold);
    const behaviorRisk = this.calculateBehaviorScore(input.behaviorQuestions);
    const behaviorRiskScore = Number(data.behavior_risk_score ?? behaviorRisk);
    const combinedRiskScore = Number(
      data.combined_risk_score ?? Math.round(aiConfidence * 100 * 0.6 + behaviorRisk * 0.4)
    );
    const voiceAuthenticityScore = Math.round(aiConfidence * 100);
    const verdict: "Safe" | "High Risk" =
      data.verdict === "High Risk" || data.verdict === "Safe"
        ? data.verdict
        : isAi || combinedRiskScore >= 50
        ? "High Risk"
        : "Safe";
    const chunkProbabilities = Array.isArray(data.chunk_probabilities)
      ? data.chunk_probabilities
      : [];
    const disclaimer =
      data.disclaimer ||
      "Preliminary risk assessment based on acoustic voice modeling and behavioral risk indicators. Does not constitute definitive forensic proof.";

    return {
      id: data.id,
      callerNumber: data.caller_number ?? input.callerNumber,
      callerName: data.caller_name || input.callerName,
      aiConfidence,
      humanConfidence,
      rawAiProbability,
      threshold,
      isAi,
      voiceAuthenticityScore,
      behaviorRiskScore,
      combinedRiskScore,
      verdict,
      chunkProbabilities,
      behaviorFlags: data.behavior_flags || [],
      blocked: Boolean(data.blocked),
      audioSource: data.audio_source || (input.audioFile ? input.audioFile.name : "Live Microphone Sample"),
      disclaimer,
      timestamp: data.timestamp || new Date().toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }

  /**
   * Fetch persisted analyses scoped to the user ID
   */
  async getAnalyses(userId?: string): Promise<InferenceResult[]> {
    const backendUrl = this.getBackendUrl();
    const cleanUid = (userId || "").trim();
    const query = cleanUid ? `?userId=${encodeURIComponent(cleanUid)}` : "";
    const headers: Record<string, string> = {};
    const token = await getCurrentUserToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (cleanUid) {
      headers["X-User-Id"] = cleanUid;
    }

    try {
      const res = await fetch(`${backendUrl}/api/v1/analyses${query}`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).map((item: any) => ({
        id: item.id,
        callerNumber: item.caller_number || "",
        callerName: item.caller_name || "Unknown caller",
        aiConfidence: Number(item.ai_probability ?? 0),
        humanConfidence: Number(item.human_confidence ?? 0),
        rawAiProbability: Number(item.ai_probability ?? 0),
        threshold: 0.15,
        isAi: Boolean(item.is_ai),
        voiceAuthenticityScore: Math.round(Number(item.ai_probability ?? 0) * 100),
        behaviorRiskScore: Number(item.behavior_score ?? 0),
        combinedRiskScore: Number(item.combined_risk_score ?? 0),
        verdict: (item.verdict as "Safe" | "High Risk") || "Safe",
        chunkProbabilities: item.chunk_probabilities || [],
        behaviorFlags: item.behavior_flags || [],
        blocked: Boolean(item.blocked),
        audioSource: item.audio_source || "Audio Sample",
        timestamp: item.timestamp || "Earlier",
      }));
    } catch (_) {
      return [];
    }
  }

  /**
   * Execute application-level block in TrueTone and persist to backend
   */
  async blockCaller(callerNumber: string, callerName?: string, reason?: string, userId?: string): Promise<{ success: boolean; caller_number: string; status: string; note: string }> {
    const backendUrl = this.getBackendUrl();
    const cleanUid = (userId || "").trim();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = await getCurrentUserToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (cleanUid) {
      headers["X-User-Id"] = cleanUid;
    }

    const res = await fetch(`${backendUrl}/api/v1/block`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        callerNumber,
        callerName: callerName || "Unknown caller",
        reason: reason || "Flagged as high-risk synthetic voice",
        userId: cleanUid || undefined,
      }),
    });
    if (!res.ok) {
      let msg = `Failed to block caller (${res.status})`;
      try {
        const err = await res.json();
        if (err?.detail) msg = err.detail;
      } catch (_) {}
      throw new Error(msg);
    }
    return await res.json();
  }

  /**
   * Retrieve genuine aggregated stats scoped to this user account
   */
  async getStatistics(userId?: string): Promise<{ calls_checked: number; threats_stopped: number }> {
    const backendUrl = this.getBackendUrl();
    const cleanUid = (userId || "").trim();
    const query = cleanUid ? `?userId=${encodeURIComponent(cleanUid)}` : "";
    const headers: Record<string, string> = {};
    const token = await getCurrentUserToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (cleanUid) {
      headers["X-User-Id"] = cleanUid;
    }

    try {
      const res = await fetch(`${backendUrl}/api/v1/stats${query}`, { headers });
      if (!res.ok) return { calls_checked: 0, threats_stopped: 0 };
      const data = await res.json();
      return {
        calls_checked: Number(data.calls_checked ?? 0),
        threats_stopped: Number(data.threats_stopped ?? 0),
      };
    } catch (_) {
      return { calls_checked: 0, threats_stopped: 0 };
    }
  }

  calculateBehaviorScore(q: AnalysisInput["behaviorQuestions"]): number {
    let score = 0;
    if (q.askedForMoney) score += 35;
    if (q.askedForOtpOrPin) score += 40;
    if (q.createdUrgency) score += 25;
    return score;
  }
}

export const inferenceService = new InferenceService();
