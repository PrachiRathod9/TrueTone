# TrueTone Guard –  AI-Powered Voice Authenticity Detection and Scam Risk Assessment

## About the Project

TrueTone Guard is an AI-powered application designed to detect AI-generated or cloned voices from uploaded audio files. It uses a deep learning-based Wav2Vec 2.0 model to analyze voice recordings and distinguish between human and AI-generated speech.

The application allows users to upload clean audio recordings and receive an AI-based voice authenticity analysis along with a risk assessment.

## Key Features

- **Audio Upload:** Upload audio files for voice authenticity analysis.
- **AI Voice Detection:** Detects characteristics of AI-generated or cloned voices.
- **Voice Classification:** Estimates whether the uploaded audio contains a human or AI-generated voice.
- **Behavioural Risk Assessment:** Evaluates suspicious indicators such as money requests, OTP/PIN requests, and urgency.
- **Risk Analysis:** Combines voice analysis and behavioural indicators to generate an overall risk score.
- **Analysis Results:** Displays voice authenticity scores, behavioural risk scores, and the final assessment.
- **Incident History:** Maintains records of previous audio analyses.

## Technology Stack

- **Frontend:** React.js, TypeScript, Vite
- **Android:** Capacitor
- **Backend:** Python, FastAPI
- **Deep Learning:** Wav2Vec 2.0, PyTorch, Hugging Face Transformers
- **Audio Processing:** FFmpeg, Torchaudio, SoundFile
- **Authentication:** Firebase Authentication
- **Database:** MySQL

## Working Process

1. User uploads a clean audio file.
2. The system preprocesses the audio into the required format.
3. The Wav2Vec 2.0-based model analyzes the uploaded audio.
4. The model estimates the probability of human or AI-generated speech.
5. The user completes a behavioural risk assessment.
6. The system calculates the combined risk score.
7. The application displays the final voice authenticity and risk analysis.

## Project Objective

The main objective of TrueTone Guard is to identify AI-generated and cloned voices using deep learning and provide users with an easy-to-understand voice authenticity and risk assessment.

---
