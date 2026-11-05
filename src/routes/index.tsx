import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, type ReactNode } from "react";
import {
  ArrowLeft, Bell, Check, ChevronRight, Clock3, ContactRound, History,
  Home, ListFilter, LockKeyhole, LogOut, Mic, Phone, PhoneCall, RotateCcw,
  Search, Settings, Shield, ShieldCheck, ShieldX, Smartphone, UserRound, Users, X,
  FileAudio, Upload, AlertCircle, Mail, Key, Loader2, Server, Wifi, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { audioService } from "@/lib/audio-service";
import { inferenceService, type InferenceResult } from "@/lib/inference-service";
import { loginWithEmail, registerWithEmail, signOutUser, saveAnalysisResult, saveUserProfile, isFirebaseConfigured, subscribeToAuth, getCurrentUser } from "@/lib/firebase";

type Screen = "login" | "otp" | "permissions" | "home" | "incoming" | "callerDetails" | "analysis" | "behavior" | "result" | "history" | "detail" | "profile";
type Filter = "All" | "Blocked" | "Safe" | "High Risk";

export function validateAndNormalizeIndianPhone(input: string, isOptional: boolean = false): { isValid: boolean; normalized: string; error?: string } {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    if (isOptional) {
      return { isValid: true, normalized: "" };
    }
    return { isValid: false, normalized: "", error: "Phone number is required." };
  }
  const digits = trimmed.replace(/\D/g, "");
  let clean10 = "";
  if (digits.length === 10) {
    clean10 = digits;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    clean10 = digits.substring(1);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    clean10 = digits.substring(2);
  } else {
    return {
      isValid: false,
      normalized: trimmed,
      error: "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +91 98765 43210).",
    };
  }

  if (!/^[6-9]\d{9}$/.test(clean10)) {
    return {
      isValid: false,
      normalized: `+91 ${clean10.slice(0, 5)} ${clean10.slice(5)}`,
      error: "Indian mobile numbers must start with 6, 7, 8, or 9.",
    };
  }

  return {
    isValid: true,
    normalized: `+91 ${clean10.slice(0, 5)} ${clean10.slice(5)}`,
  };
}

interface Incident {
  id?: number | string;
  name: string;
  number: string;
  date: string;
  risk: number;
  verdict: "Safe" | "High Risk";
  blocked: boolean;
  voiceScore?: number;
  behaviorScore?: number;
  behaviorFlags?: string[];
  audioSource?: string;
  rawAiProbability?: number;
  chunkProbabilities?: number[];
}

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "TrueTone — AI Scam Call Protection" },
    { name: "description", content: "Detect AI-cloned voices and suspicious scam calls with TrueTone." },
    { property: "og:title", content: "TrueTone — AI Scam Call Protection" },
    { property: "og:description", content: "Detect AI-cloned voices and suspicious scam calls with TrueTone." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: TrueToneApp,
});

