"""
test_owasp.py — Penetration testing: OWASP API Security Top 10 (2023 edition).

Test cases:
  TC-OWA-001: BOLA — Clinician B cannot see Clinician A's assessments in list (API1)
  TC-OWA-002: BOLA — Clinician B cannot access Clinician A's assessment detail (API1)
  TC-OWA-003: JWT algorithm confusion ("alg: none") rejected (API2)
  TC-OWA-004: JWT payload tampering rejected (API2)
  TC-OWA-005: JWT wrong signature rejected (API2)
  TC-OWA-006: Error responses do not leak stack traces or DB internals (API3)
  TC-OWA-007: Mass assignment — unrecognised fields silently rejected (API3)
  TC-OWA-008: SQL injection payloads in patient_ref do not cause HTTP 5xx (API8)
  TC-OWA-009: Oversized payload does not cause HTTP 5xx (API4)
  TC-OWA-010: All protected endpoints return 401 without an auth token (API2)

Reference: OWASP API Security Top 10 2023
           https://owasp.org/API-Security/editions/2023/en/0x00-header/
"""

import base64
import json
from datetime import date

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# Module-scoped helpers
# ─────────────────────────────────────────────────────────────────────────────

def _raw_token(auth_headers: dict) -> str:
    """Extract the raw JWT string from an Authorization header dict."""
    return auth_headers["Authorization"].split(" ", 1)[1]


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures — second clinician and an assessment owned by clinician A
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def clinician_b_headers(client, auth_headers):
    """
    Register clinician_b (authenticated as clinician_a) and return their JWT headers.
    Registration is idempotent — a 400 (username already exists) is also acceptable.
    """
    client.post(
        "/clinicians",
        json={"username": "clinician_b", "password": "password_b", "full_name": "Clinician B"},
        headers=auth_headers,
    )
    r = client.post("/auth/login", data={"username": "clinician_b", "password": "password_b"})
    assert r.status_code == 200, f"clinician_b login failed: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def assessment_key_a(client, auth_headers, test_patient):
    """Create an assessment owned by clinician A and return its key."""
    r = client.post(
        "/assessments",
        json={
            "patient_ref": test_patient,
            "date_of_assessment": str(date.today()),
            "selected_tasks": ["routine"],
        },
        headers=auth_headers,
    )
    assert r.status_code == 201, f"Failed to create assessment for TC-OWA tests: {r.text}"
    return r.json()["assessment_key"]


# ─────────────────────────────────────────────────────────────────────────────
# TC-OWA-001: BOLA — Assessment list isolation
# ─────────────────────────────────────────────────────────────────────────────

