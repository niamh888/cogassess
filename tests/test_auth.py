"""
test_auth.py — Authentication and JWT tests for CogAssess.

Test cases:
  TC-AUTH-001: Unauthenticated requests to protected endpoints return 401
  TC-AUTH-002: JWT token expiry is configured to 8 hours
  TC-AUTH-003: Invalid credentials return 401
"""

import base64
import json
import time


# ── TC-AUTH-001 ───────────────────────────────────────────────────────────────

def test_unauthenticated_request_returns_401(client):
    """
    TC-AUTH-001: Unauthenticated requests to protected endpoints return 401.

    Verifies that the /assessments and /patients endpoints reject requests
    that carry no Authorization header with HTTP 401 Unauthorized.
    """
    response_assessments = client.get("/assessments")
    assert response_assessments.status_code == 401, (
        f"Expected 401 for GET /assessments without auth, got {response_assessments.status_code}"
    )

    response_patients = client.get("/patients")
    assert response_patients.status_code == 401, (
        f"Expected 401 for GET /patients without auth, got {response_patients.status_code}"
    )


# ── TC-AUTH-002 ───────────────────────────────────────────────────────────────

def test_jwt_token_expiry_is_8_hours(client):
    """
    TC-AUTH-002: JWT token expiry is configured to 8 hours.

    Logs in as the test clinician, base64-decodes the JWT payload without
    verifying the signature, and checks that exp is at least 8 hours in the
    future (using time.time() as the reference for 'now').  If the token also
    contains an 'iat' claim the delta between exp and iat is checked instead,
    which is more precise; otherwise the wall-clock approximation is used.
    """
    issued_before = int(time.time())

    response = client.post(
        "/auth/login",
        data={"username": "test_clinician", "password": "test_password"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"

    token = response.json()["access_token"]
    # JWT format: header.payload.signature  (all base64url-encoded)
    parts = token.split(".")
    assert len(parts) == 3, "Token does not appear to be a valid JWT (expected 3 parts)"

    # Base64url decode the payload — add padding to avoid errors
    payload_b64 = parts[1]
    padding = 4 - len(payload_b64) % 4
    if padding != 4:
        payload_b64 += "=" * padding
    payload_bytes = base64.urlsafe_b64decode(payload_b64)
    payload = json.loads(payload_bytes)

    assert "exp" in payload, "JWT payload is missing 'exp' claim"

    expected_seconds = 8 * 3600  # 28 800 seconds

    if "iat" in payload:
        # Preferred path: compare exp to the token's own iat
        delta_seconds = payload["exp"] - payload["iat"]
        assert delta_seconds >= expected_seconds, (
            f"Token lifetime (exp-iat) is {delta_seconds}s, "
            f"expected >= {expected_seconds}s (8 hours)"
        )
    else:
        # Fallback: exp must be at least 8 hours after the login request was sent
        delta_seconds = payload["exp"] - issued_before
        assert delta_seconds >= expected_seconds, (
            f"Token exp is {delta_seconds}s from now, "
            f"expected >= {expected_seconds}s (8 hours). "
            f"exp={payload['exp']}, issued_before={issued_before}"
        )


# ── TC-AUTH-003 ───────────────────────────────────────────────────────────────

def test_invalid_credentials_return_401(client):
    """
    TC-AUTH-003: Invalid credentials return 401.

    Tests four bad-credential scenarios:
      1. Wrong username, correct password
      2. Correct username, wrong password
      3. Both username and password wrong
      4. Empty username and password (expects 401 or 422)
    """
    # 1. Wrong username, correct password
    r = client.post(
        "/auth/login",
        data={"username": "nonexistent_user", "password": "test_password"},
    )
    assert r.status_code == 401, (
        f"Expected 401 for wrong username, got {r.status_code}"
    )

    # 2. Correct username, wrong password
    r = client.post(
        "/auth/login",
        data={"username": "test_clinician", "password": "wrong_password"},
    )
    assert r.status_code == 401, (
        f"Expected 401 for wrong password, got {r.status_code}"
    )

    # 3. Both wrong
    r = client.post(
        "/auth/login",
        data={"username": "nobody", "password": "nothing"},
    )
    assert r.status_code == 401, (
        f"Expected 401 for both credentials wrong, got {r.status_code}"
    )

    # 4. Empty credentials — OAuth2 form may return 422 (validation) or 401
    r = client.post(
        "/auth/login",
        data={"username": "", "password": ""},
    )
    assert r.status_code in (401, 422), (
        f"Expected 401 or 422 for empty credentials, got {r.status_code}"
    )