function TrueToneApp() {
  const [screen, setScreen] = useState<Screen>("login");
  const [blockOpen, setBlockOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");
  const [countdown, setCountdown] = useState(24);
  const [permissions, setPermissions] = useState([false, false, false, false]);
  const [answers, setAnswers] = useState([true, true, true]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState({ calls_checked: 0, threats_stopped: 0 });
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Audio capture & caller details state
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [callerNumber, setCallerNumber] = useState("");
  const [callerName, setCallerName] = useState("");
  const [callerDetailsMode, setCallerDetailsMode] = useState<"mic" | "file">("mic");
  const [currentResult, setCurrentResult] = useState<InferenceResult | null>(null);
  const [userEmail, setUserEmail] = useState(getCurrentUser()?.email || "");
  const [userUid, setUserUid] = useState(getCurrentUser()?.uid || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Load genuine analyses and statistics on mount and per authenticated account
  const loadInitialData = async (uid?: string) => {
    try {
      const activeUid = uid !== undefined ? uid : userUid;
      const [fetchedAnalyses, fetchedStats] = await Promise.all([
        inferenceService.getAnalyses(activeUid),
        inferenceService.getStatistics(activeUid),
      ]);
      const mapped: Incident[] = (fetchedAnalyses || []).map((a) => ({
        id: a.id,
        name: a.callerName || "Unknown caller",
        number: a.callerNumber && a.callerNumber !== "Unknown" ? a.callerNumber : "Unknown caller",
        date: a.timestamp,
        risk: a.combinedRiskScore,
        verdict: a.verdict,
        blocked: Boolean(a.blocked),
        voiceScore: a.voiceAuthenticityScore,
        behaviorScore: a.behaviorRiskScore,
        behaviorFlags: a.behaviorFlags,
        audioSource: a.audioSource,
        rawAiProbability: a.rawAiProbability,
        chunkProbabilities: a.chunkProbabilities,
      }));
      setIncidents(mapped);
      setStats(fetchedStats);
      if (mapped.length > 0) {
        setSelectedIncident(mapped[0]);
      } else {
        setSelectedIncident(null);
      }
    } catch (e) {
      console.warn("Could not load persisted analyses:", e);
    }
  };

  useEffect(() => {
    const initialUser = getCurrentUser();
    loadInitialData(initialUser?.uid || "");
    if (isFirebaseConfigured()) {
      const unsub = subscribeToAuth((user) => {
        if (user) {
          setUserEmail(user.email || "");
          setUserUid(user.uid);
          loadInitialData(user.uid);
        } else {
          setUserEmail("");
          setUserUid("");
          setIncidents([]);
          setSelectedIncident(null);
          setStats({ calls_checked: 0, threats_stopped: 0 });
        }
      });
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (screen !== "otp" || countdown <= 0) return;
    const id = window.setInterval(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearInterval(id);
  }, [screen, countdown]);

  const go = (next: Screen) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setScreen(next);
  };

  const handleAnalysisComplete = (blobOrFile: { blob?: Blob; file?: File }) => {
    if (blobOrFile.file) {
      setSelectedAudioFile(blobOrFile.file);
      setRecordedAudioBlob(null);
    } else if (blobOrFile.blob) {
      setRecordedAudioBlob(blobOrFile.blob);
      setSelectedAudioFile(null);
    }
    setAnalysisError(null);
    go("behavior");
  };

  const handleRunInference = async () => {
    const questions = {
      askedForMoney: answers[0] ?? false,
      askedForOtpOrPin: answers[1] ?? false,
      createdUrgency: answers[2] ?? false,
    };

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await inferenceService.analyzeVoice({
        audioBlob: recordedAudioBlob ?? undefined,
        audioFile: selectedAudioFile ?? undefined,
        callerNumber: callerNumber.trim() ? callerNumber.trim() : "",
        callerName: callerName.trim() || "Unknown caller",
        behaviorQuestions: questions,
        userId: userUid || undefined,
      });

      setCurrentResult(res);

      const flags: string[] = res.behaviorFlags || [];
      if (flags.length === 0) {
        if (questions.askedForMoney) flags.push("Asked for money");
        if (questions.askedForOtpOrPin) flags.push("Requested OTP or PIN");
        if (questions.createdUrgency) flags.push("Created urgency");
      }

      const displayPhone = res.callerNumber && res.callerNumber !== "Unknown" ? res.callerNumber : "";
      const displayName = res.callerName || callerName || "Unknown caller";

      const newIncident: Incident = {
        id: res.id,
        name: displayName,
        number: displayPhone ? displayPhone : "Unknown caller",
        date: res.timestamp || "Just now",
        risk: res.combinedRiskScore,
        verdict: res.verdict,
        blocked: Boolean(res.blocked),
        voiceScore: res.voiceAuthenticityScore,
        behaviorScore: res.behaviorRiskScore,
        behaviorFlags: flags,
        audioSource: res.audioSource || (selectedAudioFile ? selectedAudioFile.name : "Live Microphone Sample"),
        rawAiProbability: res.rawAiProbability,
        chunkProbabilities: res.chunkProbabilities,
      };

      setIncidents((prev) => [newIncident, ...prev]);
      setSelectedIncident(newIncident);

      // Refresh real statistics for this account
      inferenceService.getStatistics(userUid).then(setStats).catch(() => {});

      // Save to Firestore if available and user is authenticated
      if (isFirebaseConfigured() && userUid) {
        saveAnalysisResult({
          userId: userUid,
          callerNumber: newIncident.number,
          callerName: newIncident.name,
          timestamp: Date.now(),
          voiceAuthenticityScore: res.voiceAuthenticityScore,
          behaviorRiskScore: res.behaviorRiskScore,
          combinedRiskScore: res.combinedRiskScore,
          verdict: res.verdict,
          blocked: Boolean(res.blocked),
          behaviorFlags: flags,
          rawAiProbability: res.rawAiProbability,
        }).catch((err) => {
          console.warn("[Firestore] Analysis sync note:", err?.message || err);
        });
      }

      go("result");
    } catch (err: any) {
      console.error("AI Inference Error:", err);
      setAnalysisError(err?.message || "Failed to analyze audio. Please verify backend connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmBlock = async () => {
    const targetNumber = currentResult?.callerNumber || selectedIncident?.number || callerNumber;
    const targetName = currentResult?.callerName || selectedIncident?.name || callerName || "Unknown caller";

    if (!targetNumber || targetNumber === "Unknown" || !targetNumber.trim()) {
      alert("Caller blocking is disabled because no valid phone number is available for this record.");
      setBlockOpen(false);
      return;
    }

    try {
      await inferenceService.blockCaller(targetNumber, targetName, "Flagged as high-risk synthetic voice", userUid);
      setIncidents((prev) =>
        prev.map((inc) => (inc.number === targetNumber ? { ...inc, blocked: true } : inc))
      );
      if (currentResult && (currentResult.callerNumber === targetNumber || currentResult.callerNumber === callerNumber)) {
        setCurrentResult((prev) => (prev ? { ...prev, blocked: true } : prev));
      }
      if (selectedIncident && selectedIncident.number === targetNumber) {
        setSelectedIncident((prev) => (prev ? { ...prev, blocked: true } : prev));
      }
      const newStats = await inferenceService.getStatistics(userUid);
      setStats(newStats);
    } catch (err: any) {
      console.error("Block failed:", err);
      alert(`Could not block number: ${err?.message || err}`);
    } finally {
      setBlockOpen(false);
    }
  };

  return (
    <main className="min-h-screen bg-app-surface pt-safe pb-safe sm:px-6 sm:py-8">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-background sm:min-h-[860px] sm:rounded-[28px] sm:border sm:shadow-panel">
        {screen === "login" && (
          <Login
            onNext={(emailOrPhone, uid) => {
              if (emailOrPhone.includes("@")) {
                setUserEmail(emailOrPhone);
                if (uid) setUserUid(uid);
                go("permissions");
              } else {
                go("otp");
              }
            }}
          />
        )}
        {screen === "otp" && (
          <Otp
            onBack={() => go("login")}
            onNext={() => go("permissions")}
            countdown={countdown}
            onResend={() => setCountdown(30)}
          />
        )}
        {screen === "permissions" && (
          <Permissions
            values={permissions}
            onChange={setPermissions}
            onNext={() => go("home")}
          />
        )}
        {screen === "home" && (
          <HomeScreen
            stats={stats}
            incidents={incidents}
            onDetail={(inc) => {
              setSelectedIncident(inc);
              go("detail");
            }}
            onIncoming={() => {
              setSelectedAudioFile(null);
              setRecordedAudioBlob(null);
              setCallerDetailsMode("mic");
              go("callerDetails");
            }}
            onPickAudio={async () => {
              const file = await audioService.pickAudioFile();
              if (file) {
                const lower = file.name.toLowerCase();
                if (lower.endsWith(".m4a") || lower.endsWith(".aac")) {
                  alert("AAC/M4A format is not supported by the lightweight audio decoder. Please choose a WAV, MP3, FLAC, or OGG file, or record live using the microphone.");
                  return;
                }
                setSelectedAudioFile(file);
                setRecordedAudioBlob(null);
                setCallerDetailsMode("file");
                go("callerDetails");
              }
            }}
            onHistory={() => go("history")}
            onProfile={() => go("profile")}
          />
        )}
        {screen === "callerDetails" && (
          <CallerDetails
            defaultPhone={callerNumber}
            defaultName={callerName}
            mode={callerDetailsMode}
            onCancel={() => {
              setSelectedAudioFile(null);
              setRecordedAudioBlob(null);
              go("home");
            }}
            onProceed={(phone, name) => {
              setCallerNumber(phone);
              setCallerName(name);
              go("analysis");
            }}
          />
        )}
        {screen === "incoming" && (
          <Incoming
            callerNumber={callerNumber || "+91 98765 43210"}
            callerName={callerName || "Unknown caller"}
            onBack={() => go("home")}
            onAnalyze={() => {
              setCallerDetailsMode("mic");
              go("callerDetails");
            }}
          />
        )}
        {screen === "analysis" && (
          <Analysis
            selectedAudioFile={selectedAudioFile}
            callerNumber={callerNumber}
            callerName={callerName}
            onCancel={() => go("callerDetails")}
            onComplete={handleAnalysisComplete}
          />
        )}
        {screen === "behavior" && (
          <Behavior
            answers={answers}
            onChange={setAnswers}
            onBack={() => {
              setAnalysisError(null);
              go("analysis");
            }}
            onNext={handleRunInference}
            isAnalyzing={isAnalyzing}
            analysisError={analysisError}
            onOpenSettings={() => go("profile")}
          />
        )}
        {screen === "result" && (
          <Result
            result={currentResult}
            onBlock={() => setBlockOpen(true)}
            onIgnore={() => go("home")}
            onBack={() => go("home")}
          />
        )}
        {screen === "history" && (
          <HistoryScreen
            incidents={incidents}
            filter={filter}
            onFilter={setFilter}
            onDetail={(inc) => {
              setSelectedIncident(inc);
              go("detail");
            }}
            onHome={() => go("home")}
            onProfile={() => go("profile")}
          />
        )}
        {screen === "detail" && (
          <IncidentDetail
            incident={selectedIncident}
            onBack={() => go("history")}
          />
        )}
        {screen === "profile" && (
          <ProfileScreen
            userEmail={userEmail}
            blockedCount={stats.threats_stopped}
            onHome={() => go("home")}
            onHistory={() => go("history")}
            onLogout={async () => {
              try {
                await signOutUser();
              } catch (e) {
                console.warn("Sign out note:", e);
              }
              setUserEmail("");
              setUserUid("");
              go("login");
            }}
          />
        )}
      </div>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="w-[calc(100%-32px)] max-w-sm rounded-2xl border-0 p-6">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive-soft text-destructive">
            <ShieldX />
          </div>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle>
              Block {currentResult?.callerNumber || selectedIncident?.number || callerNumber || "caller"}?
            </DialogTitle>
            <DialogDescription className="text-xs leading-5">
              Caller: <strong>{currentResult?.callerName || selectedIncident?.name || callerName || "Unknown caller"}</strong>
              <br />
              This number will be marked as <strong>Blocked in TrueTone</strong> (application-level blocklist). Future calls analyzed from this number will be flagged as blocked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex flex-row gap-3 sm:space-x-0">
            <Button className="flex-1" variant="outline" onClick={() => setBlockOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" variant="destructive" onClick={handleConfirmBlock}>
              Yes, Block in TrueTone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-brand">
        <ShieldCheck size={25} />
        <span className="absolute bottom-2 h-0.5 w-3 rounded-full bg-primary-foreground" />
      </div>
      <div>
        <p className="text-xl font-extrabold text-foreground">TrueTone</p>
        <p className="text-[10px] font-bold uppercase text-muted-foreground">Voice protection</p>
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack, action }: { title: string; subtitle?: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 px-5 pb-4 pt-6">
      <Button aria-label="Go back" variant="ghost" size="icon" className={onBack ? "-ml-2" : "hidden"} onClick={onBack}>
        <ArrowLeft />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

function Login({ onNext }: { onNext: (emailOrPhone: string, uid?: string) => void }) {
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (authMethod === "email") {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setErrorMsg("Please enter your email address.");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setErrorMsg("Please enter a valid email address (e.g. user@example.com).");
        return;
      }
      if (!password || password.length < 6) {
        setErrorMsg("Password must be at least 6 characters long.");
        return;
      }
      setLoading(true);
      try {
        if (!isFirebaseConfigured()) {
          setErrorMsg("Firebase Authentication is not configured.");
          setLoading(false);
          return;
        }

        if (isRegistering) {
          const user = await registerWithEmail(trimmedEmail, password);
          // Best-effort profile save to Firestore (succeeds as soon as rules are published)
          saveUserProfile(user.uid, {
            name: trimmedEmail.split("@")[0],
            phone: "",
            email: trimmedEmail,
          }).catch((e) => console.warn("[Firestore] Profile sync note:", e?.message || e));
          onNext(user.email || trimmedEmail, user.uid);
        } else {
          const user = await loginWithEmail(trimmedEmail, password);
          onNext(user.email || trimmedEmail, user.uid);
        }
      } catch (err: any) {
        console.error("Firebase auth error:", err);
        const code = err?.code || "";
        let friendly = "Authentication failed. Please verify your credentials.";
        if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
          friendly = isRegistering
            ? "Unable to register with these credentials. Please check your details."
            : "Invalid email or password. Don't have an account? Click 'Create an account' below.";
        } else if (code === "auth/email-already-in-use") {
          friendly = "An account with this email already exists. Click 'Sign In' below or use another email.";
        } else if (code === "auth/weak-password") {
          friendly = "Password is too weak. Please use at least 6 characters.";
        } else if (code === "auth/invalid-email") {
          friendly = "The email address is invalid.";
        } else if (code === "auth/user-disabled") {
          friendly = "This account has been disabled. Please contact support.";
        } else if (code === "auth/too-many-requests") {
          friendly = "Too many failed attempts. Please wait a moment and try again.";
        } else if (code === "auth/network-request-failed") {
          friendly = "Network connection error. Please check your internet connection.";
        } else if (err?.message) {
          friendly = err.message;
        }
        setErrorMsg(friendly);
      } finally {
        setLoading(false);
      }
    } else {
      const validation = validateAndNormalizeIndianPhone(phone);
      if (!validation.isValid) {
        setErrorMsg(validation.error || "Please enter a valid 10-digit Indian mobile number.");
        return;
      }
      setLoading(true);
      try {
        onNext(validation.normalized);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <section className="flex min-h-screen flex-col px-6 pb-8 pt-10 sm:min-h-[860px]">
      <Brand />
      <div className="mt-14">
        <div className="mb-6 grid size-16 place-items-center rounded-2xl bg-brand-soft text-primary">
          <LockKeyhole size={30} />
        </div>
        <h1 className="text-[30px] font-extrabold leading-tight">
          Your voice security<br />starts here.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {isRegistering
            ? "Create an account to protect against AI voice clones and fraudulent calls."
            : "Sign in to identify cloned voices and stay protected from suspicious calls."}
        </p>

        {/* Auth Method Selector */}
        <div className="mt-6 flex rounded-xl bg-secondary p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              authMethod === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => {
              setAuthMethod("email");
              setErrorMsg(null);
            }}
          >
            Email & Password (Primary)
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              authMethod === "phone" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => {
              setAuthMethod("phone");
              setErrorMsg(null);
            }}
          >
            Phone OTP (Optional)
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive-soft p-3 text-xs text-destructive">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {authMethod === "email" ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isRegistering ? "Create New TrueTone Account" : "Sign In to Your Account"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground" htmlFor="email-input">
                Email address
              </label>
              <div className="mt-2 flex h-13 items-center rounded-xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                <Mail size={18} className="text-muted-foreground" />
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground" htmlFor="password-input">
                Password {isRegistering && <span className="text-muted-foreground font-normal">(min 6 chars)</span>}
              </label>
              <div className="mt-2 flex h-13 items-center rounded-xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                <Key size={18} className="text-muted-foreground" />
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <label className="block text-xs font-bold text-foreground" htmlFor="identity">
              Phone number
            </label>
            <div className="mt-2 flex h-13 items-center rounded-xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
              <Smartphone size={18} className="text-muted-foreground" />
              <input
                id="identity"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
              />
            </div>
          </div>
        )}

        <Button
          size="lg"
          className="mt-6 w-full shadow-brand"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {isRegistering ? "Creating account..." : "Signing in..."}
            </span>
          ) : authMethod === "email" ? (
            isRegistering ? "Create Account & Continue" : "Sign In & Continue"
          ) : (
            "Send OTP"
          )}{" "}
          {!loading && <ChevronRight />}
        </Button>

        {authMethod === "email" && (
          <div className="mt-4 text-center">
            {isRegistering ? (
              <p className="text-xs text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setErrorMsg(null);
                  }}
                  className="font-bold text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Don't have a TrueTone account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setErrorMsg(null);
                  }}
                  className="font-bold text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Create an account
                </button>
              </p>
            )}
          </div>
        )}
      </div>
      <p className="mt-auto text-center text-xs leading-5 text-muted-foreground">
        By continuing, you agree to secure processing of call audio for fraud detection.
      </p>
    </section>
  );
}

