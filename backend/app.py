"""
TrueTone Voice Deepfake Detection Backend Service
Hosts: kathakundra/truetone-voice-model (Fine-tuned Wav2Vec2)
Base: garystafford/wav2vec2-deepfake-voice-detector
Threshold: 0.15

This server keeps all Hugging Face authentication tokens and Firebase Admin credentials secure.
NEVER distribute these credentials inside the Android APK.
"""

import os
import io
import torch
import torchaudio
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from database import db_manager
from auth import get_authenticated_uid

class BlockRequest(BaseModel):
    callerNumber: str
    callerName: Optional[str] = "Unknown caller"
    reason: Optional[str] = "Flagged as high-risk synthetic voice"

# Ensure HF Token is read from environment variable
HF_TOKEN = os.getenv("HF_TOKEN")
MODEL_ID = "kathakundra/truetone-voice-model"
SAMPLE_RATE = 16000
CHUNK_DURATION = 4.0  # 4 seconds
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_DURATION)
AI_THRESHOLD = 0.15   # Specified AI decision threshold

app = FastAPI(title="TrueTone Voice Scam Analysis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"Loading TrueTone Model: {MODEL_ID}...")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = None
feature_extractor = None

# Attempt 1: Load from Hugging Face Hub if token provided or online
if HF_TOKEN:
    try:
        feature_extractor = AutoFeatureExtractor.from_pretrained(MODEL_ID, token=HF_TOKEN)
        model = AutoModelForAudioClassification.from_pretrained(MODEL_ID, token=HF_TOKEN)
        model.to(device)
        model.eval()
        print("Model successfully loaded via HF_TOKEN on", device)
    except Exception as e:
        print(f"Notice: Could not load via HF_TOKEN ({e}). Checking local cache...")

# Attempt 2: Load from local Hugging Face hub cache if already downloaded
if model is None:
    try:
        feature_extractor = AutoFeatureExtractor.from_pretrained(MODEL_ID, local_files_only=True)
        model = AutoModelForAudioClassification.from_pretrained(MODEL_ID, local_files_only=True)
        model.to(device)
        model.eval()
        print("Model successfully loaded from local cache on", device)
    except Exception as e:
        print(f"Warning: Could not load model from local cache ({e}).")
        model = None
        feature_extractor = None


import soundfile as sf
from scipy.io import wavfile


def clean_audio_bytes(data: bytes) -> bytes:
    """
    Strips trailing mobile recorder metadata markers (e.g. oppoMark, Xiaomi, Samsung footers)
    that cause libmpg123 / soundfile resync failures on Android audio clips.
    """
    for marker in (b"oppoMark", b"xiaomi", b"samsung"):
        pos = data.find(marker)
        if pos != -1:
            return data[:pos]
    return data


def preprocess_audio(file_bytes: bytes, filename: str = "") -> torch.Tensor:
    """
    Decodes audio bytes using soundfile (with scipy fallback for WAV), converts to mono,
    and resamples to 16 kHz.
    Detects and rejects AAC/M4A with HTTP 400.
    """
    # 1. Detect and reject AAC / M4A / MP4 container formats
    lower_fn = filename.lower()
    if lower_fn.endswith((".m4a", ".aac", ".mp4")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format: AAC/M4A. Please upload audio in WAV, MP3, FLAC, or OGG format, or record live using the app microphone.",
        )

    if len(file_bytes) > 8 and file_bytes[4:8] == b"ftyp":
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format: AAC/M4A. Please upload audio in WAV, MP3, FLAC, or OGG format, or record live using the app microphone.",
        )

    cleaned_bytes = clean_audio_bytes(file_bytes)
    audio = None
    sr = None

    # 2. Decode using soundfile (handles WAV, MP3/MPEG, FLAC, OGG)
    try:
        audio, sr = sf.read(io.BytesIO(cleaned_bytes), dtype="float32")
    except Exception as sf_err:
        # Fallback to scipy.io.wavfile for WAV files if soundfile fails
        try:
            wav_sr, wav_data = wavfile.read(io.BytesIO(file_bytes))
            sr = wav_sr
            if wav_data.dtype == np.int16:
                audio = wav_data.astype(np.float32) / 32768.0
            elif wav_data.dtype == np.int32:
                audio = wav_data.astype(np.float32) / 2147483648.0
            elif wav_data.dtype == np.uint8:
                audio = (wav_data.astype(np.float32) - 128.0) / 128.0
            else:
                audio = wav_data.astype(np.float32)
        except Exception:
            err_msg = str(sf_err)
            raise HTTPException(
                status_code=400,
                detail=f"Audio decoding failed: {err_msg}. Ensure the audio is in a valid WAV, MP3, FLAC, or OGG format.",
            )

    if audio is None or sr is None:
        raise HTTPException(status_code=400, detail="Could not extract audio samples from the uploaded file.")

    # 3. Convert NumPy array to PyTorch Tensor
    tensor = torch.from_numpy(audio)
    if tensor.ndim == 2:
        # [samples, channels] -> [channels, samples]
        tensor = tensor.t()
    elif tensor.ndim == 1:
        tensor = tensor.unsqueeze(0)

    # 4. Convert multi-channel to mono (average across channels)
    if tensor.shape[0] > 1:
        tensor = torch.mean(tensor, dim=0, keepdim=True)

    # 5. Resample to 16 kHz for Wav2Vec2
    if sr != SAMPLE_RATE:
        resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=SAMPLE_RATE)
        tensor = resampler(tensor)

    return tensor.squeeze(0)  # [samples]


