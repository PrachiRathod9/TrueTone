/**
 * TrueTone Audio Service
 * Handles microphone recording, live audio level analysis, and audio file selection.
 */

export interface AudioRecordingResult {
  blob: Blob;
  durationSeconds: number;
  fileName?: string;
  mimeType: string;
}

export class AudioService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  private pcmChunks: Float32Array[] = [];
  private scriptProcessor: ScriptProcessorNode | null = null;

  /**
   * Request microphone permission and verify availability
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("MediaDevices API is not available on this platform/context");
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the test tracks immediately
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      console.error("Microphone permission denied or unavailable:", err);
      return false;
    }
  }

  /**
   * Start live microphone recording with frequency waveform visualization
   */
  async startRecording(onVolumeUpdate?: (normalizedLevels: number[]) => void): Promise<void> {
    this.audioChunks = [];
    this.pcmChunks = [];
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    // Setup Web Audio Analyser and PCM sample extraction
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);

        try {
          const bufferSize = 4096;
          this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
          this.scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            this.pcmChunks.push(new Float32Array(inputData));
          };
          source.connect(this.scriptProcessor);
          this.scriptProcessor.connect(this.audioContext.destination);
        } catch (spErr) {
          console.warn("ScriptProcessor recording note:", spErr);
        }

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const updateWaveform = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          if (onVolumeUpdate) {
            // Take 16 representative frequency samples
            const sampled: number[] = [];
            const step = Math.max(1, Math.floor(dataArray.length / 16));
            for (let i = 0; i < 16; i++) {
              const val = dataArray[i * step] ?? 0;
              // Map 0-255 to 20-100% height
              const mapped = Math.min(100, Math.max(20, Math.round((val / 255) * 100)));
              sampled.push(mapped);
            }
            onVolumeUpdate(sampled);
          }
          this.animFrameId = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();
      }
    } catch (e) {
      console.warn("Waveform AudioContext analysis error:", e);
    }

    // Secondary fallback MediaRecorder
    try {
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.start(250);
    } catch (mrErr) {
      console.warn("MediaRecorder init note:", mrErr);
    }
  }

  /**
   * Stop recording and return the recorded audio blob
   */
  async stopRecording(durationSeconds = 10): Promise<AudioRecordingResult> {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (_) {}
      this.scriptProcessor = null;
    }

    const sampleRate = this.audioContext?.sampleRate || 16000;
    const collectedPcm = this.pcmChunks;

    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        await this.audioContext.close();
      } catch (e) {
        console.warn(e);
      }
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch (_) {}
    }

    // If we captured PCM samples, encode directly to standard 16-bit PCM WAV
    if (collectedPcm.length > 0) {
      let totalLength = 0;
      for (const chunk of collectedPcm) {
        totalLength += chunk.length;
      }
      const flattened = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of collectedPcm) {
        flattened.set(chunk, offset);
        offset += chunk.length;
      }

      const wavBlob = encodeWAV(flattened, sampleRate);
      return {
        blob: wavBlob,
        durationSeconds,
        fileName: `truetone-sample-${Date.now()}.wav`,
        mimeType: "audio/wav",
      };
    }

    // Fallback if PCM was unavailable
    const mimeType = this.mediaRecorder?.mimeType || "audio/wav";
    const blob = new Blob(this.audioChunks, { type: mimeType });
    return {
      blob,
      durationSeconds,
      fileName: `truetone-sample-${Date.now()}.${mimeType.includes("webm") ? "webm" : "wav"}`,
      mimeType,
    };
  }

  /**
   * Pick an audio file from the user's device (Android storage or file picker)
   */
  async pickAudioFile(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac";
      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          resolve(input.files[0] ?? null);
        } else {
          resolve(null);
        }
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}

export const audioService = new AudioService();

/**
 * Encode raw Float32 PCM audio data into a valid 16-bit PCM WAV Blob
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, "RIFF");
  // File length minus 8
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, "WAVE");
  // Format chunk identifier
  writeString(view, 12, "fmt ");
  // Format chunk length (16 bytes for standard PCM)
  view.setUint32(16, 16, true);
  // Sample format (1 = raw uncompressed PCM)
  view.setUint16(20, 1, true);
  // Channel count (1 = mono)
  view.setUint16(22, 1, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sampleRate * 1 channel * 2 bytes/sample)
  view.setUint32(28, sampleRate * 2, true);
  // Block align (1 channel * 2 bytes/sample)
  view.setUint16(32, 2, true);
  // Bits per sample
  view.setUint16(34, 16, true);
  // Data chunk identifier
  writeString(view, 36, "data");
  // Data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples with clamp
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
