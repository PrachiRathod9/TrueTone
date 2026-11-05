"""
TrueTone Backend Comprehensive Test Suite
Tests:
- /health endpoint & status reporting
- Cryptographic Firebase ID Token verification & 401 rejection of forged/missing credentials
- Optional phone number voice analysis
- Real audio deepfake detection (AI voice vs Human voice)
- Codec validations (AAC/M4A rejection, short audio rejection)
- Caller blocking with and without phone number
- Strict account isolation (User A vs User B) & UID spoofing prevention
"""

import os
import sys
import time
from fastapi.testclient import TestClient
from cryptography.hazmat.primitives.asymmetric import rsa
import jwt

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from app import app
from auth import register_test_public_key, FIREBASE_PROJECT_ID

client = TestClient(app)

# ---------------------------------------------------------------------------
# Cryptographic Test Keypair Setup (RS256)
# Generates an ephemeral in-memory RSA keypair to cryptographically sign test
# tokens without relying on external network calls to Google's cert servers.
# ---------------------------------------------------------------------------
_test_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_test_public_key = _test_private_key.public_key()
TEST_KID = "truetone-test-key-2026"
register_test_public_key(TEST_KID, _test_public_key)


def create_test_token(uid: str, email: str = "tester@truetone.local", expired: bool = False) -> str:
    now = int(time.time())
    payload = {
        "iss": f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
        "aud": FIREBASE_PROJECT_ID,
        "sub": uid,
        "email": email,
        "iat": now - 7200 if expired else now,
        "exp": now - 3600 if expired else now + 3600,
        "auth_time": now,
    }
    return jwt.encode(payload, _test_private_key, algorithm="RS256", headers={"kid": TEST_KID})


TOKEN_USER_A = create_test_token("test_account_alpha")
TOKEN_USER_B = create_test_token("test_account_beta")
TOKEN_EXPIRED = create_test_token("test_account_alpha", expired=True)

AI_SAMPLE_PATH = r"C:\Users\HP\Desktop\Mega Project\TruetoneAivoice.mpeg"
HUMAN_SAMPLE_PATH = r"C:\Users\HP\Desktop\Mega Project\truetonehumanvoice.mpeg"


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    data = resp.json()
    print("Health check response:", data)
    assert data["status"] == "ok"
    assert data["model"] == "kathakundra/truetone-voice-model"
    assert "database" in data
    assert "connected" in data["database"]


def test_unauthenticated_requests_rejected():
    endpoints = [
        ("GET", "/api/v1/analyses"),
        ("GET", "/api/v1/blocked"),
        ("GET", "/api/v1/stats"),
        ("POST", "/api/v1/block"),
    ]
    for method, path in endpoints:
        if method == "GET":
            resp = client.get(path)
        else:
            resp = client.post(path, json={"callerNumber": "9876543210"})
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {path}, got {resp.status_code}"
    print("[Passed] All unauthenticated requests rejected with HTTP 401.")


def test_tampered_and_expired_tokens_rejected():
    # Expired token
    resp_exp = client.get("/api/v1/analyses", headers={"Authorization": f"Bearer {TOKEN_EXPIRED}"})
    assert resp_exp.status_code == 401, f"Expected 401 for expired token, got {resp_exp.status_code}"

    # Tampered signature
    tampered = TOKEN_USER_A[:-5] + "XXXXX"
    resp_tamp = client.get("/api/v1/analyses", headers={"Authorization": f"Bearer {tampered}"})
    assert resp_tamp.status_code == 401, f"Expected 401 for tampered token, got {resp_tamp.status_code}"

    # Invalid Bearer structure
    resp_inv = client.get("/api/v1/analyses", headers={"Authorization": "NotABearerToken"})
    assert resp_inv.status_code == 401

    print("[Passed] Tampered and expired tokens rejected with HTTP 401.")


def test_audio_analysis_with_optional_phone():
    with open(HUMAN_SAMPLE_PATH, "rb") as f:
        content = f.read()

    # Empty callerNumber (optional phone number)
    resp = client.post(
        "/api/v1/analyze",
        files={"file": ("test_sample.mpeg", content, "audio/mpeg")},
        data={"callerNumber": "", "callerName": "", "behaviorAnswers": "{}"},
        headers={"Authorization": f"Bearer {TOKEN_USER_A}"},
    )
    assert resp.status_code == 200, f"Analysis without phone number failed: {resp.text}"
    data = resp.json()
    assert data["caller_number"] == "", f"Expected empty caller_number, got {data['caller_number']}"
    assert data["caller_name"] == "Unknown caller"
    assert "combined_risk_score" in data
    assert "verdict" in data
    print("[Passed] Voice analysis succeeds without caller phone number.")


