"""
test_assessments.py — Assessment creation and retrieval tests for CogAssess.

Test cases:
  TC-ASS-001: Assessment creation generates a UUID key
  TC-ASS-002: Human-readable assessment reference follows CA-YYYY-NNNN format
  TC-ASS-003: Selected tasks stored and returned correctly
"""

import re
import uuid
from datetime import date


def _create_assessment(client, auth_headers, patient_ref, selected_tasks=None):
    """Helper: POST /assessments and return the full response."""
    payload = {
        "patient_ref": patient_ref,
        "date_of_assessment": str(date.today()),
    }
    if selected_tasks is not None:
        payload["selected_tasks"] = selected_tasks
    return client.post("/assessments", json=payload, headers=auth_headers)


# ── TC-ASS-001 ────────────────────────────────────────────────────────────────

def test_assessment_creation_generates_uuid_key(client, auth_headers, test_patient):
    """
    TC-ASS-001: Assessment creation generates a UUID key.

    Posts a new assessment for the test patient and checks:
      - HTTP 201 is returned
      - The response body contains 'assessment_key'
      - The key is a valid UUID4 string (36 characters, grouped as 8-4-4-4-12)
    """
    response = _create_assessment(client, auth_headers, test_patient)
    assert response.status_code == 201, (
        f"Expected 201 creating assessment, got {response.status_code}: {response.text}"
    )

    body = response.json()
    assert "assessment_key" in body, f"Response missing 'assessment_key': {body}"

    key = body["assessment_key"]
    # Must be parseable as a UUID
    try:
        parsed = uuid.UUID(key)
    except ValueError:
        raise AssertionError(
            f"assessment_key '{key}' is not a valid UUID"
        )

    # String representation must be 36 chars with hyphens in the correct places
    assert len(key) == 36, f"UUID string should be 36 chars, got {len(key)}: '{key}'"
    parts = key.split("-")
    assert len(parts) == 5, f"UUID should have 5 hyphen-separated groups, got: '{key}'"
    assert [len(p) for p in parts] == [8, 4, 4, 4, 12], (
        f"UUID group lengths should be [8,4,4,4,12], got {[len(p) for p in parts]}"
    )


# ── TC-ASS-002 ────────────────────────────────────────────────────────────────

def test_assessment_ref_follows_ca_yyyy_nnnn_format(client, auth_headers, test_patient):
    """
    TC-ASS-002: Human-readable assessment reference follows CA-YYYY-NNNN format.

    Posts a new assessment and verifies that the returned 'assessment_ref'
    field matches the regex pattern r'CA-\\d{4}-\\d{4}'.
    """
    response = _create_assessment(client, auth_headers, test_patient)
    assert response.status_code == 201, (
        f"Expected 201 creating assessment, got {response.status_code}: {response.text}"
    )

    body = response.json()
    assert "assessment_ref" in body, f"Response missing 'assessment_ref': {body}"

    ref = body["assessment_ref"]
    pattern = r"^CA-\d{4}-\d{4}$"
    assert re.match(pattern, ref), (
        f"assessment_ref '{ref}' does not match pattern '{pattern}'"
    )


# ── TC-ASS-003 ────────────────────────────────────────────────────────────────

def test_selected_tasks_stored_and_returned_correctly(client, auth_headers, test_patient):
    """
    TC-ASS-003: Selected tasks stored and returned correctly.

    Creates an assessment with selected_tasks=['routine','fluency'], then
    retrieves the assessment by its key and asserts the stored list matches
    exactly what was submitted.
    """
    tasks = ["routine", "fluency"]
    create_response = _create_assessment(
        client, auth_headers, test_patient, selected_tasks=tasks
    )
    assert create_response.status_code == 201, (
        f"Expected 201, got {create_response.status_code}: {create_response.text}"
    )

    key = create_response.json()["assessment_key"]

    get_response = client.get(f"/assessments/{key}", headers=auth_headers)
    assert get_response.status_code == 200, (
        f"Expected 200 for GET /assessments/{key}, got {get_response.status_code}"
    )

    body = get_response.json()
    assert "selected_tasks" in body, f"GET response missing 'selected_tasks': {body}"
    assert body["selected_tasks"] == tasks, (
        f"selected_tasks mismatch: expected {tasks}, got {body['selected_tasks']}"
    )
