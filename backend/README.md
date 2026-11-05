# TrueTone Voice Model Backend Server

This backend hosts the fine-tuned voice deepfake detection model:
- **Hugging Face Model**: `kathakundra/truetone-voice-model` (private)
- **Base Model**: `garystafford/wav2vec2-deepfake-voice-detector`
- **Model weights size**: ~1.26 GB (kept securely on the server, not in the Android app)
- **Threshold**: `0.15` (AI confidence threshold)

## Security Architecture
- The Hugging Face User Access Token (`HF_TOKEN`) and Firebase Service Account keys are stored **only on this backend**.
- The Android app calls this service over HTTPS (`/api/v1/analyze`), preventing sensitive tokens from ever being reverse-engineered or extracted from the APK.

## Running the Backend

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Export your Hugging Face Token:
   ```bash
   # Linux/macOS
   export HF_TOKEN="your_huggingface_token"
   # Windows PowerShell
   $env:HF_TOKEN="your_huggingface_token"
   ```

3. Start server:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

4. Connect Android App:
   In your `.env` or `vite.client.config.ts`, set:
   ```env
   VITE_TRUETONE_API_URL=http://your-server-ip:8000
   ```
   (For local Android emulator testing, use `http://10.0.2.2:8000`).