function Otp({ onBack, onNext, countdown, onResend }: { onBack: () => void; onNext: () => void; countdown: number; onResend: () => void }) {
  return (
    <section className="min-h-screen sm:min-h-[860px]">
      <Header title="Verify your number" onBack={onBack} />
      <div className="px-6 pt-14">
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-primary">
          <Phone size={26} />
        </div>
        <h2 className="mt-7 text-2xl font-extrabold">Enter verification code</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">We sent a 6-digit code to +91 98765 43210</p>
        <div className="mt-8 grid grid-cols-6 gap-2">
          {[4, 8, 1, 9, 2, 6].map((n, i) => (
            <input
              key={i}
              aria-label={`OTP digit ${i + 1}`}
              defaultValue={n}
              maxLength={1}
              className="h-13 min-w-0 rounded-lg border bg-background text-center text-lg font-bold outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock3 size={14} /> 00:{String(countdown).padStart(2, "0")}
          </span>
          <Button variant="link" size="sm" disabled={countdown > 0} onClick={onResend}>
            Resend OTP
          </Button>
        </div>
        <Button size="lg" className="mt-8 w-full" onClick={onNext}>
          Verify & Continue
        </Button>
      </div>
    </section>
  );
}

const permissionItems = [
  { icon: Users, title: "Contacts", copy: "Identify callers already saved on your phone." },
  { icon: History, title: "Call log", copy: "Show your recent calls and protection history." },
  { icon: PhoneCall, title: "Phone state", copy: "Detect when an incoming call needs analysis." },
  { icon: Mic, title: "Microphone", copy: "Listen briefly for voice authenticity checks." },
];

function Permissions({ values, onChange, onNext }: { values: boolean[]; onChange: (v: boolean[]) => void; onNext: () => void }) {
  const all = values.every(Boolean);

  const handleToggle = async (index: number, checked: boolean) => {
    if (index === 3 && checked) {
      await audioService.requestMicrophonePermission();
    }
    onChange(values.map((v, i) => (i === index ? checked : v)));
  };

  const handleAllowAll = async () => {
    await audioService.requestMicrophonePermission();
    onChange([true, true, true, true]);
    onNext();
  };

  return (
    <section className="flex min-h-screen flex-col px-6 pb-8 pt-12 sm:min-h-[860px]">
      <Brand />
      <h1 className="mt-11 text-2xl font-extrabold">Set up protection</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        TrueTone needs these permissions to protect you during calls.
      </p>
      <div className="mt-8 space-y-3">
        {permissionItems.map((item, i) => (
          <div key={item.title} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-panel">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary">
              <item.icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.copy}</p>
            </div>
            <Switch
              checked={values[i] ?? false}
              onCheckedChange={(checked) => handleToggle(i, checked)}
            />
          </div>
        ))}
      </div>
      <Button
        size="lg"
        className="mt-auto w-full"
        onClick={() => {
          if (all) onNext();
          else handleAllowAll();
        }}
      >
        {all ? "Allow & Continue" : "Allow all permissions"}
      </Button>
    </section>
  );
}

function HomeScreen({
  stats,
  incidents,
  onDetail,
  onIncoming,
  onPickAudio,
  onHistory,
  onProfile,
}: {
  stats: { calls_checked: number; threats_stopped: number };
  incidents: Incident[];
  onDetail: (incident: Incident) => void;
  onIncoming: () => void;
  onPickAudio: () => void;
  onHistory: () => void;
  onProfile: () => void;
}) {
  return (
    <section className="min-h-screen pb-24 sm:min-h-[860px]">
      <header className="flex items-center justify-between px-5 py-6">
        <Brand />
        <Button aria-label="Notifications" variant="ghost" size="icon" className="rounded-full bg-secondary">
          <Bell />
        </Button>
      </header>
      <div className="px-5">
        <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-brand">
          <div className="absolute -right-5 -top-5 size-28 rounded-full border border-primary-foreground/10" />
          <div className="relative flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[10px] font-bold uppercase">
                <span className="size-1.5 rounded-full bg-success-soft" /> Live
              </span>
              <h1 className="mt-5 text-[25px] font-extrabold">Protection Active</h1>
              <p className="mt-2 max-w-[245px] text-xs leading-5 text-primary-foreground/75">
                TrueTone is monitoring incoming calls for synthetic voices.
              </p>
            </div>
            <ShieldCheck size={52} strokeWidth={1.5} />
          </div>
          <div className="mt-6 grid grid-cols-2 border-t border-primary-foreground/15 pt-4">
            <div>
              <p className="text-xl font-extrabold">{stats.calls_checked}</p>
              <p className="text-[10px] text-primary-foreground/70">Calls checked</p>
            </div>
            <div className="border-l border-primary-foreground/15 pl-5">
              <p className="text-xl font-extrabold">{stats.threats_stopped}</p>
              <p className="text-[10px] text-primary-foreground/70">Threats stopped</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full border-warning/30 bg-warning-soft text-warning-foreground shadow-none hover:bg-warning-soft/80"
            onClick={onIncoming}
          >
            <PhoneCall /> Simulate suspicious call
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full border-primary/20 bg-brand-soft text-primary shadow-none hover:bg-brand-soft/80"
            onClick={onPickAudio}
          >
            <Upload /> Select Audio File
          </Button>
        </div>

        <div className="mb-4 mt-8 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold">Recent calls</h2>
            <p className="text-xs text-muted-foreground">Today and earlier</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onHistory}>
            View all <ChevronRight />
          </Button>
        </div>

        {incidents.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center shadow-panel">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
              <PhoneCall size={22} />
            </div>
            <p className="mt-3 text-sm font-bold">No calls analyzed yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Simulate a suspicious call or select an audio file above to perform your first voice authenticity check.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card px-4 shadow-panel">
            {incidents.slice(0, 5).map((inc, idx) => (
              <button
                key={`${inc.number}-${inc.id ?? idx}`}
                onClick={() => onDetail(inc)}
                className="flex w-full items-center gap-3 py-4 text-left transition-colors hover:bg-accent/50"
              >
                <div
                  className={`grid size-10 shrink-0 place-items-center rounded-full ${
                    inc.verdict === "Safe" ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive"
                  }`}
                >
                  {inc.verdict === "Safe" ? <ShieldCheck size={18} /> : <ShieldX size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{inc.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{inc.number}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">{inc.date}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      inc.blocked
                        ? "bg-muted text-foreground"
                        : inc.verdict === "Safe"
                        ? "bg-success-soft text-success"
                        : "bg-destructive-soft text-destructive"
                    }`}
                  >
                    {inc.blocked ? "BLOCKED" : inc.verdict}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-xl bg-success-soft p-4">
          <div className="flex gap-3">
            <Shield size={20} className="mt-0.5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-bold">Your protection is up to date</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Voice threat models were updated today at 6:30 AM.
              </p>
            </div>
          </div>
        </div>
      </div>
      <BottomNav active="home" onHome={() => {}} onHistory={onHistory} onProfile={onProfile} />
    </section>
  );
}

function CallerDetails({
  defaultPhone,
  defaultName,
  mode,
  onCancel,
  onProceed,
}: {
  defaultPhone: string;
  defaultName: string;
  mode: "mic" | "file";
  onCancel: () => void;
  onProceed: (phone: string, name: string) => void;
}) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const [name, setName] = useState(defaultName || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const trimmed = phone.trim();
    let normalizedPhone = "";
    if (trimmed) {
      const validation = validateAndNormalizeIndianPhone(trimmed, false);
      if (!validation.isValid) {
        setErrorMsg(validation.error || "Please enter a valid 10-digit Indian mobile number.");
        return;
      }
      normalizedPhone = validation.normalized;
    }
    const cleanName = name.trim() || "Unknown caller";
    onProceed(normalizedPhone, cleanName);
  };

  return (
    <section className="flex min-h-screen flex-col px-6 pb-8 pt-6 sm:min-h-[860px]">
      <Header title="Caller Details" subtitle="Identify the call before voice analysis" onBack={onCancel} />

      <div className="mt-2 flex items-center gap-3 rounded-xl border bg-secondary/40 px-4 py-3 text-xs">
        {mode === "file" ? <FileAudio className="text-primary shrink-0" size={20} /> : <Mic className="text-primary shrink-0" size={20} />}
        <div>
          <p className="font-bold">{mode === "file" ? "Audio File Analysis" : "Microphone Voice Analysis"}</p>
          <p className="text-[11px] text-muted-foreground">
            {mode === "file" ? "Analyzing an uploaded call recording" : "Listening live through device microphone"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex-1 space-y-4">
        <div>
          <label className="block text-xs font-bold text-foreground" htmlFor="caller-phone-input">
            Caller Phone Number (Optional)
          </label>
          <div className="mt-2 flex h-13 items-center rounded-xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
            <Smartphone size={18} className="text-muted-foreground" />
            <input
              id="caller-phone-input"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g. 9876543210 (leave empty if unknown)"
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
              autoFocus
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Optional Indian 10-digit mobile number. Validated only when provided.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground" htmlFor="caller-name-input">
            Caller Name / Organization <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
          </label>
          <div className="mt-2 flex h-13 items-center rounded-xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
            <UserRound size={18} className="text-muted-foreground" />
            <input
              id="caller-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bank Support, Unknown Caller"
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-destructive/30 bg-destructive-soft p-3.5 text-xs text-destructive flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="leading-5">{errorMsg}</span>
          </div>
        )}

        <div className="pt-4">
          <Button type="submit" size="lg" className="w-full shadow-brand">
            Proceed to Voice Analysis <ChevronRight size={16} />
          </Button>
          <Button type="button" variant="outline" size="lg" className="mt-2.5 w-full" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

function Incoming({
  callerNumber,
  onBack,
  onAnalyze,
}: {
  callerNumber: string;
  onBack: () => void;
  onAnalyze: () => void;
}) {
  return (
    <section className="flex min-h-screen flex-col bg-primary px-6 pb-10 pt-8 text-primary-foreground sm:min-h-[860px]">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        onClick={onBack}
      >
        <ArrowLeft />
      </Button>
      <p className="mt-14 text-center text-xs font-bold uppercase text-primary-foreground/60">
        Incoming call detected
      </p>
      <div className="mx-auto mt-8 grid size-24 place-items-center rounded-full bg-primary-foreground/10 ring-8 ring-primary-foreground/5">
        <UserRound size={42} />
      </div>
      <h1 className="mt-7 text-center text-2xl font-extrabold">Unknown caller</h1>
      <p className="mt-2 text-center text-lg text-primary-foreground/80">{callerNumber}</p>
      <span className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1.5 text-xs font-bold text-warning-foreground">
        <Bell size={13} /> Unknown Number
      </span>
      <div className="mt-auto rounded-2xl bg-primary-foreground/10 p-5">
        <p className="text-sm font-bold">Not sure who’s calling?</p>
        <p className="mt-1 text-xs leading-5 text-primary-foreground/70">
          Put the call on speaker and let TrueTone check the voice in 10 seconds.
        </p>
        <Button
          size="lg"
          className="mt-5 w-full bg-background text-primary hover:bg-background/90"
          onClick={onAnalyze}
        >
          <Mic /> Analyze Call
        </Button>
      </div>
    </section>
  );
}

function Waveform({ danger = false, liveLevels }: { danger?: boolean; liveLevels?: number[] }) {
  const defaultBars = [34, 58, 82, 46, 72, 92, 54, 78, 40, 64, 30, 56, 76, 44, 68, 36];
  const heights = liveLevels && liveLevels.length === 16 ? liveLevels : defaultBars;

  return (
    <div className={`flex h-24 items-center justify-center gap-1.5 ${danger ? "text-destructive" : "text-primary"}`}>
      {heights.map((height, i) => (
        <span
          key={i}
          className={`waveform-bar w-1.5 rounded-full bg-current transition-all duration-75`}
          style={{ height: `${height}%`, animationDelay: liveLevels ? undefined : `${i * 55}ms` }}
        />
      ))}
    </div>
  );
}

function Analysis({
  selectedAudioFile,
  callerNumber,
  callerName,
  onCancel,
  onComplete,
}: {
  selectedAudioFile: File | null;
  callerNumber?: string;
  callerName?: string;
  onCancel: () => void;
  onComplete: (data: { blob?: Blob; file?: File }) => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [liveLevels, setLiveLevels] = useState<number[] | undefined>(undefined);
  const recordedBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    let timerId: number | undefined;

    if (!selectedAudioFile) {
      // Start microphone recording
      audioService
        .startRecording((levels) => setLiveLevels(levels))
        .catch((err) => console.warn("Mic record note:", err));

      timerId = window.setInterval(() => {
        setSeconds((s) => {
          if (s >= 10) {
            clearInterval(timerId);
            return 10;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      // File analysis animation
      timerId = window.setInterval(() => {
        setSeconds((s) => {
          if (s >= 10) {
            clearInterval(timerId);
            return 10;
          }
          return s + 2;
        });
      }, 400);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [selectedAudioFile]);

  const handleFinish = async () => {
    if (selectedAudioFile) {
      onComplete({ file: selectedAudioFile });
    } else {
      try {
        const res = await audioService.stopRecording(10);
        recordedBlobRef.current = res.blob;
        onComplete({ blob: res.blob });
      } catch (err) {
        console.warn("Stop recording note:", err);
        onComplete({});
      }
    }
  };

  return (
    <section className="flex min-h-screen flex-col px-6 pb-8 pt-8 sm:min-h-[860px]">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="-ml-2" onClick={onCancel}>
          <X />
        </Button>
        <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-muted-foreground">
          {seconds < 2 ? "Stage 1: Preparing audio" : "Stage 2: Evaluating voice authenticity"}
        </span>
      </div>
      <div className="mt-8 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-brand-soft text-primary ring-8 ring-brand-soft/60">
          {selectedAudioFile ? <FileAudio size={34} /> : <Mic size={34} />}
        </div>
        <h1 className="mt-6 text-2xl font-extrabold">
          {selectedAudioFile ? "Processing audio file..." : "Evaluating voice authenticity..."}
        </h1>
        <p className="mt-2 text-sm font-semibold text-foreground truncate max-w-xs mx-auto">
          {callerName || "Unknown caller"} {callerNumber ? `(${callerNumber})` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground truncate max-w-xs mx-auto">
          {selectedAudioFile ? selectedAudioFile.name : "Listening live via microphone"}
        </p>
      </div>

      <div className="mt-10 rounded-2xl border bg-card p-6 shadow-panel">
        <Waveform liveLevels={liveLevels} />
        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="font-semibold">
            {selectedAudioFile ? "Audio chunk analysis" : "Voice authenticity sample"}
          </span>
          <span className="text-muted-foreground">00:{String(Math.min(10, seconds)).padStart(2, "0")} / 00:10</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.min(100, seconds * 10)}%` }}
          />
        </div>
      </div>

      <div className="mt-auto">
        <p className="text-center text-xs leading-5 text-muted-foreground">
          <LockKeyhole className="mr-1 inline" size={13} /> Audio is processed securely and evaluated against deepfake voice models.
        </p>
        <Button
          size="lg"
          className="mt-5 w-full"
          disabled={seconds < 10}
          onClick={handleFinish}
        >
          {seconds < 10 ? "Evaluating voice authenticity..." : "Continue to Behavioral Check"}
        </Button>
      </div>
    </section>
  );
}

function Behavior({
  answers,
  onChange,
  onBack,
  onNext,
  isAnalyzing,
  analysisError,
  onOpenSettings,
}: {
  answers: boolean[];
  onChange: (v: boolean[]) => void;
  onBack: () => void;
  onNext: () => void;
  isAnalyzing?: boolean;
  analysisError?: string | null;
  onOpenSettings?: () => void;
}) {
  const questions = [
    "Did the caller ask for money?",
    "Did they ask for an OTP or PIN?",
    "Did they create a sense of urgency?",
  ];

  return (
    <section className="min-h-screen sm:min-h-[860px]">
      <Header
        title="Quick behavior check"
        subtitle="Stage 3 of 4: Behavioral risk analysis · Answer to refine scam risk score"
        onBack={onBack}
      />
      <div className="px-5 pt-5 pb-8">
        <div className="rounded-xl bg-warning-soft p-4 text-xs leading-5 text-warning-foreground">
          <Bell className="mr-2 inline" size={15} /> Never share an OTP, PIN, or password over a call.
        </div>

        {analysisError && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive-soft p-4 text-xs text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Backend Analysis Error</p>
                <p className="mt-1 leading-5 text-destructive/90">{analysisError}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs bg-background" onClick={onNext}>
                    <RefreshCw size={12} className="mr-1" /> Retry
                  </Button>
                  {onOpenSettings && (
                    <Button size="sm" variant="ghost" className="h-8 text-xs underline" onClick={onOpenSettings}>
                      Configure Backend Server
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {questions.map((q, i) => (
            <div key={q} className="rounded-xl border bg-card p-5 shadow-panel">
              <p className="text-sm font-bold leading-6">{q}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[true, false].map((value) => (
                  <Button
                    key={String(value)}
                    variant={answers[i] === value ? "default" : "outline"}
                    disabled={isAnalyzing}
                    onClick={() =>
                      onChange(answers.map((a, index) => (index === i ? value : a)))
                    }
                  >
                    {value ? "Yes" : "No"}
                    {answers[i] === value && <Check />}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className="mt-8 w-full"
          disabled={isAnalyzing}
          onClick={onNext}
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Evaluating voice authenticity...
            </span>
          ) : (
            <>
              Get Result <ChevronRight />
            </>
          )}
        </Button>

        {isAnalyzing && (
          <p className="mt-3 text-center text-xs text-muted-foreground animate-pulse">
            Evaluating voice authenticity and behavioral risk indicators...
          </p>
        )}
      </div>
    </section>
  );
}

function Result({
  result,
  onBlock,
  onIgnore,
  onBack,
}: {
  result: InferenceResult | null;
  onBlock: () => void;
  onIgnore: () => void;
  onBack: () => void;
}) {
  const combined = result ? result.combinedRiskScore : 85;
  const voiceScore = result ? result.voiceAuthenticityScore : 89;
  const rawAiProb = result ? (result.rawAiProbability * 100).toFixed(2) : "89.00";
  const behaviorScore = result ? result.behaviorRiskScore : 80;
  const isHighRisk = result ? result.verdict === "High Risk" : true;
  const isBlocked = Boolean(result?.blocked);
  const targetNumber = result?.callerNumber || "Unknown";
  const targetName = result?.callerName || "Unknown caller";

  return (
    <section className="min-h-screen pb-8 sm:min-h-[860px]">
      <Header
        title="Analysis result"
        subtitle="Stage 4 of 4: Analysis complete"
        onBack={onBack}
        action={
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              isHighRisk ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success"
            }`}
          >
            {isHighRisk ? "HIGH RISK" : "SAFE"}
          </span>
        }
      />
      <div className="px-5">
        <div
          className={`rounded-2xl px-5 py-7 text-center ${
            isHighRisk ? "bg-destructive-soft" : "bg-success-soft"
          }`}
        >
          <div
            className="relative mx-auto grid size-44 place-items-center rounded-full"
            style={{
              background: `conic-gradient(${
                isHighRisk ? "var(--destructive)" : "var(--success)"
              } 0 ${combined}%, var(--border) ${combined}% 100%)`,
            }}
          >
            <div className="grid size-36 place-items-center rounded-full bg-background shadow-panel">
              <div>
                <p className={`text-4xl font-extrabold ${isHighRisk ? "text-destructive" : "text-success"}`}>
                  {combined}%
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">
                  Combined risk
                </p>
              </div>
            </div>
          </div>
          <div
            className={`mx-auto mt-6 grid size-9 place-items-center rounded-full ${
              isHighRisk ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground"
            }`}
          >
            {isHighRisk ? <ShieldX size={20} /> : <ShieldCheck size={20} />}
          </div>
          <h1 className="mx-auto mt-3 max-w-[300px] text-xl font-extrabold leading-7">
            {isHighRisk
              ? "Likely Scam — AI-Generated Voice Detected"
              : "Likely Safe — Authentic Human Voice"}
          </h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {isHighRisk
              ? "Synthetic voice patterns and risk factors exceeded detection threshold."
              : "Voice acoustic patterns match authentic human vocal tracts."}
          </p>
          <div className="mt-3 rounded-lg bg-background/60 py-1.5 px-3 inline-block">
            <p className="text-xs font-semibold text-foreground">
              Caller: <strong>{targetName}</strong> · {targetNumber}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border bg-card p-5 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Risk breakdown</h2>
            <span className="text-[10px] font-mono text-muted-foreground">Threshold: 15.0%</span>
          </div>
          <Score
            label="Voice AI Probability"
            value={`${rawAiProb}%`}
            width={`${Math.min(100, Math.max(5, Number(rawAiProb)))}%`}
            isDestructive={isHighRisk}
          />
          <Score
            label="Behavior risk score"
            value={`${behaviorScore}%`}
            width={`${behaviorScore}%`}
            isDestructive={isHighRisk}
          />
          <Score
            label="Combined risk score"
            value={`${combined}%`}
            width={`${combined}%`}
            strong
            isDestructive={isHighRisk}
          />
        </div>

        {/* 4-second chunk evaluations */}
        {result?.chunkProbabilities && result.chunkProbabilities.length > 0 && (
          <div className="mt-5 rounded-xl border bg-card p-4 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Audio chunk analysis</h2>
              <span className="text-[10px] text-muted-foreground">
                {result.chunkProbabilities.length} chunks (4s each)
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              {result.chunkProbabilities.map((prob, idx) => {
                const chunkIsAi = prob >= (result.threshold ?? 0.15);
                return (
                  <div
                    key={idx}
                    className={`rounded-lg p-2 text-center text-[10px] border ${
                      chunkIsAi
                        ? "border-destructive/40 bg-destructive-soft text-destructive"
                        : "border-border bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    <p className="font-bold">Chunk {idx + 1}</p>
                    <p className="mt-0.5 font-extrabold">{(prob * 100).toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-xl bg-warning-soft p-4">
          <p className="text-xs font-bold text-warning-foreground">Recommended action</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {isHighRisk
              ? `End the call with ${targetNumber}. Do not transfer money or share verification codes.`
              : "No voice cloning detected. Exercise normal vigilance."}
          </p>
        </div>

        {/* Forensic & Safety Disclaimer */}
        <div className="mt-5 rounded-xl border bg-card p-4 text-[11px] leading-5 text-muted-foreground">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <Shield size={14} className="text-primary" /> Forensic & Detection Disclaimer
          </p>
          <ul className="mt-1.5 list-disc pl-4 space-y-1">
            <li>
              Acoustic analysis is evaluated against a <strong>15.0% decision threshold</strong> fine-tuned on Wav2Vec2.
            </li>
            <li>
              Voice deepfake classification is probabilistic and sensitive to compression, noise, and codecs.
            </li>
            <li>
              Serves as an investigative aid, not definitive legal proof. Verify caller identity via an independent trusted channel.
            </li>
          </ul>
        </div>

        <Button
          variant={isBlocked ? "secondary" : isHighRisk ? "destructive" : "default"}
          size="lg"
          className="mt-6 w-full"
          disabled={isBlocked || !targetNumber || targetNumber === "Unknown"}
          onClick={onBlock}
        >
          {isBlocked ? <Check /> : <ShieldX />}
          {isBlocked ? "Blocked in TrueTone" : "Block in TrueTone"}
        </Button>
        {(!targetNumber || targetNumber === "Unknown" || !targetNumber.trim()) ? (
          <p className="mt-1.5 text-center text-[11px] font-medium text-amber-600 dark:text-amber-400">
            Caller blocking is disabled because no phone number was provided.
          </p>
        ) : (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Application-level blocklist: Flag future calls from this number in TrueTone.
          </p>
        )}

        <Button variant="outline" size="lg" className="mt-3 w-full" onClick={onIgnore}>
          Ignore & Return Home
        </Button>
      </div>
    </section>
  );
}

function Score({
  label,
  value,
  width,
  strong,
  isDestructive = true,
}: {
  label: string;
  value: string;
  width: string;
  strong?: boolean;
  isDestructive?: boolean;
}) {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs">
        <span className={strong ? "font-bold" : "text-muted-foreground"}>{label}</span>
        <span className={`font-extrabold ${strong && isDestructive ? "text-destructive" : ""}`}>{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${isDestructive ? "bg-destructive" : "bg-success"}`}
          style={{ width }}
        />
      </div>
    </div>
  );
}

function HistoryScreen({
  incidents,
  filter,
  onFilter,
  onDetail,
  onHome,
  onProfile,
}: {
  incidents: Incident[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onDetail: (incident: Incident) => void;
  onHome: () => void;
  onProfile: () => void;
}) {
  const visible = incidents.filter(
    (i) => filter === "All" || (filter === "Blocked" && i.blocked) || i.verdict === filter
  );

  return (
    <section className="min-h-screen pb-24 sm:min-h-[860px]">
      <Header
        title="Incident history"
        subtitle="Calls analyzed by TrueTone"
        action={
          <Button aria-label="Search history" variant="ghost" size="icon">
            <Search />
          </Button>
        }
      />
      <div className="px-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(["All", "Blocked", "Safe", "High Risk"] as Filter[]).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={filter === item ? "default" : "outline"}
              className="shrink-0"
              onClick={() => onFilter(item)}
            >
              {item === "All" && <ListFilter />}
              {item}
            </Button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="mt-8 rounded-xl border bg-card p-8 text-center shadow-panel">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
              {filter === "Blocked" ? <ShieldX size={22} /> : filter === "High Risk" ? <ShieldX size={22} /> : <ShieldCheck size={22} />}
            </div>
            <p className="mt-3 text-sm font-bold">
              {filter === "Blocked"
                ? "No blocked numbers found"
                : filter === "High Risk"
                ? "No high risk incidents recorded"
                : filter === "Safe"
                ? "No safe calls recorded"
                : "No call analyses recorded yet"}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground max-w-xs mx-auto">
              {filter === "Blocked"
                ? "Numbers blocked in TrueTone will appear here with an active protection tag."
                : filter === "High Risk"
                ? "Calls with AI voice characteristics or behavioral red flags will appear here."
                : filter === "Safe"
                ? "Calls with authentic human voices and low risk will appear here."
                : "Complete a voice analysis from the home screen to build your incident history."}
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {visible.map((incident, idx) => (
              <button
                key={`${incident.number}-${incident.id ?? idx}`}
                className="w-full rounded-xl border bg-card p-4 text-left shadow-panel transition-colors hover:bg-accent"
                onClick={() => onDetail(incident)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid size-10 shrink-0 place-items-center rounded-full ${
                      incident.verdict === "Safe"
                        ? "bg-success-soft text-success"
                        : "bg-destructive-soft text-destructive"
                    }`}
                  >
                    {incident.verdict === "Safe" ? <ShieldCheck size={19} /> : <ShieldX size={19} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{incident.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{incident.number}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">{incident.date}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-extrabold ${
                        incident.verdict === "Safe" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {incident.risk}%
                    </p>
                    <span
                      className={`text-[9px] font-bold ${
                        incident.verdict === "Safe" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {incident.verdict}
                    </span>
                    {incident.blocked && (
                      <p className="mt-2 text-[9px] font-bold text-muted-foreground">BLOCKED</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="history" onHome={onHome} onHistory={() => {}} onProfile={onProfile} />
    </section>
  );
}

function IncidentDetail({ incident, onBack }: { incident: Incident | null; onBack: () => void }) {
  if (!incident) {
    return (
      <section className="min-h-screen pb-8 sm:min-h-[860px]">
        <Header title="Incident details" onBack={onBack} />
        <div className="px-5 pt-8 text-center text-sm text-muted-foreground">
          No incident selected. Please select a record from the history screen.
        </div>
      </section>
    );
  }
  const inc = incident;
  const isHighRisk = inc.verdict === "High Risk";

  return (
    <section className="min-h-screen pb-8 sm:min-h-[860px]">
      <Header title="Incident details" subtitle={`${inc.date}`} onBack={onBack} />
      <div className="px-5">
        <div className={`rounded-xl p-5 ${isHighRisk ? "bg-destructive-soft" : "bg-success-soft"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-bold ${isHighRisk ? "text-destructive" : "text-success"}`}>
                {inc.verdict.toUpperCase()} · {inc.risk}%
              </p>
              <h1 className="mt-2 text-lg font-extrabold">{inc.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{inc.number}</p>
              {inc.audioSource && (
                <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                  Source: {inc.audioSource}
                </p>
              )}
            </div>
            <div
              className={`grid size-12 place-items-center rounded-full ${
                isHighRisk ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground"
              }`}
            >
              {isHighRisk ? <ShieldX /> : <ShieldCheck />}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border bg-card p-5 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Voice snapshot</h2>
            <span className="text-[10px] text-muted-foreground">10 sec sample</span>
          </div>
          <Waveform danger={isHighRisk} />
          <Score
            label="Synthetic voice probability"
            value={`${inc.voiceScore ?? 89}%`}
            width={`${inc.voiceScore ?? 89}%`}
            strong
            isDestructive={isHighRisk}
          />
        </div>

        <div className="mt-5 rounded-xl border bg-card p-5 shadow-panel">
          <h2 className="text-sm font-extrabold">Behavior flags</h2>
          {(inc.behaviorFlags && inc.behaviorFlags.length > 0
            ? inc.behaviorFlags
            : ["No behavioral coercion detected"]
          ).map((flag) => (
            <div key={flag} className="mt-4 flex items-center gap-3 text-xs">
              <span className="grid size-5 place-items-center rounded-full bg-destructive-soft text-destructive">
                <Check size={12} />
              </span>
              {flag}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border bg-card p-5 shadow-panel">
          <h2 className="text-sm font-extrabold">Action taken</h2>
          <div className="mt-4 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-destructive-soft text-destructive">
              <ShieldX size={18} />
            </div>
            <div>
              <p className="text-xs font-bold">
                {inc.blocked ? "Blocked in TrueTone" : "Flagged for monitoring"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">{inc.date}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileScreen({
  userEmail,
  blockedCount = 0,
  onHome,
  onHistory,
  onLogout,
}: {
  userEmail: string;
  blockedCount?: number;
  onHome: () => void;
  onHistory: () => void;
  onLogout: () => void;
}) {
  const [microphone, setMicrophone] = useState(true);
  const [backendUrl, setBackendUrlState] = useState(inferenceService.getBackendUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [dbInfo, setDbInfo] = useState<any>(null);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    const res = await inferenceService.checkHealth(backendUrl);
    setTestingConnection(false);
    if (res.ok) {
      inferenceService.setBackendUrl(backendUrl);
      setDbInfo(res.database);
      setConnectionStatus({
        ok: true,
        message: `Connected: ${res.model} (${res.device})`,
      });
    } else {
      setDbInfo(null);
      setConnectionStatus({
        ok: false,
        message: res.error || "Connection failed. Check network or IP.",
      });
    }
  };

  const handleSaveUrl = () => {
    inferenceService.setBackendUrl(backendUrl);
    setConnectionStatus({
      ok: true,
      message: "Server URL saved successfully.",
    });
  };

  return (
    <section className="min-h-screen pb-24 sm:min-h-[860px]">
      <Header title="Profile & settings" />
      <div className="px-5">
        <div className="flex items-center gap-4 rounded-xl bg-primary p-5 text-primary-foreground shadow-brand">
          <div className="grid size-14 place-items-center rounded-full bg-primary-foreground/15 text-lg font-extrabold uppercase">
            {userEmail ? userEmail.slice(0, 2) : "TT"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold">{userEmail ? userEmail.split("@")[0] : "TrueTone User"}</h1>
            <p className="mt-1 text-xs text-primary-foreground/70 truncate">{userEmail || "Authenticated User"}</p>
            <p className="mt-1 text-[10px] text-primary-foreground/60">Protected with Firebase</p>
          </div>
        </div>

        {/* AI Backend Server Configuration */}
        <h2 className="mb-3 mt-7 text-xs font-bold uppercase text-muted-foreground">AI Detection Server</h2>
        <div className="rounded-xl border bg-card p-4 shadow-panel space-y-3">
          <div className="flex items-center gap-2">
            <Server size={16} className="text-primary" />
            <span className="text-xs font-bold">FastAPI Backend Endpoint</span>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrlState(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-primary"
              placeholder="http://10.233.39.190:8000"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={testingConnection}
                onClick={handleTestConnection}
                className="flex-1 text-xs"
              >
                {testingConnection ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> Testing...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Wifi size={12} /> Test Health
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={handleSaveUrl}
                className="flex-1 text-xs"
              >
                <Check size={12} className="mr-1" /> Save URL
              </Button>
            </div>
          </div>
          {connectionStatus && (
            <div
              className={`rounded-lg p-2.5 text-[11px] flex items-center gap-1.5 ${
                connectionStatus.ok ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive"
              }`}
            >
              {connectionStatus.ok ? <ShieldCheck size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
              <span className="font-semibold leading-4">{connectionStatus.message}</span>
            </div>
          )}
          {dbInfo && (
            <div className="rounded-lg border bg-secondary/50 p-2.5 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold">Database Storage:</span>
                <span className={`font-extrabold ${dbInfo.connected ? "text-success" : "text-primary"}`}>
                  {dbInfo.connected ? "MySQL Connected" : "Persistent JSON Store (Fallback)"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-4">
                {dbInfo.connected
                  ? `Connected to MySQL database "${dbInfo.database}" on ${dbInfo.host}:${dbInfo.port}.`
                  : `Analyses are saved to ${dbInfo.store || "backend/data/truetone_store.json"}. To switch to MySQL, configure MYSQL_PASSWORD in backend/.env.`}
              </p>
            </div>
          )}
          <p className="text-[10px] leading-4 text-muted-foreground">
            Default: <code className="font-mono text-primary">http://10.233.39.190:8000</code> (your laptop's Wi-Fi IPv4). For emulator, use <code className="font-mono">http://10.0.2.2:8000</code>.
          </p>
        </div>

        <h2 className="mb-3 mt-7 text-xs font-bold uppercase text-muted-foreground">Permissions</h2>
        <div className="divide-y rounded-xl border bg-card px-4 shadow-panel">
          <SettingRow
            icon={<Mic />}
            title="Microphone access"
            action={<Switch checked={microphone} onCheckedChange={setMicrophone} />}
          />
          <SettingRow
            icon={<ContactRound />}
            title="Contacts & call log"
            action={<span className="text-[10px] font-bold text-success">ALLOWED</span>}
          />
          <SettingRow
            icon={<Shield />}
            title="Protection status"
            action={<span className="text-[10px] font-bold text-success">ACTIVE</span>}
          />
        </div>

        <h2 className="mb-3 mt-7 text-xs font-bold uppercase text-muted-foreground">Manage</h2>
        <div className="divide-y rounded-xl border bg-card px-4 shadow-panel">
          <SettingRow
            icon={<ShieldX />}
            title="Blocked in TrueTone"
            action={
              <span className="flex items-center gap-1 text-xs font-bold text-foreground">
                {blockedCount} <ChevronRight size={15} />
              </span>
            }
          />
          <SettingRow
            icon={<Settings />}
            title="Privacy & security"
            action={<ChevronRight size={15} />}
          />
          <SettingRow
            icon={<RotateCcw />}
            title="Voice model updates"
            action={<span className="text-[10px] text-muted-foreground">Today</span>}
          />
        </div>

        <Button
          variant="outline"
          size="lg"
          className="mt-7 w-full text-destructive hover:bg-destructive-soft hover:text-destructive"
          onClick={onLogout}
        >
          <LogOut /> Log out
        </Button>
        <p className="mt-5 text-center text-[10px] text-muted-foreground">
          TrueTone v1.0.0 · Made for safer conversations
        </p>
      </div>
      <BottomNav active="profile" onHome={onHome} onHistory={onHistory} onProfile={() => {}} />
    </section>
  );
}

function SettingRow({ icon, title, action }: { icon: ReactNode; title: string; action: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-primary [&_svg]:size-16 [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <p className="flex-1 text-xs font-bold">{title}</p>
      {action}
    </div>
  );
}

function BottomNav({
  active,
  onHome,
  onHistory,
  onProfile,
}: {
  active: "home" | "history" | "alerts" | "profile";
  onHome: () => void;
  onHistory: () => void;
  onProfile: () => void;
}) {
  const items = [
    { id: "home", label: "Home", icon: Home, onClick: onHome },
    { id: "history", label: "History", icon: History, onClick: onHistory },
    { id: "alerts", label: "Alerts", icon: Bell, onClick: onHistory },
    { id: "profile", label: "Profile", icon: UserRound, onClick: onProfile },
  ] as const;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-20 max-w-[430px] items-center justify-around border-t bg-background/95 px-3 pb-safe backdrop-blur sm:bottom-8 sm:rounded-b-[28px]"
      aria-label="Main navigation"
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          className={`flex h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-bold transition-colors ${
            active === item.id ? "bg-brand-soft text-primary" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <item.icon size={20} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