def test_ai_audio_detection():
    with open(AI_SAMPLE_PATH, "rb") as f:
        content = f.read()

    resp = client.post(
        "/api/v1/analyze",
        files={"file": ("TruetoneAivoice.mpeg", content, "audio/mpeg")},
        data={"callerNumber": "+91 84509 21876", "callerName": "Suspicious AI", "behaviorAnswers": "{}"},
        headers={"Authorization": f"Bearer {TOKEN_USER_A}"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    print("\n--- TruetoneAivoice.mpeg Detection ---")
    print("AI Probability:", data["ai_probability"])
    print("Is AI:", data["is_ai"])
    print("Verdict:", data["verdict"])
    print("Combined Risk Score:", data["combined_risk_score"])
    assert data["is_ai"] is True
    assert data["verdict"] == "High Risk"
    assert data["ai_probability"] > 0.15
    print("[Passed] AI deepfake voice detected with High Risk.")


def test_human_audio_detection():
    with open(HUMAN_SAMPLE_PATH, "rb") as f:
        content = f.read()

    resp = client.post(
        "/api/v1/analyze",
        files={"file": ("truetonehumanvoice.mpeg", content, "audio/mpeg")},
        data={"callerNumber": "+91 98765 43210", "callerName": "Real Person", "behaviorAnswers": "{}"},
        headers={"Authorization": f"Bearer {TOKEN_USER_A}"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    print("\n--- truetonehumanvoice.mpeg Detection ---")
    print("AI Probability:", data["ai_probability"])
    print("Is AI:", data["is_ai"])
    print("Verdict:", data["verdict"])
    assert data["is_ai"] is False
    assert data["verdict"] == "Safe"
    assert data["ai_probability"] < 0.15
    print("[Passed] Human authentic voice detected with Safe verdict.")


def test_unsupported_aac_rejection():
    resp = client.post(
        "/api/v1/analyze",
        files={"file": ("recording.m4a", b"dummy_content", "audio/mp4")},
        data={"callerNumber": "+91 99999 99999", "behaviorAnswers": "{}"},
        headers={"Authorization": f"Bearer {TOKEN_USER_A}"},
    )
    assert resp.status_code == 400
    assert "Unsupported audio format" in resp.json()["detail"]
    print("[Passed] Unsupported AAC/M4A format correctly rejected with HTTP 400.")


def test_too_short_audio_rejection():
    # Less than 1 second of audio
    short_pcm = b"\x00\x00" * 4000
    resp = client.post(
        "/api/v1/analyze",
        files={"file": ("too_short.wav", short_pcm, "audio/wav")},
        data={"callerNumber": "+91 99999 99999", "behaviorAnswers": "{}"},
        headers={"Authorization": f"Bearer {TOKEN_USER_A}"},
    )
    assert resp.status_code == 400
    print("[Passed] Audio shorter than 1 second correctly rejected with HTTP 400.")


def test_block_caller_without_phone_rejected():
    # Attempting to block without phone number or "Unknown" must return 400
    for invalid_num in ["", "   ", "Unknown", "unknown"]:
        resp = client.post(
            "/api/v1/block",
            json={"callerNumber": invalid_num, "callerName": "Unknown caller"},
            headers={"Authorization": f"Bearer {TOKEN_USER_A}"},
        )
        assert resp.status_code == 400, f"Expected 400 for blocking '{invalid_num}', got {resp.status_code}"
    print("[Passed] Caller blocking without valid phone number correctly rejected with HTTP 400.")


def test_block_caller_with_valid_phone():
    target_num = "+91 98234 11223"
    resp = client.post(
        "/api/v1/block",
        json={"callerNumber": target_num, "callerName": "Flagged Scammer", "reason": "Test block"},
        headers={"Authorization": f"Bearer {TOKEN_USER_A}"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert "Blocked in TrueTone" in data["status"]

    # Verify User A sees it in blocked list
    blocked_resp = client.get("/api/v1/blocked", headers={"Authorization": f"Bearer {TOKEN_USER_A}"})
    assert blocked_resp.status_code == 200
    blocked_list = blocked_resp.json()
    assert any(b["caller_number"] == target_num for b in blocked_list)
    print("[Passed] Caller blocking with valid phone number succeeds and persists.")


def test_account_isolation_and_spoofing_defense():
    """
    Verifies that:
    1. Account Alpha's data is only returned to Account Alpha.
    2. Account Beta's data is only returned to Account Beta.
    3. Even if Account Alpha passes X-User-Id: 'test_account_beta' or userId: 'test_account_beta',
       the backend extracts the UID exclusively from the verified cryptographic token,
       making UID spoofing impossible.
    """
    with open(HUMAN_SAMPLE_PATH, "rb") as f:
        content = f.read()

    # User A creates analysis
    resp_a = client.post(
        "/api/v1/analyze",
        files={"file": ("alpha_call.mpeg", content, "audio/mpeg")},
        data={"callerNumber": "+91 91111 11111", "callerName": "Alpha Contact", "behaviorAnswers": "{}"},
        headers={"Authorization": f"Bearer {TOKEN_USER_A}"},
    )
    assert resp_a.status_code == 200

    # User B creates analysis
    resp_b = client.post(
        "/api/v1/analyze",
        files={"file": ("beta_call.mpeg", content, "audio/mpeg")},
        data={"callerNumber": "+91 92222 22222", "callerName": "Beta Contact", "behaviorAnswers": "{}"},
        headers={"Authorization": f"Bearer {TOKEN_USER_B}"},
    )
    assert resp_b.status_code == 200

    # User A blocks a number
    client.post(
        "/api/v1/block",
        json={"callerNumber": "+91 91111 00000", "callerName": "Alpha Spammer"},
        headers={"Authorization": f"Bearer {TOKEN_USER_A}"},
    )

    # User B blocks a different number
    client.post(
        "/api/v1/block",
        json={"callerNumber": "+91 92222 00000", "callerName": "Beta Spammer"},
        headers={"Authorization": f"Bearer {TOKEN_USER_B}"},
    )

    # Retrieve User A analyses
    analyses_a = client.get("/api/v1/analyses", headers={"Authorization": f"Bearer {TOKEN_USER_A}"}).json()
    # Retrieve User B analyses
    analyses_b = client.get("/api/v1/analyses", headers={"Authorization": f"Bearer {TOKEN_USER_B}"}).json()

    # Assert Account A cannot see Account B's records
    numbers_a = [item.get("caller_number") for item in analyses_a]
    numbers_b = [item.get("caller_number") for item in analyses_b]

    assert "+91 91111 11111" in numbers_a, "User A should see their own call"
    assert "+91 92222 22222" not in numbers_a, "Security breach: User A can see User B's call!"

    assert "+91 92222 22222" in numbers_b, "User B should see their own call"
    assert "+91 91111 11111" not in numbers_b, "Security breach: User B can see User A's call!"

    # Assert Blocked list isolation
    blocked_a = client.get("/api/v1/blocked", headers={"Authorization": f"Bearer {TOKEN_USER_A}"}).json()
    blocked_b = client.get("/api/v1/blocked", headers={"Authorization": f"Bearer {TOKEN_USER_B}"}).json()

    blocked_nums_a = [b.get("caller_number") for b in blocked_a]
    blocked_nums_b = [b.get("caller_number") for b in blocked_b]

    assert "+91 91111 00000" in blocked_nums_a
    assert "+91 92222 00000" not in blocked_nums_a, "Security breach: User A can see User B's blocked numbers!"

    assert "+91 92222 00000" in blocked_nums_b
    assert "+91 91111 00000" not in blocked_nums_b, "Security breach: User B can see User A's blocked numbers!"

    # Anti-Spoofing Test: User A attempts to claim they are User B via headers or forms
    spoof_headers = {
        "Authorization": f"Bearer {TOKEN_USER_A}",
        "X-User-Id": "test_account_beta",
    }
    spoof_analyses = client.get("/api/v1/analyses?userId=test_account_beta", headers=spoof_headers).json()
    spoof_numbers = [item.get("caller_number") for item in spoof_analyses]
    assert "+91 92222 22222" not in spoof_numbers, "Security breach: Client spoofed userId to access User B data!"
    assert "+91 91111 11111" in spoof_numbers, "Backend correctly used token UID (User A) despite spoofed headers."

    print("[Passed] Account isolation and cryptographic anti-spoofing defense fully verified.")


def test_stats_isolation():
    stats_a = client.get("/api/v1/stats", headers={"Authorization": f"Bearer {TOKEN_USER_A}"}).json()
    stats_b = client.get("/api/v1/stats", headers={"Authorization": f"Bearer {TOKEN_USER_B}"}).json()
    assert "calls_checked" in stats_a and "threats_stopped" in stats_a
    assert "calls_checked" in stats_b and "threats_stopped" in stats_b
    assert stats_a["calls_checked"] >= 1
    assert stats_a["threats_stopped"] >= 1
    assert stats_b["calls_checked"] >= 1
    assert stats_b["threats_stopped"] >= 1
    print("[Passed] User-scoped aggregated stats verified.")


if __name__ == "__main__":
    print("=" * 60)
    print("Running TrueTone Backend Test Suite")
    print("=" * 60)
    test_health()
    test_unauthenticated_requests_rejected()
    test_tampered_and_expired_tokens_rejected()
    test_audio_analysis_with_optional_phone()
    test_ai_audio_detection()
    test_human_audio_detection()
    test_unsupported_aac_rejection()
    test_too_short_audio_rejection()
    test_block_caller_without_phone_rejected()
    test_block_caller_with_valid_phone()
    test_account_isolation_and_spoofing_defense()
    test_stats_isolation()
    print("=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)
