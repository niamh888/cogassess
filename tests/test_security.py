"""
test_security.py — Security and token tests for CogAssess.

Test cases:
  TC-SEC-001: Password is stored as bcrypt hash, not plaintext
  TC-SEC-002: JWT uses HS256 algorithm
  TC-REP-001: Clinical report requires authentication
"""

import base64
import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


# ── TC-SEC-001 ────────────────────────────────────────────────────────────────

def test_password_stored_as_bcrypt_hash(setup_test_db):
    """
    TC-SEC-001: Password is stored as bcrypt hash, not plaintext.

    Queries the test database directly for the test clinician record and
    verifies that:
      - hashed_password starts with '$2b$' (bcrypt prefix)
      - hashed_password does NOT equal the plaintext 'test_password'
    """
    import os
    import sys

    _PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _PROJECT_ROOT not in sys.path:
        sys.path.insert(0, _PROJECT_ROOT)

    import models
    from database import Base

    TEST_DB_URL = "sqlite:///./test_cogassess.db"
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        clinician = db.query(models.Clinician).filter_by(
            username="test_clinician"
        ).first()

        assert clinician is not None, (
            "test_clinician not found in test database — "
            "check that setup_test_db ran successfully"
        )

        hashed = clinician.hashed_password

        assert hashed.startswith("$2b$"), (
            f"Expected bcrypt hash starting with '$2b$', got: '{hashed[:10]}...'"
        )
        assert hashed != "test_password", (
            "Password is stored as plaintext — this is a critical security failure"
        )
    finally:
        db.close()
        engine.dispose()


# ── TC-SEC-002 ────────────────────────────────────────────────────────────────

def test_jwt_uses_hs256_algorithm(client):
    """
    TC-SEC-002: JWT uses HS256 algorithm.

    Logs in, splits the returned JWT, base64-decodes the header segment
    (no signature verification needed), parses it as JSON, and asserts
    that the 'alg' field is 'HS256'.
    """
    response = client.post(
        "/auth/login",
        data={"username": "test_clinician", "password": "test_password"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"

    token = response.json()["access_token"]
    parts = token.split(".")
    assert len(parts) == 3, "Token is not a valid JWT (expected 3 dot-separated parts)"

    # Decode header — the first segment
    header_b64 = parts[0]
    padding = 4 - len(header_b64) % 4
    if padding != 4:
        header_b64 += "=" * padding
    header_bytes = base64.urlsafe_b64decode(header_b64)
    header = json.loads(header_bytes)

    assert "alg" in header, f"JWT header is missing 'alg' field: {header}"
    assert header["alg"] == "HS256", (
        f"Expected JWT algorithm 'HS256', got '{header['alg']}'"
    )


# ── TC-REP-001 ────────────────────────────────────────────────────────────────

def test_clinical_report_requires_authentication(client, test_assessment_key):
    """
    TC-REP-001: Clinical report requires authentication.

    Verifies that GET /assessments/{key} returns 401 when no Authorization
    header is provided, and also when an expired or invalid token is sent.
    """
    key = test_assessment_key

    # Request with no Authorization header
    response_no_auth = client.get(f"/assessments/{key}")
    assert response_no_auth.status_code == 401, (
        f"Expected 401 for unauthenticated GET /assessments/{key}, "
        f"got {response_no_auth.status_code}"
    )

    # Request with a syntactically valid but cryptographically invalid token
    fake_token = (
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"   # header
        ".eyJzdWIiOiJmYWtlX3VzZXIiLCJleHAiOjE2MDAwMDAwMDB9"  # payload (expired)
        ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"       # fake signature
    )
    response_bad_token = client.get(
        f"/assessments/{key}",
        headers={"Authorization": f"Bearer {fake_token}"},
    )
    assert response_bad_token.status_code == 401, (
        f"Expected 401 for invalid/expired token on GET /assessments/{key}, "
        f"got {response_bad_token.status_code}"
    )

    # Also verify the list endpoint behaves the same way
    response_list_no_auth = client.get("/assessments")
    assert response_list_no_auth.status_code == 401, (
        f"Expected 401 for unauthenticated GET /assessments, "
        f"got {response_list_no_auth.status_code}"
    )