def test_bola_assessment_list_isolated(client, clinician_b_headers, assessment_key_a):
    """
    TC-OWA-001: GET /assessments must return only the authenticated clinician's assessments.

    Clinician A creates an assessment. Clinician B calls GET /assessments and must
    receive an empty list — Clinician A's assessment key must not appear.

    OWASP API1:2023 — Broken Object Level Authorization
    """
    r = client.get("/assessments", headers=clinician_b_headers)
    assert r.status_code == 200, f"Unexpected status: {r.status_code}"

    visible_keys = [a["assessment_key"] for a in r.json()]
    assert assessment_key_a not in visible_keys, (
        f"TC-OWA-001 FAILED: BOLA — Clinician B can see Clinician A's assessment "
        f"({assessment_key_a}) in GET /assessments.\n"
        f"Fix: filter list_assessments query by clinician_id == clinician.id."
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-OWA-002: BOLA — Assessment detail isolation
# ─────────────────────────────────────────────────────────────────────────────

def test_bola_assessment_detail_blocked(client, clinician_b_headers, assessment_key_a):
    """
    TC-OWA-002: GET /assessments/{key} must return 404 when the assessment
    belongs to a different clinician.

    OWASP API1:2023 — Broken Object Level Authorization
    """
    r = client.get(f"/assessments/{assessment_key_a}", headers=clinician_b_headers)
    assert r.status_code in (403, 404), (
        f"TC-OWA-002 FAILED: BOLA — Clinician B received HTTP {r.status_code} "
        f"(expected 403 or 404) when accessing Clinician A's assessment "
        f"({assessment_key_a}) via GET /assessments/{{key}}.\n"
        f"Fix: add clinician_id ownership check in get_assessment."
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-OWA-003: JWT algorithm confusion ("alg: none")
# ─────────────────────────────────────────────────────────────────────────────

def test_jwt_algorithm_none_rejected(client):
    """
    TC-OWA-003: A JWT with alg:none and no signature must be rejected with HTTP 401.

    This validates the mitigation for CVE-2024-33663 (python-jose alg:none bypass).
    python-jose 3.5.0 rejects alg:none by default; this test confirms the
    server's JWT verification layer enforces this.

    OWASP API2:2023 — Broken Authentication
    """
    header = base64.urlsafe_b64encode(
        json.dumps({"alg": "none", "typ": "JWT"}).encode()
    ).rstrip(b"=").decode()
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": "test_clinician", "exp": 9_999_999_999}).encode()
    ).rstrip(b"=").decode()
    none_token = f"{header}.{payload}."

    r = client.get("/assessments", headers={"Authorization": f"Bearer {none_token}"})
    assert r.status_code == 401, (
        f"TC-OWA-003 FAILED: alg:none JWT accepted — HTTP {r.status_code}.\n"
        f"Server must reject tokens with alg:none (CVE-2024-33663 mitigation)."
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-OWA-004: JWT payload tampering
# ─────────────────────────────────────────────────────────────────────────────

def test_jwt_payload_tampering_rejected(client, auth_headers):
    """
    TC-OWA-004: A JWT whose payload has been modified (with original signature retained)
    must be rejected with HTTP 401.

    The HMAC-SHA256 signature covers both header and payload; any payload
    modification invalidates the signature.

    OWASP API2:2023 — Broken Authentication
    """
    parts = _raw_token(auth_headers).split(".")
    # Decode payload (add padding to satisfy base64 decoder)
    padding = "=" * (-len(parts[1]) % 4)
    payload_data = json.loads(base64.urlsafe_b64decode(parts[1] + padding))
    # Tamper: claim a different identity
    payload_data["sub"] = "attacker_username"
    tampered_payload = base64.urlsafe_b64encode(
        json.dumps(payload_data).encode()
    ).rstrip(b"=").decode()
    tampered_token = f"{parts[0]}.{tampered_payload}.{parts[2]}"

    r = client.get("/assessments", headers={"Authorization": f"Bearer {tampered_token}"})
    assert r.status_code == 401, (
        f"TC-OWA-004 FAILED: tampered JWT accepted — HTTP {r.status_code}.\n"
        f"Server must verify signature and reject payload tampering."
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-OWA-005: JWT wrong signature
# ─────────────────────────────────────────────────────────────────────────────

def test_jwt_wrong_signature_rejected(client, auth_headers):
    """
    TC-OWA-005: A JWT with a corrupted signature must be rejected with HTTP 401.

    OWASP API2:2023 — Broken Authentication
    """
    parts = _raw_token(auth_headers).split(".")
    corrupted_token = f"{parts[0]}.{parts[1]}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

    r = client.get("/assessments", headers={"Authorization": f"Bearer {corrupted_token}"})
    assert r.status_code == 401, (
        f"TC-OWA-005 FAILED: JWT with corrupted signature accepted — HTTP {r.status_code}."
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-OWA-006: Error response information disclosure
# ─────────────────────────────────────────────────────────────────────────────

def test_error_responses_do_not_leak_internals(client, auth_headers):
    """
    TC-OWA-006: HTTP error responses must not contain stack traces, file paths,
    SQLAlchemy class names, or database file names.

    OWASP API3:2023 — Broken Object Property Level Authorization /
    Excessive Data Exposure

    Checks two error types: 404 (not found) and 422 (validation error).
    """
    _FORBIDDEN_TERMS = ["traceback", "sqlalchemy", "sqlite", "cogassess.db", 'file "']

    # 404 — non-existent assessment key
    r404 = client.get("/assessments/does-not-exist-xyz-pen-test", headers=auth_headers)
    assert r404.status_code == 404
    body404 = r404.text.lower()
    leaked_404 = [t for t in _FORBIDDEN_TERMS if t in body404]
    assert not leaked_404, (
        f"TC-OWA-006 FAILED: HTTP 404 body contains internal details: {leaked_404}\n"
        f"Body: {r404.text[:300]}"
    )

    # 422 — missing required fields on /assessments (patient_ref + date_of_assessment required)
    # Note: POST /patients is not used here because patient_ref is auto-generated,
    # making an empty body valid. /assessments always requires patient_ref and date_of_assessment.
    r422 = client.post("/assessments", json={"not_a_real_field": True}, headers=auth_headers)
    assert r422.status_code == 422, (
        f"TC-OWA-006: expected 422 for missing required assessment fields, "
        f"got {r422.status_code}: {r422.text[:200]}"
    )
    body422 = r422.text.lower()
    leaked_422 = [t for t in _FORBIDDEN_TERMS if t in body422]
    assert not leaked_422, (
        f"TC-OWA-006 FAILED: HTTP 422 body contains internal details: {leaked_422}\n"
        f"Body: {r422.text[:300]}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-OWA-007: Mass assignment
# ─────────────────────────────────────────────────────────────────────────────

def test_mass_assignment_extra_fields_ignored(client, auth_headers):
    """
    TC-OWA-007: Extra fields posted alongside valid fields must be silently ignored
    by Pydantic schema validation — they must not be persisted or alter behaviour.

    Fields tested: clinician_id (foreign key), hashed_password, is_admin.

    OWASP API3:2023 — Broken Object Property Level Authorization
    """
    r = client.post(
        "/patients",
        json={
            "patient_ref": "TEST-MASS-OWA-001",
            "l1_language": "English",
            "clinician_id": 999,        # must be ignored — not a Patient field
            "hashed_password": "evil",  # must be ignored
            "is_admin": True,           # must be ignored
        },
        headers=auth_headers,
    )
    # Pydantic v2 with model_config extra="ignore" → 201 (extra fields silently dropped)
    # Pydantic v2 with extra="forbid" → 422
    # Either is acceptable; 500 is not.
    assert r.status_code in (201, 400, 422), (
        f"TC-OWA-007 FAILED: unexpected status {r.status_code} on mass-assignment request.\n"
        f"Response: {r.text[:300]}"
    )
    if r.status_code == 201:
        body = r.json()
        assert body.get("patient_ref") == "TEST-MASS-OWA-001"
        # Extra fields must not appear in the response
        assert "clinician_id" not in body or body.get("clinician_id") is None
        assert "hashed_password" not in body
        assert "is_admin" not in body


# ─────────────────────────────────────────────────────────────────────────────
# TC-OWA-008: SQL injection patterns
# ─────────────────────────────────────────────────────────────────────────────

_SQL_INJECTION_PAYLOADS = [
    "'; DROP TABLE patients; --",
    "' OR '1'='1",
    '" OR 1=1 --',
    "1; SELECT * FROM clinicians --",
    "\x00INJECTION",
]


@pytest.mark.parametrize("payload", _SQL_INJECTION_PAYLOADS)
def test_sql_injection_does_not_cause_server_error(client, auth_headers, payload):
    """
    TC-OWA-008: SQL injection payloads in the patient_ref field must never
    produce an HTTP 5xx response. SQLAlchemy ORM uses parameterised queries,
    so payloads should be treated as literal strings and either stored (201),
    rejected by validation (422), or rejected as duplicate (400).

    OWASP API8:2023 — Security Misconfiguration
    """
    r = client.post(
        "/patients",
        json={"patient_ref": payload, "l1_language": "English"},
        headers=auth_headers,
    )
    assert r.status_code < 500, (
        f"TC-OWA-008 FAILED: SQL injection payload caused HTTP {r.status_code}.\n"
        f"Payload: {payload!r}\nResponse: {r.text[:300]}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-OWA-009: Oversized payload
# ─────────────────────────────────────────────────────────────────────────────

def test_oversized_payload_rejected(client, auth_headers):
    """
    TC-OWA-009: A request body containing a 100 KB patient_ref string must not
    cause an HTTP 5xx response. The server should handle large inputs without
    crashing (accept, reject with 422/400, or enforce a size limit with 413).

    OWASP API4:2023 — Unrestricted Resource Consumption
    """
    r = client.post(
        "/patients",
        json={"patient_ref": "A" * 100_000, "l1_language": "English"},
        headers=auth_headers,
    )
    assert r.status_code < 500, (
        f"TC-OWA-009 FAILED: 100 KB patient_ref caused HTTP {r.status_code} server error.\n"
        f"Response: {r.text[:300]}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-OWA-010: All protected endpoints require authentication
# ─────────────────────────────────────────────────────────────────────────────

_PROTECTED_ENDPOINTS = [
    ("GET",  "/patients"),
    ("POST", "/patients"),
    ("GET",  "/patients/some-ref"),
    ("GET",  "/assessments"),
    ("POST", "/assessments"),
    ("GET",  "/assessments/some-key"),
    ("GET",  "/auth/me"),
    ("POST", "/clinicians"),
    ("PUT",  "/assessments/some-key/findings"),
    ("GET",  "/assessments/some-key/findings/history"),
]


@pytest.mark.parametrize("method,url", _PROTECTED_ENDPOINTS)
def test_protected_endpoints_require_authentication(client, method, url):
    """
    TC-OWA-010: Every protected API endpoint must return HTTP 401 when called
    without an Authorization header.

    OWASP API2:2023 — Broken Authentication
    """
    r = client.request(method, url)
    assert r.status_code == 401, (
        f"TC-OWA-010 FAILED: {method} {url} returned HTTP {r.status_code} "
        f"without an auth token (expected 401).\n"
        f"Response: {r.text[:200]}"
    )