@app.post("/api/v1/analyze")
async def analyze_voice(
    request: Request,
    file: UploadFile = File(...),
    callerNumber: Optional[str] = Form(""),
    callerName: Optional[str] = Form("Unknown caller"),
    behaviorAnswers: str = Form("{}"),
    audioSource: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None),
):
    authenticated_uid = get_authenticated_uid(authorization=authorization, request=request)
    try:
        contents = await file.read()
        waveform = preprocess_audio(contents, filename=file.filename or "")
        total_samples = waveform.shape[0]

        if total_samples < SAMPLE_RATE:
            raise HTTPException(status_code=400, detail="Audio sample must be at least 1 second.")

        chunk_probs = []

        if model is None or feature_extractor is None:
            raise HTTPException(
                status_code=503,
                detail="TrueTone AI voice model is not initialized. Please ensure HF_TOKEN is set or model cache is available on the server.",
            )

        # Slices audio into 4-second chunks
        for start in range(0, total_samples, CHUNK_SAMPLES):
            end = min(start + CHUNK_SAMPLES, total_samples)
            chunk = waveform[start:end]
            # Pad if shorter than 1 second
            if chunk.shape[0] < SAMPLE_RATE:
                chunk = torch.nn.functional.pad(chunk, (0, SAMPLE_RATE - chunk.shape[0]))

            inputs = feature_extractor(chunk.numpy(), sampling_rate=SAMPLE_RATE, return_tensors="pt")
            inputs = {k: v.to(device) for k, v in inputs.items()}

            with torch.no_grad():
                logits = model(**inputs).logits
                probs = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
                # Probability of AI-generated class (index 1 = fake, index 0 = real)
                ai_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
                chunk_probs.append(round(ai_prob, 5))

        # Aggregate chunk probabilities (mean AI probability across 4s chunks)
        avg_ai_prob = float(np.mean(chunk_probs))

        # Evaluate against threshold 0.15
        is_ai = avg_ai_prob >= AI_THRESHOLD
        human_conf = round(1.0 - avg_ai_prob, 5)

        # Parse behavioral questionnaire
        try:
            behavior_dict = json.loads(behaviorAnswers) if isinstance(behaviorAnswers, str) else (behaviorAnswers or {})
        except Exception:
            behavior_dict = {}

        behavior_score = 0
        behavior_flags = []
        if behavior_dict.get("askedForMoney"):
            behavior_score += 35
            behavior_flags.append("Asked for money")
        if behavior_dict.get("askedForOtpOrPin"):
            behavior_score += 40
            behavior_flags.append("Requested OTP or PIN")
        if behavior_dict.get("createdUrgency"):
            behavior_score += 25
            behavior_flags.append("Created urgency")

        # Combined risk score calculation:
        # Acoustic AI probability (60% weight) + Behavioral flags (40% weight)
        raw_combined = (avg_ai_prob * 100 * 0.6) + (behavior_score * 0.4)
        combined_risk = int(round(raw_combined))
        # If synthetic voice is detected (> threshold), reflect high risk
        if is_ai and combined_risk < 50:
            combined_risk = max(50, int(round(avg_ai_prob * 100)))

        verdict = "High Risk" if is_ai or combined_risk >= 50 else "Safe"

        # Determine audio source label
        source_label = audioSource or (file.filename or "Audio Recording")

        # Resolve caller details (optional phone number)
        raw_num = (callerNumber or "").strip()
        clean_number = "" if raw_num.lower() in ("unknown", "") else raw_num
        clean_name = (callerName or "").strip() or "Unknown caller"

        # Persist analysis to database layer with verified authenticated_uid
        saved = db_manager.save_analysis({
            "user_id": authenticated_uid,
            "caller_number": clean_number,
            "caller_name": clean_name,
            "ai_probability": round(avg_ai_prob, 5),
            "human_confidence": human_conf,
            "is_ai": is_ai,
            "verdict": verdict,
            "behavior_score": behavior_score,
            "combined_risk_score": combined_risk,
            "audio_source": source_label,
            "chunk_probabilities": chunk_probs,
            "behavior_flags": behavior_flags,
        })

        return {
            "id": saved.get("id"),
            "user_id": saved.get("user_id"),
            "caller_number": saved.get("caller_number", clean_number),
            "caller_name": saved.get("caller_name", clean_name),
            "ai_probability": round(avg_ai_prob, 5),
            "ai_confidence": round(avg_ai_prob, 5),
            "human_confidence": human_conf,
            "threshold": AI_THRESHOLD,
            "is_ai": is_ai,
            "verdict": verdict,
            "chunk_probabilities": chunk_probs,
            "behavior_risk_score": behavior_score,
            "combined_risk_score": combined_risk,
            "behavior_flags": behavior_flags,
            "blocked": saved.get("blocked", False),
            "audio_source": source_label,
            "timestamp": saved.get("timestamp", "Just now"),
            "disclaimer": "Preliminary risk assessment based on acoustic voice modeling and behavioral risk indicators. Does not constitute definitive forensic proof.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/analyses")
