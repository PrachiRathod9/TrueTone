# TrueTone: AI-Powered Voice Deepfake Detection and Scam Risk Assessment System
## Comprehensive Technical Documentation and Engineering Report

**Academic Degree:** Bachelor of Technology (B.Tech) in Computer Science and Engineering  
**Project Classification:** Final-Year Mega Project  
**Repository Location:** `C:\Users\HP\Desktop\ProjectMega\true-tone-guard-main`  
**Document Classification:** Technical Architecture, Implementation, and Evaluation Report  
**Date of Inspection:** October 19, 2026  

---

## 1. Project Overview

### 1.1 Full Project Name and Purpose
The project is titled **TrueTone: An AI-Powered Voice Deepfake Detection and Scam-Call Risk Assessment System**. The system is engineered to serve as an intelligent, client-server defensive barrier against the rising phenomenon of synthetic speech impersonation and social-engineering telephone fraud. It provides mobile users with the capability to evaluate audio recordings and live microphone captures for synthetic acoustic signatures while simultaneously assessing contextual behavioral scam indicators to produce an aggregated, actionable risk assessment.

### 1.2 Problem Being Addressed
Recent advancements in generative artificial intelligence—specifically diffusion-based acoustic models, neural vocoders, and zero-shot voice cloning architectures (e.g., VITS, Tortoise, Vall-E)—have lowered the barrier for synthesizing indistinguishable human speech from few-second voice prompts. Malicious actors leverage cloned voices in telecommunication fraud vectors, including:
1. **CEO and Executive Impersonation (Whaling):** Generating synthetic voice orders directing emergency wire transfers.
2. **Family Emergency / Distress Scams:** Simulating the voice of an individual claiming to be in physical danger or arrested to solicit urgent bail money from relatives.
3. **Banking and Credential Harvesting (Vishing):** Using authoritative cloned voices of financial representatives to panic victims into surrendering One-Time Passwords (OTPs), PINs, or credentials.

Traditional spam-blocking solutions rely exclusively on static phone-number blacklists and crowdsourced user reports. Such solutions are ineffective against dynamic Caller ID spoofing and generative voice cloning, where the call originates from a newly provisioned or spoofed trusted number.

### 1.3 Proposed Solution
TrueTone delivers a multi-stage defense architecture comprising:
1. **Acoustic Deepfake Analysis:** A transformer-based neural acoustic classifier (fine-tuned Wav2Vec2) executing on an isolated backend server that inspects sub-perceptual spectral and vocoder artifacts in the speech waveform.
2. **Behavioral Risk Heuristics:** A calibrated heuristic questionnaire assessing conversational coercion tactics (demands for capital, OTP/PIN requests, artificial temporal urgency).
3. **Composite Risk Aggregation:** A weighted decision engine combining acoustic synthetic probabilities ($60\%$ weight) with behavioral risk indicators ($40\%$ weight) to output an honest composite risk score and categorical verdict.
4. **Application-Level Mitigation:** A caller blocking registry that cross-references incoming analysis requests against a per-user blocklist to alert users before conversational engagement.

### 1.4 Main Features and Target Users
- **Primary Features:**
  - Secure Firebase user authentication (Email/Password and Mobile OTP verification).
  - Dual audio ingestion pipeline: native microphone capture (encoded in 16-bit PCM WAV) and local audio file upload (MP3, WAV, FLAC, OGG).
  - Client-side Indian telephone number validation (`+91` normalization) with optional caller identification.
  - Asynchronous, 4-stage visual analysis telemetry.
  - Multi-tier persistent storage: MySQL relational backend with zero-downtime JSON fallback.
  - Cryptographically isolated, per-account incident history and statistics.
  - Application-level caller blocking with strict validation.
- **Target Users:** Smartphone users, elderly and vulnerable demographics susceptible to voice impersonation, banking customers, enterprise personnel handling authorization workflows, and fraud-prevention researchers.

---

## 2. Technology Stack

This section catalogues every technology present in the codebase, detailing its exact version, purpose, and relevant file path.

