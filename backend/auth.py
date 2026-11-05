"""
TrueTone Firebase Authentication Token Verifier
Verifies Firebase ID Tokens cryptographically using Google's public x509 certificates.
Derives the authentic user UID from token claims.
Enforces that user_id cannot be spoofed by client headers, query parameters, or form fields.
"""

import os
import time
import json
import urllib.request
from typing import Optional, Dict, Any
from pathlib import Path
import jwt
from cryptography.x509 import load_pem_x509_certificate
from fastapi import HTTPException, Header, Request

# Load project ID from environment
try:
    from dotenv import load_dotenv
    _backend_dir = Path(__file__).parent
    _root_dir = _backend_dir.parent
    if (_backend_dir / ".env").exists():
        load_dotenv(_backend_dir / ".env")
    if (_root_dir / ".env").exists():
        load_dotenv(_root_dir / ".env")
except ImportError:
    pass

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", os.getenv("VITE_FIREBASE_PROJECT_ID", "truetone-4149b"))
GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"

# In-memory certificate cache
_cached_certs: Dict[str, str] = {}
_cached_keys: Dict[str, Any] = {}
_certs_expiry: float = 0.0

# Optional test keypair for isolated offline unit tests
_test_public_keys: Dict[str, Any] = {}


def register_test_public_key(kid: str, public_key: Any):
    """Allows test fixtures to register mock public keys for isolated offline tests."""
    _test_public_keys[kid] = public_key


def _fetch_google_public_keys() -> Dict[str, Any]:
    global _cached_certs, _cached_keys, _certs_expiry
    now = time.time()
    if _cached_keys and now < _certs_expiry:
        return _cached_keys

    try:
        req = urllib.request.Request(
            GOOGLE_CERTS_URL,
            headers={"User-Agent": "TrueTone-Backend-Auth/1.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            cache_control = response.headers.get("Cache-Control", "")
            max_age = 3600
            for part in cache_control.split(","):
                if "max-age=" in part:
                    try:
                        max_age = int(part.split("max-age=")[1].strip())
                    except ValueError:
                        pass

            keys = {}
            for kid, cert_pem in data.items():
                try:
                    cert = load_pem_x509_certificate(cert_pem.encode("utf-8"))
                    keys[kid] = cert.public_key()
                except Exception as e:
                    print(f"[Auth] Warning: Could not parse cert for kid={kid}: {e}")

            _cached_certs = data
            _cached_keys = keys
            _certs_expiry = now + max_age
            return _cached_keys
    except Exception as e:
        if _cached_keys:
            return _cached_keys
        raise HTTPException(
            status_code=503,
            detail=f"Unable to fetch Google public certificates for token verification: {e}"
        )


def verify_firebase_id_token(id_token: str) -> Dict[str, Any]:
    """
    Verifies a Firebase Authentication ID Token according to the official spec:
    - Algorithm: RS256
    - Audience: Firebase Project ID
    - Issuer: https://securetoken.google.com/<FIREBASE_PROJECT_ID>
    - Expiration, Issued At, Auth Time
    Returns the decoded token claims dictionary containing 'uid' and 'email'.
    """
    if not id_token or not id_token.strip():
        raise HTTPException(status_code=401, detail="Authentication required: No token provided.")

    token = id_token.strip()
    if token.startswith("Bearer ") or token.startswith("bearer "):
        token = token.split(" ", 1)[1].strip()

    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token format: {e}")

    kid = unverified_header.get("kid")
    alg = unverified_header.get("alg")

    if alg != "RS256":
        raise HTTPException(status_code=401, detail=f"Invalid token algorithm: expected RS256, got {alg}")

    if not kid:
        raise HTTPException(status_code=401, detail="Invalid token: missing 'kid' in header.")

    # Check test keys first if registered (for offline tests)
    pub_key = _test_public_keys.get(kid)
    if not pub_key:
        keys = _fetch_google_public_keys()
        pub_key = keys.get(kid)
        if not pub_key:
            # Force refresh in case keys were rotated
            global _certs_expiry
            _certs_expiry = 0
            keys = _fetch_google_public_keys()
            pub_key = keys.get(kid)

    if not pub_key:
        raise HTTPException(status_code=401, detail=f"Invalid token: unknown certificate kid '{kid}'")

    expected_issuer = f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}"
    try:
        payload = jwt.decode(
            token,
            pub_key,
            algorithms=["RS256"],
            audience=FIREBASE_PROJECT_ID,
            issuer=expected_issuer,
            options={
                "verify_signature": True,
                "verify_aud": True,
                "verify_iat": True,
                "verify_exp": True,
                "verify_iss": True,
            }
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Firebase ID token has expired. Please refresh credentials.")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail=f"Invalid token audience. Expected '{FIREBASE_PROJECT_ID}'.")
    except jwt.InvalidIssuerError:
        raise HTTPException(status_code=401, detail=f"Invalid token issuer. Expected '{expected_issuer}'.")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {e}")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token payload missing required 'sub' (user UID).")

    return {
        "uid": sub,
        "email": payload.get("email", ""),
        "claims": payload,
    }


def get_authenticated_uid(
    authorization: Optional[str] = Header(None),
    request: Optional[Request] = None,
) -> str:
    """
    FastAPI dependency that extracts and cryptographically verifies the Firebase ID token.
    Derives the authentic UID.
    Rejects any unverified, missing, or forged credentials.
    """
    token = authorization
    if not token and request:
        token = request.headers.get("authorization") or request.headers.get("Authorization")

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required: Missing Authorization header with Bearer token."
        )

    verified = verify_firebase_id_token(token)
    return verified["uid"]