def get_analyses(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Retrieve call analyses strictly scoped to the authenticated user ID."""
    authenticated_uid = get_authenticated_uid(authorization=authorization, request=request)
    return db_manager.get_analyses(user_id=authenticated_uid)


@app.post("/api/v1/block")
def block_caller(
    req: BlockRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """
    Block a caller number in TrueTone for the authenticated user account.
    Persists to the database blocked_numbers list and synchronizes analysis records.
    """
    authenticated_uid = get_authenticated_uid(authorization=authorization, request=request)
    raw_number = (req.callerNumber or "").strip()
    if not raw_number or raw_number.lower() in ("unknown", ""):
        raise HTTPException(status_code=400, detail="A valid caller phone number is required to block.")

    try:
        return db_manager.block_number(
            caller_number=raw_number,
            caller_name=req.callerName or "Unknown caller",
            reason=req.reason or "Flagged as high-risk synthetic voice",
            user_id=authenticated_uid,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/v1/blocked")
def get_blocked_callers(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Retrieve list of numbers blocked in TrueTone for the authenticated user account."""
    authenticated_uid = get_authenticated_uid(authorization=authorization, request=request)
    return db_manager.get_blocked_numbers(user_id=authenticated_uid)


@app.get("/api/v1/stats")
def get_statistics(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """
    Return genuine aggregated statistics strictly scoped to the authenticated user account.
    calls_checked: successfully completed and saved analyses.
    threats_stopped: confirmed successful block operations.
    """
    authenticated_uid = get_authenticated_uid(authorization=authorization, request=request)
    return db_manager.get_stats(user_id=authenticated_uid)


@app.get("/health")
def health():
    """Reports application health, loaded AI model, and database connection status separately."""
    return {
        "status": "ok",
        "model": MODEL_ID,
        "device": str(device),
        "database": db_manager.get_status(),
    }