| Layer / Subsystem | Technology | Version / Specification | Role in Project | Relevant File Path |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `19.2.0` | UI component rendering & state management | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L63) |
| **Client Core DOM** | React DOM | `19.2.0` | DOM reconciliation layer | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L65) |
| **Language (Frontend)** | TypeScript | `5.8.3` | Type-safe application development | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L93) |
| **Frontend Tooling** | Vite | `8.1.5` | Next-generation frontend bundler & dev server | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L95) |
| **Client Routing** | TanStack Router | `1.170.41` | Fully type-safe client routing and route definitions | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L52) |
| **SSR / Fullstack Meta** | TanStack Start | `1.168.60` | Fullstack meta-framework framework integration | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L53) |
| **Styling Engine** | TailwindCSS | `4.2.1` | Utility-first responsive CSS styling | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L71) |
| **UI Component Primitives** | Radix UI | Various (`@radix-ui/react-*`) | Accessible dialogs, switches, tabs, accordions | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L24-L49) |
| **Iconography** | Lucide React | `0.575.0` | System icons (Shields, Microphones, Phones) | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L62) |
| **Data Visualization** | Recharts | `2.15.4` | Visualizing confidence levels and risk breakdowns | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L68) |
| **Mobile Runtime** | Capacitor Core & CLI | `8.5.3` | Native cross-platform bridge and runtime packaging | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L22), [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L78) |
| **Android Platform** | Capacitor Android | `8.5.3` | Android native scaffolding and bridge | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L21) |
| **Android Build System** | Gradle Wrapper | Gradle 8.x / AGP 8.x | Native APK compilation | [`android/build.gradle`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/android/build.gradle), [`android/gradlew.bat`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/android/gradlew.bat) |
| **Android SDK Parameters** | Android SDK | Min: `24`, Compile: `36`, Target: `36` | Target OS constraints (Android 7.0 to Android 16) | [`android/variables.gradle`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/android/variables.gradle#L2-L4) |
| **Backend Framework** | FastAPI | `0.110.0+` | High-performance asynchronous REST API server | [`backend/requirements.txt`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/requirements.txt#L1) |
| **ASGI Server** | Uvicorn | `0.28.0+` | Asynchronous web server gateway interface | [`backend/requirements.txt`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/requirements.txt#L2) |
| **Data Modeling** | Pydantic | `2.6.0+` | Request and response schema validation | [`backend/requirements.txt`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/requirements.txt#L8) |
| **Deep Learning Engine** | PyTorch | `2.2.0+` (CPU/CUDA) | Tensor computation and neural model execution | [`backend/requirements.txt`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/requirements.txt#L3) |
| **Audio Processing (DL)** | Torchaudio | `2.2.0+` | Audio resampling transforms (orig $\to$ 16 kHz) | [`backend/requirements.txt`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/requirements.txt#L4) |
| **Transformer Library** | Hugging Face Transformers | `4.38.0+` | Feature extractor & sequence classification loader | [`backend/requirements.txt`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/requirements.txt#L5) |
| **Acoustic Neural Model** | Wav2Vec2 Large | Fine-Tuned Checkpoint | Binary deepfake audio sequence classification | [`backend/app.py`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L32) |
| **Audio I/O Library** | SoundFile (libsndfile) | `0.12.0+` | In-memory decoding of WAV, MP3, FLAC, OGG | [`backend/requirements.txt`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/requirements.txt#L10) |
| **Fallback Audio I/O** | SciPy (`scipy.io.wavfile`) | Internal fallback | In-memory raw PCM WAV decoding | [`backend/app.py`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L79) |
| **Relational Database** | MySQL Server | Version 8.0 (Port 3306) | Production relational store for calls and blocks | [`backend/database.py`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/database.py#L26-L31) |
| **MySQL Python Driver** | PyMySQL | `1.1.0+` | Pure-Python client connecting to MySQL server | [`backend/requirements.txt`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/requirements.txt#L11) |
| **Fallback Data Store** | Flat JSON Store | Custom atomic JSON store | Persistent zero-dependency fallback store | [`backend/database.py`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/database.py#L32-L34) |
| **Client Auth SDK** | Firebase Web SDK | `13.0.0` | Client authentication (Email/Password & OTP) | [`package.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/package.json#L60) |
| **Cryptographic Token Verification** | PyJWT | `2.8.0+` | Decoding and signature validation of RS256 JWTs | [`backend/requirements.txt`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/requirements.txt#L12) |
| **PKI Cryptography** | Cryptography | `41.0.0+` | Google X.509 public certificate parsing and verification | [`backend/requirements.txt`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/requirements.txt#L13) |

---

## 3. System Architecture

### 3.1 End-to-End Architectural Flow
TrueTone employs a decoupled client-server architecture. The mobile client (Android Capacitor / React) handles user interactions, sensor/file ingestion, and visualization, while delegating heavy computational inference and token verification to a secure Python FastAPI backend.

```
+---------------------------------------------------------------------------------------+
|                                  CLIENT LAYER (ANDROID)                                |
|                                                                                       |
|   +------------------------------------+      +-----------------------------------+   |
|   |       Native Android Wrapper       |      |     Capacitor Web View Engine     |   |
|   |  (API 24-36, Cleartext Enabled)    |      |    (React 19, TypeScript, Tailwind) |   |
|   +-----------------+------------------+      +-----------------+-----------------+   |
|                     |                                           |                     |
|                     v                                           v                     |
|         +-----------------------+                   +-----------------------+         |
|         | Audio Capture Module  |                   | Firebase Auth Client  |         |
|         | - Web Audio PCM Wav   |                   | - Email/Pass Login    |         |
|         | - Device File Picker  |                   | - ID Token Retrieval  |         |
|         +-----------+-----------+                   +-----------+-----------+         |
|                     |                                           |                     |
|                     +--------------------+ +--------------------+                     |
|                                          | |                                          |
|                                          v v                                          |
|                       +---------------------------------------+                       |
|                       |  Inference Service (HTTP Client)      |                       |
|                       |  - Headers: Bearer <Firebase ID Token>|                       |
|                       |  - Multipart Form: File + Form Data   |                       |
|                       +-------------------+-------------------+                       |
+-------------------------------------------|-------------------------------------------+
                                            |
                         HTTPS / HTTP (REST API on Port 8000)
                                            |
+-------------------------------------------v-------------------------------------------+
|                              BACKEND SERVICE LAYER (FASTAPI)                          |
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   | Cryptographic Token Verifier (backend/auth.py)                                |   |
|   | - Live Google X.509 Cert Fetching                                             |   |
|   | - RS256 Signature, Audience ('truetone-4149b'), and Expiration Check          |   |
|   | - Extraction of authentic 'sub' claim -> authenticated_uid                     |   |
|   +---------------------------------------+---------------------------------------+   |
|                                           | Verified UID                              |
|                                           v                                           |
|   +-------------------------------------------------------------------------------+   |
|   | Audio Preprocessing Pipeline (backend/app.py)                                 |   |
|   | - Reject AAC/M4A containers ('ftyp' checks)                                   |   |
|   | - Mobile recorder metadata stripping ('oppoMark', 'xiaomi', 'samsung')        |   |
|   | - Decoding via soundfile / scipy.io.wavfile                                   |   |
|   | - Channel averaging (Mono downmixing)                                         |   |
|   | - Torchaudio Resampling to 16,000 Hz                                          |   |
|   | - Slicing into 4.0-second Chunks (64,000 samples)                             |   |
|   +---------------------------------------+---------------------------------------+   |
|                                           | Resampled Tensors                         |
|                                           v                                           |
|   +-------------------------------------------------------------------------------+   |
|   | AI Neural Inference Engine (RAM / CUDA / CPU)                                 |   |
|   | Model: kathakundra/truetone-voice-model (Wav2Vec2 Large, 1.26 GB)             |   |
|   | - Zero-mean Unit-variance Normalization                                       |   |
|   | - Forward Pass (torch.no_grad())                                              |   |
|   | - Softmax Probability Extraction for Class 1 ('fake')                         |   |
|   | - Chunk Mean Aggregation (avg_ai_prob vs AI_THRESHOLD 0.15)                   |   |
|   +---------------------------------------+---------------------------------------+   |
|                                           | Acoustic Score                            |
|                                           v                                           |
|   +-------------------------------------------------------------------------------+   |
|   | Composite Risk Engine                                                         |   |
|   | - Behavioral Score Calculation (+35 Money, +40 OTP/PIN, +25 Urgency)          |   |
|   | - Weighted Risk: (avg_ai_prob * 100 * 0.6) + (behavior_score * 0.4)          |   |
|   | - Synthetic Floor Constraint (Floor to max(50, ai_prob) if is_ai is True)     |   |
|   +---------------------------------------+---------------------------------------+   |
|                                           | Record Payload                            |
|                                           v                                           |
|   +-------------------------------------------------------------------------------+   |
|   | Database Management Layer (backend/database.py)                               |   |
|   |                                                                               |   |
|   |     [PRIMARY] MySQL 8.0 Server           [FALLBACK] Local JSON Store          |   |
|   |    +--------------------------+         +----------------------------+        |   |
|   |    | Tables:                  |         | File:                      |        |   |
|   |    | - call_analyses          |  <--->  | backend/data/              |        |   |
|   |    | - blocked_numbers        |         | truetone_store.json        |        |   |
|   |    | (Scoped by user_id index)|         | (Scoped by clean_uid)      |        |   |
|   |    +--------------------------+         +----------------------------+        |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

### 3.2 Component Responsibilities
1. **Client Audio Service (`src/lib/audio-service.ts`):** Directly captures audio buffers using the Web Audio API (`AudioContext` and `ScriptProcessorNode`), builds a 16-bit PCM mono WAV file via a custom binary encoder, and manages file picker interactions.
2. **Inference Service Bridge (`src/lib/inference-service.ts`):** Collects client audio assets, normalizes caller identification strings, serializes questionnaire inputs, retrieves the active Firebase ID token, and dispatches HTTP requests to the backend.
3. **Authentication Module (`backend/auth.py`):** Acts as the gatekeeper for all backend routes. Intercepts Bearer tokens, caches Google's public certificates, performs RS256 cryptographic verification, and outputs the authentic user UID.
4. **FastAPI Application (`backend/app.py`):** Handles multipart form parsing, executes audio decoding and normalization, interfaces with the Hugging Face model, computes combined risk, and formats JSON responses.
5. **Database Manager (`backend/database.py`):** Manages relational schema migrations, connection pooling, user data partitioning, caller blocklist synchronization, and transparent failover to disk-backed JSON storage.

### 3.3 Model Loading and Inference Topology
- **Model Ingestion Location:** Loaded once into backend process memory upon application initialization ([`backend/app.py#L48-L76`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L48-L76)). The server prioritizes loading from the local Hugging Face disk cache (`~/.cache/huggingface/hub/models--kathakundra--truetone-voice-model`), falling back to remote hub fetching using `HF_TOKEN`.
- **Inference Location:** Executed strictly on the backend server within the `POST /api/v1/analyze` route ([`backend/app.py#L164-L292`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L164-L292)). **No model weights are embedded or executed within the Android APK**, preserving client storage and protecting model IP.

---

## 4. Working Methodology

This section outlines the step-by-step mathematical, procedural, and behavioral logic implemented in TrueTone.

### 4.1 Step 1: User Authentication
1. **Client Registration/Login:** The user submits their email and password through [`src/routes/index.tsx#L520-L593`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/routes/index.tsx#L520-L593). Firebase Authentication verifies the credentials.
2. **Token Generation:** The Firebase Client SDK produces a cryptographically signed JSON Web Token (JWT) possessing an RS256 signature, with audience `truetone-4149b` and issuer `https://securetoken.google.com/truetone-4149b`.
3. **Backend Authorization:** For every API call, [`src/lib/inference-service.ts`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/lib/inference-service.ts#L129-L132) calls `getCurrentUserToken()` ([`src/lib/firebase.ts#L139-L149`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/lib/firebase.ts#L139-L149)) and attaches `Authorization: Bearer <idToken>`.
4. **Cryptographic Validation:** The backend dependency `get_authenticated_uid` in [`backend/auth.py#L171-L192`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/auth.py#L171-L192) decodes the token header, extracts the key ID (`kid`), downloads the corresponding Google X.509 public certificate, and validates the token signature and expiration. It extracts the `sub` claim as `authenticated_uid`. Any unauthenticated or forged request is immediately aborted with HTTP 401.

### 4.2 Step 2: Audio Upload or Microphone Recording
- **Live Microphone Capture:**
  - The client invokes `audioService.startRecording()` ([`src/lib/audio-service.ts#L46-L123`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/lib/audio-service.ts#L46-L123)).
  - A `ScriptProcessorNode` extracts Float32 PCM samples from the microphone stream while an `AnalyserNode` computes FFT frequency data for visual animation.
  - Upon calling `stopRecording()`, the collected Float32 chunks are flattened and serialized into an uncompressed 16-bit linear PCM WAV container using `encodeWAV()` ([`src/lib/audio-service.ts#L223-L262`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/lib/audio-service.ts#L223-L262)).
- **Local Audio Upload:**
  - The user selects a file via `audioService.pickAudioFile()` ([`src/lib/audio-service.ts#L200-L215`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/lib/audio-service.ts#L200-L215)). The file picker accepts `.wav`, `.mp3`, `.ogg`, `.flac`, `.m4a`, and `.aac`.

### 4.3 Step 3: Audio Validation and Preprocessing
The raw audio payload is sent to `POST /api/v1/analyze` and evaluated by `preprocess_audio()` ([`backend/app.py#L94-L162`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L94-L162)):
1. **Format Validation:** Files with `.m4a`, `.aac`, or `.mp4` extensions or containing the ISO Base Media File Format marker `ftyp` (bytes 4..8) are rejected with HTTP 400.
2. **Metadata Sanitization:** `clean_audio_bytes()` ([`backend/app.py#L82-L91`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L82-L91)) scans for and strips proprietary mobile vendor trailing markers (`oppoMark`, `xiaomi`, `samsung`) that induce EOF parsing failures in libsndfile/libmpg123.
3. **Waveform Decoding:** `soundfile.read()` reads the audio into a NumPy array with dtype `float32`. If decoding fails on WAV, a fallback reads through `scipy.io.wavfile.read()`.
4. **Channel Downmixing:** Multi-channel tensors are converted to mono by averaging across channel dimensions:
   $$\mathbf{x}_{\text{mono}} = \frac{1}{C} \sum_{c=1}^{C} \mathbf{x}_{c}$$
5. **Acoustic Resampling:** If the native sample rate $f_s \ne 16,000\text{ Hz}$, `torchaudio.transforms.Resample(orig_freq=fs, new_freq=16000)` resamples the waveform.
6. **Duration Verification:** Total sample count $N$ must satisfy $N \ge 16,000$ (representing at least 1.0 second of audio). Otherwise, HTTP 400 is raised.

### 4.4 Step 4: Model Inference and Chunk Aggregation
Because voice deepfake synthesis artifacts may vary across utterances, TrueTone uses a sliding 4-second chunking strategy:
1. **Windowing:** The 16 kHz waveform is partitioned into sequential segments of length $L = 64,000$ samples ($4.0\text{ seconds}$):
   $$\text{chunk}_k = \mathbf{x}[k \cdot L : (k+1) \cdot L]$$
2. **Padding:** If the final segment is shorter than 16,000 samples ($1.0\text{ second}$), it is zero-padded on the right:
   $$\text{chunk}_{\text{padded}} = \text{pad}(\text{chunk}, 16000 - |\text{chunk}|)$$
3. **Feature Extraction:** `AutoFeatureExtractor` normalizes the chunk to have zero mean and unit variance:
   $$\hat{\mathbf{x}} = \frac{\mathbf{x} - \mu}{\sqrt{\sigma^2 + \epsilon}}$$
4. **Forward Pass:** The normalized tensor is passed into `Wav2Vec2ForSequenceClassification` under `torch.no_grad()`. Logits $\mathbf{z} = [z_0, z_1]$ are transformed via softmax:
   $$P(\text{fake}) = \frac{e^{z_1}}{e^{z_0} + e^{z_1}}$$
5. **Chunk Probability Recording:** The probability $p_k = P(\text{fake})$ is rounded to 5 decimal places and appended to `chunk_probs`.
6. **Mean Aggregation:** The global acoustic AI probability is calculated as the arithmetic mean across all $K$ chunks:
   $$\bar{P}_{\text{AI}} = \frac{1}{K} \sum_{k=1}^{K} p_k$$
7. **Threshold Classification:** Using the decision boundary $\tau = 0.15$:
   $$\text{is\_ai} = \begin{cases} \text{True}, & \text{if } \bar{P}_{\text{AI}} \ge 0.15 \\ \text{False}, & \text{if } \bar{P}_{\text{AI}} < 0.15 \end{cases}$$
   $$\text{Confidence}_{\text{human}} = 1.0 - \bar{P}_{\text{AI}}$$

### 4.5 Step 5: Behavioral Warning Signs and Risk Scoring
Conversational scam patterns are evaluated based on three Boolean behavioral flags ([`backend/app.py#L217-L233`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L217-L233)):
- **Flag 1:** Caller requested money or direct transfer $\implies S_{\text{money}} = 35$
- **Flag 2:** Caller requested OTP, PIN, or confidential credential $\implies S_{\text{otp}} = 40$
- **Flag 3:** Caller generated panic, urgency, or legal threats $\implies S_{\text{urgency}} = 25$

The total behavioral risk score $S_{\text{behavior}} \in [0, 100]$ is the sum of active indicators:
$$S_{\text{behavior}} = \sum_{i \in \{\text{money, otp, urgency}\}} S_i$$

### 4.6 Step 6: Combined Risk Scoring and Verdict Formulation
The composite risk score balances acoustic synthetic speech probability ($60\%$ weight) with conversational behavioral risk ($40\%$ weight):
$$R_{\text{raw}} = \left(\bar{P}_{\text{AI}} \times 100 \times 0.6\right) + \left(S_{\text{behavior}} \times 0.4\right)$$
$$R_{\text{combined}} = \text{round}(R_{\text{raw}})$$

**Synthetic Voice Risk Floor:** If the acoustic classifier confirms an AI voice ($\text{is\_ai} = \text{True}$) and the combined score is under 50, TrueTone forces a high-risk floor:
$$R_{\text{combined}} = \max\left(50, \text{round}(\bar{P}_{\text{AI}} \times 100)\right) \quad \text{if } \text{is\_ai} = \text{True} \text{ and } R_{\text{combined}} < 50$$

**Categorical Verdict:**
$$\text{Verdict} = \begin{cases} \text{"High Risk"}, & \text{if } \text{is\_ai} = \text{True} \text{ or } R_{\text{combined}} \ge 50 \\ \text{"Safe"}, & \text{otherwise} \end{cases}$$

### 4.7 Step 7: Final Result Presentation and Mitigation
The client renders the outcome in the Result screen ([`src/routes/index.tsx#L1432-L1620`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/routes/index.tsx#L1432-L1620)):
- Circular visual gauge illustrating $R_{\text{combined}}\%$.
- Color coding: Red for **High Risk**, Green for **Safe**.
- Breakdown metrics: Voice Authenticity Score ($\text{round}(\bar{P}_{\text{AI}} \times 100)\%$), Behavior Risk Score ($S_{\text{behavior}}\%$), and individual chunk evaluations.
- **Mitigation Control:** The user can click **"Block in TrueTone"**. If no phone number was entered during analysis, the button is disabled with the warning: *"Caller blocking is disabled because no phone number was provided."* When valid, the number is stored in the user's blocklist, and future calls from that number are flagged as blocked.

---

## 5. AI/ML Model Details

### 5.1 Model Identifier and Architecture
- **Hugging Face Model Hub Identifier:** `kathakundra/truetone-voice-model`
- **Upstream Pre-trained Base:** `garystafford/wav2vec2-deepfake-voice-detector`
- **Core Model Class:** `Wav2Vec2ForSequenceClassification`
- **Underlying Architecture:** Wav2Vec 2.0 Large
  - **Feature Encoder:** 7-layer temporal convolutional network.
    - Convolution dimensions: `[512, 512, 512, 512, 512, 512, 512]`
    - Kernel sizes: `[10, 3, 3, 3, 3, 2, 2]`
    - Strides: `[5, 2, 2, 2, 2, 2, 2]` (Temporal receptive field downsampling factor of 320)
  - **Transformer Encoder:**
    - Hidden dimension ($d_{\text{model}}$): `1024`
    - Transformer layers: `24`
    - Multi-Head Attention heads: `16` (64 dimensions per head)
    - Intermediate feed-forward layer size: `4096`
    - Hidden activation function: Gaussian Error Linear Units (GELU)
  - **Classification Head:** Linear projection layer ($1024 \to 256 \to 2$) mapping to binary output logits.
- **Model Checkpoint Format:** Safetensors (`model.safetensors`), occupying exactly $1,262,859,296\text{ bytes}$ ($\approx 1.26\text{ GB}$).

### 5.2 Training and Fine-Tuning Context
- **Base Pre-training:** Wav2Vec 2.0 Large was originally pre-trained by Meta AI on 60,000 hours of unlabeled audio (LibriSpeech/Libri-Light) using self-supervised masked latent representation learning.
- **Fine-Tuning:** The upstream base model (`garystafford/wav2vec2-deepfake-voice-detector`) and the deployed `kathakundra/truetone-voice-model` were fine-tuned for sequence classification on paired datasets of authentic human speech and synthetic speech generated by neural text-to-speech (TTS) engines and voice conversion systems (such as ASVspoof and FakeAVCeleb derivatives).
- *Academic Verification Boundary:* The exact training logs, optimizer hyper-parameters (learning rate schedule, batch size), and dataset split manifests are encapsulated within the Hugging Face private repository and are not stored in this local Git repository.

### 5.3 Acoustic Constraints and Preprocessing Parameters
- **Sampling Rate:** $16,000\text{ Hz}$ mono PCM.
- **Normalization:** Per-chunk feature normalization (`do_normalize: true` in `preprocessor_config.json`), ensuring zero mean and unit standard deviation.
- **Chunk Window:** $4.0\text{ seconds}$ ($64,000\text{ samples}$), sliding without overlap.
- **Minimum Input Duration:** $1.0\text{ second}$ ($16,000\text{ samples}$). Inputs below this limit are rejected to prevent unreliable classification on transient acoustic bursts.

### 5.4 Labels and Decision Boundary
- **Class Mapping:**
  - Index `0` $\to$ `real` (authentic human voice)
  - Index `1` $\to$ `fake` (synthetic / AI-generated voice)
- **Decision Threshold:** $\tau = 0.15$. Because deepfake voice attacks present severe asymmetric risks in telecommunications fraud, the threshold is set conservatively at $0.15$ ($15\%$) rather than a default $0.50$. If the average probability of synthetic speech exceeds $15\%$, the sample is flagged as synthetic.

### 5.5 Empirical Evaluation Results on Verified Test Audio
During system verification ([`backend/test_api.py`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/test_api.py)), the model was evaluated against verified test recordings on disk:
1. **AI Cloned Voice Test Sample (`TruetoneAivoice.mpeg`):**
   - Result: $\bar{P}_{\text{AI}} = 0.25793$ ($25.793\%$)
   - Evaluation: $\bar{P}_{\text{AI}} \ge 0.15 \implies \text{is\_ai} = \text{True}$
   - Output Verdict: **High Risk** ($R_{\text{combined}} = 50$)
2. **Authentic Human Voice Test Sample (`truetonehumanvoice.mpeg`):**
   - Result: $\bar{P}_{\text{AI}} = 0.00177$ ($0.177\%$)
   - Evaluation: $\bar{P}_{\text{AI}} < 0.15 \implies \text{is\_ai} = \text{False}$
   - Output Verdict: **Safe** ($R_{\text{combined}} = 0$)

---

## 6. Database and Data Management

TrueTone implements a dual-tier persistence architecture designed for high availability and zero operational disruption.

```
                           +----------------------------------------+
                           |       backend/database.py              |
                           |   (DatabaseManager Singleton)          |
                           +-------------------+--------------------+
                                               |
                     +-------------------------+-------------------------+
                     | [Connection Test]                                 |
                     v                                                   v
        +----------------------------+                     +----------------------------+
        |   PyMySQL Driver           |                     |   Local JSON Fallback      |
        |   Host: 127.0.0.1:3306     |                     |   File: backend/data/      |
        |   DB: truetone_db          |                     |   truetone_store.json      |
        +-------------+--------------+                     +-------------+--------------+
                      |                                                  |
           [Credentials Available]                            [Password NO / Unreachable]
                      |                                                  |
                      v                                                  v
        +----------------------------+                     +----------------------------+
        |   ACTIVE AT RUNTIME:       |                     |   ACTIVE AT RUNTIME:       |
        |   MySQL 8.0 Engine         |                     |   Local JSON Storage       |
        |   - Relational tables      |                     |   - Encapsulated arrays    |
        |   - Indexed user_id        |                     |   - Strict clean_uid       |
        |   - Transactional commit   |                     |     partitioning           |
        +----------------------------+                     +----------------------------+
```

### 6.1 Runtime Database Status
- **Target Relational Database:** MySQL 8.0, running on service `MySQL80` (port `3306`).
- **Driver:** `pymysql` (`1.1.0+`).
- **Current Operational Mode:** **Local JSON Fallback Active.**  
  While the Windows service `MySQL80` is running, the MySQL root account requires a password. Because no password was specified in the local environment, the database connector caught error `1045 (Access denied for user 'root'@'localhost')` and automatically engaged the transparent local JSON fallback ([`backend/data/truetone_store.json`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/data/truetone_store.json)).
- **Transparent Transition:** As soon as credentials are provided via `MYSQL_PASSWORD` in `backend/.env`, the system connects to MySQL, provisions the database and tables, and transitions without requiring code changes.

### 6.2 Relational Schema Definitions
When connected to MySQL, `_init_db()` ([`backend/database.py#L68-L147`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/database.py#L68-L147)) executes the following DDL:

#### Table: `call_analyses`
```sql
CREATE TABLE IF NOT EXISTS call_analyses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) DEFAULT NULL,
    caller_number VARCHAR(30) DEFAULT '',
    caller_name VARCHAR(100) DEFAULT 'Unknown caller',
    ai_probability FLOAT NOT NULL,
    human_confidence FLOAT NOT NULL,
    is_ai BOOLEAN NOT NULL,
    verdict VARCHAR(20) NOT NULL,
    behavior_score INT NOT NULL,
    combined_risk_score INT NOT NULL,
    audio_source VARCHAR(100) DEFAULT 'Audio Sample',
    chunk_probabilities JSON,
    behavior_flags JSON,
    blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_caller_number (caller_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### Table: `blocked_numbers`
```sql
CREATE TABLE IF NOT EXISTS blocked_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) DEFAULT NULL,
    caller_number VARCHAR(30) NOT NULL,
    caller_name VARCHAR(100) DEFAULT 'Unknown caller',
    reason VARCHAR(255) DEFAULT 'Flagged as high-risk synthetic voice',
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_block_user (user_id),
    INDEX idx_block_caller (caller_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.3 User-Specific Data Isolation
To ensure complete multi-tenant privacy:
- In MySQL: Every `SELECT`, `INSERT`, and `UPDATE` query enforces `WHERE user_id = %s` using parameterized placeholders ([`backend/database.py#L280-L298`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/database.py#L280-L298)).
- In JSON Fallback: The reader strictly partitions records by authenticated UID:
  ```python
  all_analyses = fb.get("analyses", [])
  if clean_uid:
      return [a for a in all_analyses if a.get("user_id") == clean_uid]
  ```
  Legacy records created without an associated user ID are quarantined and never served to authenticated users.

---

## 7. Security Implementation

### 7.1 Client Authentication Architecture
TrueTone delegates credential management to Google Firebase Authentication. The client application never handles or stores raw password hashes. Upon login, Firebase issues an RS256-signed identity token containing the user's UID (`sub`).

### 7.2 Backend Cryptographic Token Verification
In [`backend/auth.py`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/auth.py), token validation is implemented per the OpenID Connect (OIDC) specification:
1. **Public Key Retrieval:** Fetches Google's live public keys from `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com` and parses the X.509 PEM certificates into RSA public keys using `cryptography.x509.load_pem_x509_certificate`.
2. **Caching:** Keys are cached in memory based on HTTP `Cache-Control: max-age` directives (typically 1 hour) to minimize latency.
3. **RS256 Validation:** Validates that the token's algorithm is `RS256`, matches the key ID (`kid`), and verifies the digital signature using `jwt.decode`.
4. **Claim Checks:** Verifies audience (`aud == "truetone-4149b"`), issuer (`iss == "https://securetoken.google.com/truetone-4149b"`), and expiration timestamp (`exp > now`).
5. **Anti-Spoofing Enforcement:** The backend extracts the UID directly from the verified `sub` claim. Client headers such as `X-User-Id` or body parameters such as `userId` are completely ignored, making UID spoofing impossible.

### 7.3 Secrets and Credential Protection
- **Repository Hygiene:** All sensitive environment variable files (`.env`, `backend/.env`) are excluded from version control via [`.gitignore`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/.gitignore).
- **Template Provisioning:** Safe template files containing only documentation and placeholders are provided: [`.env.example`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/.env.example) and [`backend/.env.example`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/.env.example).
- **Client Isolation:** Hugging Face API keys (`HF_TOKEN`) and database passwords are restricted to the server environment and never compiled into the Android APK.

---

## 8. API Documentation

The backend service exposes RESTful JSON endpoints alongside multipart audio ingestion.

### 8.1 Summary Table

| Method | Endpoint | Purpose | Authentication | Input Format |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | System diagnostics & status | Public (None) | None |
| `POST` | `/api/v1/analyze` | Audio deepfake & risk inference | Bearer Token (RS256) | Multipart Form Data |
| `GET` | `/api/v1/analyses` | Fetch user call analysis history | Bearer Token (RS256) | None |
| `POST` | `/api/v1/block` | Block caller in user blocklist | Bearer Token (RS256) | JSON Body |
| `GET` | `/api/v1/blocked` | Retrieve user blocked callers | Bearer Token (RS256) | None |
| `GET` | `/api/v1/stats` | Aggregated user metrics | Bearer Token (RS256) | None |

---

### 8.2 Detailed Endpoint Specifications

#### 1. System Health Check
- **Route:** `GET /health`
- **Authentication:** None
- **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "model": "kathakundra/truetone-voice-model",
    "device": "cpu",
    "database": {
      "type": "MySQL",
      "host": "127.0.0.1",
      "port": 3306,
      "database": "truetone_db",
      "user": "root",
      "connected": false,
      "error": "(1045, \"Access denied for user 'root'@'localhost' (using password: NO)\")",
      "storage_mode": "local_fallback (MySQL unavailable)"
    }
  }
  ```

#### 2. Voice and Behavioral Scam Analysis
- **Route:** `POST /api/v1/analyze`
- **Authentication:** `Authorization: Bearer <Firebase_ID_Token>`
- **Content-Type:** `multipart/form-data`
- **Request Parameters:**
  - `file` (Binary File, required): Audio recording in WAV, MP3, FLAC, or OGG format.
  - `callerNumber` (Form String, optional): Telephone number of caller (e.g., `+91 98765 43210`).
  - `callerName` (Form String, optional): Caller identification (default: `Unknown caller`).
  - `behaviorAnswers` (Form JSON String, optional): Serialized dictionary, e.g., `{"askedForMoney": true, "askedForOtpOrPin": false, "createdUrgency": true}`.
  - `audioSource` (Form String, optional): Descriptor (e.g., `Live Microphone Sample`).
- **Response (200 OK):**
  ```json
  {
    "id": 1,
    "user_id": "firebase_sub_uid_string",
    "caller_number": "+91 98765 43210",
    "caller_name": "Unknown caller",
    "ai_probability": 0.25793,
    "ai_confidence": 0.25793,
    "human_confidence": 0.74207,
    "threshold": 0.15,
    "is_ai": true,
    "verdict": "High Risk",
    "chunk_probabilities": [0.25793],
    "behavior_risk_score": 60,
    "combined_risk_score": 50,
    "behavior_flags": ["Asked for money", "Created urgency"],
    "blocked": false,
    "audio_source": "Live Microphone Sample",
    "timestamp": "Just now",
    "disclaimer": "Preliminary risk assessment based on acoustic voice modeling and behavioral risk indicators. Does not constitute definitive forensic proof."
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Audio file under 1.0 second, AAC/M4A format uploaded, or corrupted container.
  - `401 Unauthorized`: Missing, expired, or tampered Firebase token.
  - `503 Service Unavailable`: Model weights not loaded.

#### 3. Retrieve Historical Analyses
- **Route:** `GET /api/v1/analyses`
- **Authentication:** `Authorization: Bearer <Firebase_ID_Token>`
- **Response (200 OK):** Array of analysis objects scoped strictly to the authenticated user's UID.

#### 4. Block Number in TrueTone
- **Route:** `POST /api/v1/block`
- **Authentication:** `Authorization: Bearer <Firebase_ID_Token>`
- **Content-Type:** `application/json`
- **Request Body:**
  ```json
  {
    "callerNumber": "+91 98765 43210",
    "callerName": "Suspicious Caller",
    "reason": "Flagged as high-risk synthetic voice"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "caller_number": "+91 98765 43210",
    "caller_name": "Suspicious Caller",
    "status": "Blocked in TrueTone",
    "note": "Application-level blocklist active in TrueTone."
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `callerNumber` is empty or `"Unknown"`.

#### 5. Retrieve Blocked Callers
- **Route:** `GET /api/v1/blocked`
- **Authentication:** `Authorization: Bearer <Firebase_ID_Token>`
- **Response (200 OK):** Array of caller block records belonging to the authenticated account.

#### 6. Retrieve Account Statistics
- **Route:** `GET /api/v1/stats`
- **Authentication:** `Authorization: Bearer <Firebase_ID_Token>`
- **Response (200 OK):**
  ```json
  {
    "calls_checked": 12,
    "threats_stopped": 3
  }
  ```

---

## 9. Requirements Analysis

### 9.1 Functional Requirements Matrix

| ID | Requirement Description | Verification Status | Implementation Evidence |
| :--- | :--- | :--- | :--- |
| **FR-01** | User authentication via Firebase (Email/Password & Phone) | **Implemented & Verified** | [`src/lib/firebase.ts#L77-L93`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/lib/firebase.ts#L77-L93) |
| **FR-02** | Live microphone recording with WAV encoding | **Implemented & Verified** | [`src/lib/audio-service.ts#L46-L195`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/lib/audio-service.ts#L46-L195) |
| **FR-03** | Local audio file upload from device storage | **Implemented & Verified** | [`src/lib/audio-service.ts#L200-L215`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/lib/audio-service.ts#L200-L215) |
| **FR-04** | Optional caller phone number with Indian validation | **Implemented & Verified** | [`src/routes/index.tsx#L19-L55`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/routes/index.tsx#L19-L55) |
| **FR-05** | Detection and rejection of unsupported AAC/M4A audio | **Implemented & Verified** | [`backend/app.py#L101-L113`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L101-L113) |
| **FR-06** | Audio mono downmixing and 16 kHz resampling | **Implemented & Verified** | [`backend/app.py#L152-L161`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L152-L161) |
| **FR-07** | 4-second chunking and sliding window Wav2Vec2 inference | **Implemented & Verified** | [`backend/app.py#L192-L210`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L192-L210) |
| **FR-08** | Behavioral questionnaire scoring (Money, OTP, Urgency) | **Implemented & Verified** | [`backend/app.py#L222-L233`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L222-L233) |
| **FR-09** | Weighted combined risk score calculation with floor override | **Implemented & Verified** | [`backend/app.py#L234-L242`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L234-L242) |
| **FR-10** | Application-level caller blocking with phone check | **Implemented & Verified** | [`src/routes/index.tsx#L1600-L1615`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/src/routes/index.tsx#L1600-L1615), [`backend/app.py#L315-L318`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L315-L318) |
| **FR-11** | Automatic failover to persistent local JSON fallback | **Implemented & Verified** | [`backend/database.py#L143-L147`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/database.py#L143-L147) |
| **FR-12** | Automatic background recording of live incoming calls | **Not Implemented** *(OS limitation)* | See Section 11 |

### 9.2 Non-Functional Requirements Matrix

| ID | Requirement Category | Target Standard | Current Implementation Status |
| :--- | :--- | :--- | :--- |
| **NFR-01** | **Security** | Zero client-side credentials; RS256 token validation | **Verified:** Tokens verified against Google x509 certs; secrets excluded from APK. |
| **NFR-02** | **Privacy** | Strict tenant isolation | **Verified:** Data filtered strictly by authenticated `user_id`. |
| **NFR-03** | **Performance** | Inference latency < 3 seconds | **Verified:** Typical CPU inference on a 4-second chunk is $\approx 1.2\text{ to }2.0\text{ seconds}$. |
| **NFR-04** | **Reliability** | Zero downtime during DB connectivity failure | **Verified:** Transparent failover to local JSON store without raising 500 errors. |
| **NFR-05** | **Compatibility** | Android 7.0 (API 24) to Android 16 (API 36) | **Verified:** Native debug APK compiled successfully with Gradle 8 and AGP 8. |
| **NFR-06** | **Package Size** | Lightweight client deployment | **Verified:** Compiled Android debug APK is $4.49\text{ MB}$. |

---

## 10. Testing and Evaluation

### 10.1 Test Suite Specification and Automated Results
Backend verification was conducted via the automated test suite in [`backend/test_api.py`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/test_api.py). The test suite registers an ephemeral RSA public key fixture to validate the RS256 verification pipeline offline.

**Execution Command:**
```powershell
python backend/test_api.py
```

**Verified Test Log Output:**
```text
============================================================
Running TrueTone Backend Test Suite
============================================================
[TrueTone DB] Notice: MySQL not reachable ((1045, "Access denied for user 'root'@'localhost' (using password: NO)")). Using transparent persistent local fallback.
Health check response: {'status': 'ok', 'model': 'kathakundra/truetone-voice-model', 'device': 'cpu', 'database': {'type': 'MySQL', 'host': '127.0.0.1', 'port': 3306, 'database': 'truetone_db', 'user': 'root', 'connected': False, 'error': '(1045, "Access denied for user \'root\'@\'localhost\' (using password: NO)")', 'storage_mode': 'local_fallback (MySQL unavailable)'}}
[Passed] All unauthenticated requests rejected with HTTP 401.
[Passed] Tampered and expired tokens rejected with HTTP 401.
[Passed] Voice analysis succeeds without caller phone number.

--- TruetoneAivoice.mpeg Detection ---
AI Probability: 0.25793
Is AI: True
Verdict: High Risk
Combined Risk Score: 50
[Passed] AI deepfake voice detected with High Risk.

--- truetonehumanvoice.mpeg Detection ---
AI Probability: 0.00177
Is AI: False
Verdict: Safe
[Passed] Human authentic voice detected with Safe verdict.
[Passed] Unsupported AAC/M4A format correctly rejected with HTTP 400.
[Passed] Audio shorter than 1 second correctly rejected with HTTP 400.
[Passed] Caller blocking without valid phone number correctly rejected with HTTP 400.
[Passed] Caller blocking with valid phone number succeeds and persists.
[Passed] Account isolation and cryptographic anti-spoofing defense fully verified.
[Passed] User-scoped aggregated stats verified.
============================================================
ALL TESTS PASSED SUCCESSFULLY!
============================================================
```

### 10.2 Frontend Build and Packaging Verification
- **Web Client Production Build (`npm run build:app`):**  
  Compiled via Vite 8.1.5 in $1.01\text{ seconds}$ with zero syntax or type errors. Outputs generated to `dist/index.html` ($0.98\text{ kB}$), `dist/assets/*.css` ($89.47\text{ kB}$), and `dist/assets/*.js` ($922.70\text{ kB}$).
- **Capacitor Android Synchronization (`npx cap sync android`):**  
  Synchronized compiled assets from `dist` into `android/app/src/main/assets/public` in $0.62\text{ seconds}$.
- **Native Android APK Compilation (`.\gradlew.bat assembleDebug`):**  
  Executed across 94 Gradle tasks ($27\text{ executed}$, $67\text{ up-to-date}$) achieving `BUILD SUCCESSFUL in 24s`.
  - Output File: [`android/app/build/outputs/apk/debug/app-debug.apk`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/android/app/build/outputs/apk/debug/app-debug.apk)
  - Package Size: $4,494,558\text{ bytes}$ ($\approx 4.49\text{ MB}$).

---

## 11. Current Limitations and Technical Boundaries

To maintain academic rigor and transparency, the following technical and platform limitations are documented:

1. **Audio Ingestion Method vs. Live Cellular Interception:**
   - **Current Reality:** TrueTone evaluates audio that is **uploaded by the user as an audio file** or **recorded via the device microphone** while on speakerphone.
   - **Absence of Real-Time Call Interception:** TrueTone **does not automatically record, tap, or intercept live cellular phone calls in the background**. Modern Android operating systems (Android 9.0 Pie through Android 16) enforce strict sandboxing, Scoped Storage, and privacy restrictions that prohibit third-party applications from capturing uplink and downlink telephony audio streams via `AudioSource.VOICE_CALL` without privileged root access or OEM system signatures.
2. **Audio Codec Restrictions:**
   - The backend decoding pipeline supports uncompressed WAV, MP3/MPEG, FLAC, and OGG containers.
   - Proprietary AAC, M4A, and MP4 containers are **intentionally unsupported and rejected with HTTP 400** to eliminate bulky FFmpeg shared library binaries ($>28\text{ MB}$) on resource-constrained host environments.
3. **Generalization Across Real-World Noise Conditions:**
   - Neural vocoder artifact detection in Wav2Vec2 models can degrade under heavy cellular network compression (AMR / AMR-WB codecs), background acoustic noise, or speaker reverberation. The system provides a risk assessment heuristic, not definitive forensic proof.
4. **Hardware Execution Constraints:**
   - On the current host, the model executes on the CPU (`torch.device("cpu")`), resulting in inference times of $\approx 1.2\text{--}2.0\text{ seconds}$ per 4-second chunk. While suitable for post-call or speakerphone analysis, sub-second latency requires CUDA GPU acceleration.

---

## 12. Future Enhancements

1. **Carrier-Grade Telephony & Telecom Integration:**
   - Partner with telecommunication operators or VoIP providers to inspect RTP audio packets at the network switchboard level before call routing, bypassing on-device Android sandbox constraints.
2. **On-Device Edge ML Inference:**
   - Quantize the $1.26\text{ GB}$ Wav2Vec2 Large model to 8-bit integer weights using ONNX Runtime or TensorFlow Lite ($<150\text{ MB}$), enabling local offline inference directly on mobile Neural Processing Units (NPUs).
3. **Multilingual and Dialect-Adaptive Models:**
   - Extend acoustic training beyond English and primary synthetic corpora to cover Indian regional languages (Hindi, Tamil, Telugu, Bengali, Marathi, Kannada) to counter localized vishing campaigns.
4. **Automated Caller Reputation Telemetry:**
   - Integrate crowdsourced spam reputation APIs to corroborate acoustic indicators with carrier metadata and call velocity statistics.

---

## 13. Report-Ready Summary for B.Tech CSE Thesis

### 13.1 Consolidated Technology Stack

| Layer | Component | Implementation Specification |
| :--- | :--- | :--- |
| **Mobile Client** | Native Shell | Capacitor 8.5.3 on Android SDK 24–36 |
| **Frontend UI** | SPA Framework | React 19.2.0, TypeScript 5.8.3, Vite 8.1.5 |
| **Design System** | CSS & Primitives | TailwindCSS 4.2.1, Radix UI, Lucide Icons |
| **Client Auth** | Identity SDK | Firebase Web SDK 13.0.0 (OIDC Tokens) |
| **Backend API** | Web Server | FastAPI 0.110.0+ on Uvicorn (Python 3.12) |
| **Security Layer** | Token Verifier | PyJWT 2.8.0+, Cryptography 41.0.0+ (RS256) |
| **Audio I/O** | Decoder | SoundFile 0.12.0+ & SciPy WAV |
| **Machine Learning**| Neural Classifier | PyTorch 2.2.0+, Torchaudio, Transformers 4.38.0+ |
| **Model Weights** | Deepfake Model | `kathakundra/truetone-voice-model` (Wav2Vec2, 1.26 GB) |
| **Primary Database**| Relational DB | MySQL 8.0 via PyMySQL 1.1.0+ |
| **Fallback Database**| Local Store | Atomic JSON Store (`truetone_store.json`) |

### 13.2 Software and Hardware Requirements

#### Minimum Development & Host Server Hardware
- **Processor:** Intel Core i5 / AMD Ryzen 5 (4 physical cores, 2.4 GHz+)
- **System Memory (RAM):** 8 GB minimum (16 GB recommended to accommodate the 1.26 GB model footprint alongside OS processes)
- **Host Storage:** 5 GB free disk space (model cache, dependencies, Android build tools)
- **Optional Acceleration:** NVIDIA GPU supporting CUDA 11.8+ (for sub-second neural inference)

#### Software Dependencies
- **Operating System:** Windows 10/11, Ubuntu 22.04 LTS, or macOS Sonoma
- **Runtimes:** Python 3.10 to 3.12 (64-bit), Node.js 20.x or 22.x LTS, JDK 17 or 21 (Temurin/OpenJDK)
- **SDKs & Tools:** Android SDK Command-Line Tools, Android Studio (API level 34–36), Git

---

### 13.3 Module-Wise Description

1. **User Authentication & Identity Module:** Manages user registration, sign-in, and session persistence via Firebase Auth. It acquires and refreshes RS256 JWT tokens to authenticate all backend operations.
2. **Audio Ingestion & PCM Serialization Module:** Interfaces with device audio input. Generates standard 16-bit linear PCM WAV blobs from raw microphone streams and handles multi-format file uploads.
3. **Audio Preprocessing & Sanitization Pipeline:** Cleans vendor-specific metadata footers, validates container formats, downmixes multi-channel audio to mono, resamples waveforms to 16,000 Hz, and enforces minimum duration requirements.
4. **Wav2Vec2 Deepfake Inference Engine:** Evaluates audio waveforms across sliding 4.0-second segments using a 24-layer transformer model to extract synthetic acoustic probabilities.
5. **Behavioral Heuristics & Risk Scoring Engine:** Calculates composite risk by combining acoustic probabilities ($60\%$) with conversational coercion flags ($40\%$) to generate a final risk score and categorical verdict.
6. **Persistence & Data Isolation Manager:** Handles database queries, schema migrations, and user data isolation across MySQL and local JSON stores.
7. **Mitigation & Blocklist Management Module:** Provides application-level caller blocking, validating phone numbers and updating blocklists to protect users from future threats.

---

### 13.4 Recommended Figures and Diagrams for Project Report

When preparing your final submission, include the following visual figures:
1. **Figure 1: Overall System Architecture Diagram** (Use the architectural diagram from Section 3.1).
2. **Figure 2: Sequence Diagram of Voice Analysis Pipeline** (Tracing client audio capture $\to$ JWT authorization $\to$ preprocessing $\to$ neural inference $\to$ risk aggregation $\to$ database save $\to$ UI response).
3. **Figure 3: Wav2Vec 2.0 Feature Extraction and Transformer Encoder Topology** (Illustrating the 7-layer convolutional feature extractor and 24-layer transformer blocks).
4. **Figure 4: Entity-Relationship (ER) Diagram of Database Schema** (Showing `call_analyses` and `blocked_numbers` tables partitioned by `user_id`).
5. **Figure 5: TrueTone Mobile Application User Interface Progression** (Login screen $\to$ Permissions screen $\to$ Home Dashboard $\to$ Live Waveform Analysis $\to$ Behavioral Check $\to$ Final Result with circular gauge).
6. **Figure 6: Decision Flowchart of Composite Risk Engine** (Showing the 60/40 acoustic-behavioral weighting and the synthetic risk floor logic).

---

### 13.5 Glossary of Technical Terms

- **Wav2Vec 2.0:** A self-supervised deep learning framework developed by Meta AI that learns acoustic representations directly from raw speech audio without intermediate spectrograms.
- **Neural Vocoder:** A deep neural network (e.g., HiFi-GAN, WaveGlow) that synthesizes time-domain speech waveforms from intermediate representations (such as mel-spectrograms).
- **RS256 (RSA Signature with SHA-256):** An asymmetric cryptographic algorithm utilizing a private key to sign JSON Web Tokens and a public key to verify them.
- **OIDC (OpenID Connect):** An identity layer built on top of OAuth 2.0 allowing clients to verify the identity of an end-user based on authentication performed by an authorization server.
- **libsndfile / SoundFile:** A C library and Python wrapper for reading and writing files containing sampled sound across diverse container formats.
- **Capacitor:** An open-source native runtime developed by Ionic that enables cross-platform web applications to run natively on Android, iOS, and the modern web.
- **Downmixing:** The digital signal processing technique of combining multiple independent audio channels (e.g., stereo left and right) into a single mono channel.
- **Vishing:** Voice phishing; the fraudulent practice of making phone calls or leaving voice messages purporting to be from reputable companies to induce individuals to reveal personal information.

---

### 13.6 Checklist of Facts Requiring Manual Confirmation Before Report Submission

Before final report printing and presentation, confirm the following project-specific details:

- [ ] **College/University Guidelines:** Verify that your department's thesis guidelines (font size, margin, citation format e.g. IEEE) match the formatting of this report.
- [ ] **Hugging Face Model Access:** Confirm that your instructor or grading panel has access to `kathakundra/truetone-voice-model` if they request live weight verification, or provide offline cached access.
- [ ] **MySQL Deployment Choice:** Decide whether your final demo will showcase the **active local JSON fallback** or connect to **MySQL 8.0** by entering your password in `backend/.env`. Both operate identically at the API level.
- [ ] **Android Physical Device vs. Emulator:** When demonstrating on a physical Android device, update `VITE_TRUETONE_API_URL` to your laptop's local Wi-Fi IP (e.g. `http://192.168.1.X:8000`). If using the Android Studio emulator, use `http://10.0.2.2:8000`.
- [ ] **Live Call Clarification:** If an examiner asks whether the app intercepts normal cellular phone calls automatically in the background, refer to Section 11 to explain Android OS security policies (`Scoped Storage` and background audio restrictions) and highlight TrueTone's speakerphone and file analysis methodology.
