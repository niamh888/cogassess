"""
test_findings.py — Clinical findings persistence and audit trail tests.

Test cases:
  TC-FIND-001: Clinical findings are persisted to the database
  TC-FIND-002: Internal notes are accessible to clinicians but not exposed on
               patient-facing surfaces (frontend check is marked MANUAL)
  TC-SAF-001:  Amendment requires change_reason; audit trail records every save
  TC-SAF-002:  Temporary audio file is deleted after pipeline  [SKIP — GCP]
  TC-SAF-003:  Empty transcript guard triggers before any scoring occurs  [SKIP — GCP]
"""

import pytest

from datetime import date


def _post_findings(client, auth_headers, assessment_key, **kwargs):
    """Helper: PUT /assessments/{key}/findings with given payload."""
    payload = {"clinical_outcome": "no_issue", **kwargs}
    return client.put(
        f"/assessments/{assessment_key}/findings",
        json=payload,
        headers=auth_headers,
    )


# ── TC-FIND-001 ───────────────────────────────────────────────────────────────

def test_clinical_findings_are_persisted(client, auth_headers, test_assessment_key):
    """
    TC-FIND-001: Clinical findings are persisted to the database.

    Steps:
      1. PUT /assessments/{key}/findings with clinical_outcome and patient_summary
      2. Assert 200 and that the response contains 'findings_recorded_at'
      3. GET /assessments/{key} and verify the stored values match what was saved
    """
    key = test_assessment_key

    put_response = _post_findings(
        client, auth_headers, key,
        clinical_outcome="no_issue",
        patient_summary="All good",
    )
    assert put_response.status_code == 200, (
        f"Expected 200 saving findings, got {put_response.status_code}: {put_response.text}"
    )

    put_body = put_response.json()
    assert "findings_recorded_at" in put_body, (
        f"Response missing 'findings_recorded_at': {put_body}"
    )
    assert put_body["findings_recorded_at"] is not None, (
        "findings_recorded_at should not be None after saving"
    )

    # Verify round-trip persistence
    get_response = client.get(f"/assessments/{key}", headers=auth_headers)
    assert get_response.status_code == 200

    body = get_response.json()
    assert body.get("clinical_outcome") == "no_issue", (
        f"clinical_outcome mismatch: expected 'no_issue', got '{body.get('clinical_outcome')}'"
    )
    assert body.get("patient_summary") == "All good", (
        f"patient_summary mismatch: expected 'All good', got '{body.get('patient_summary')}'"
    )
    assert body.get("findings_recorded_at") is not None, (
        "findings_recorded_at is None after confirmed save"
    )


# ── TC-FIND-002 ───────────────────────────────────────────────────────────────

def test_internal_notes_present_for_clinicians(client, auth_headers, test_assessment_key):
    """
    TC-FIND-002: Internal notes are not present on the patient summary endpoint data.

    API check (automated):
      - PUT findings with a clinical_notes_findings value
      - GET /assessments/{key} as a clinician → clinical_notes_findings SHOULD be present
        (clinicians are entitled to see their own notes via the secure endpoint)

    Frontend check (MANUAL):
      - The PatientSummaryPage React component must not render or transmit
        clinical_notes_findings to the patient-facing view.
      - Verify by inspecting the PatientSummaryPage component props and network
        responses on the /summary route — it should not include this field.
      STATUS: MANUAL — not automated here.
    """
    key = test_assessment_key
    secret_note = "Secret internal note — not for patient"

    put_response = _post_findings(
        client, auth_headers, key,
        clinical_notes_findings=secret_note,
        patient_summary="You are doing well.",
    )
    assert put_response.status_code == 200, (
        f"Expected 200 saving findings with internal notes, "
        f"got {put_response.status_code}: {put_response.text}"
    )

    get_response = client.get(f"/assessments/{key}", headers=auth_headers)
    assert get_response.status_code == 200

    body = get_response.json()
    # Clinicians CAN see clinical_notes_findings via the authenticated GET endpoint
    assert "clinical_notes_findings" in body, (
        "clinical_notes_findings should be present in the authenticated assessment response"
    )
    assert body["clinical_notes_findings"] == secret_note, (
        f"clinical_notes_findings stored incorrectly: "
        f"expected '{secret_note}', got '{body['clinical_notes_findings']}'"
    )


# ── TC-FIND-AUDIT ─────────────────────────────────────────────────────────────

def test_amendment_requires_change_reason(client, auth_headers, test_assessment_key):
    """
    TC-SAF-001: Amendment requires change_reason; initial save does not.

    Steps:
      1. First PUT (initial save) without change_reason → expect 200
      2. Second PUT (amendment) without change_reason → expect 400
      3. Third PUT (amendment) with change_reason → expect 200
      4. GET /assessments/{key}/findings/history → assert 2 entries,
         first action='initial', second action='amendment'
    """
    key = test_assessment_key

    # Step 1 — initial save, no change_reason required
    initial_response = _post_findings(
        client, auth_headers, key,
        clinical_outcome="monitor",
        patient_summary="Initial clinical note.",
    )
    assert initial_response.status_code == 200, (
        f"Initial findings save failed: {initial_response.status_code} {initial_response.text}"
    )
    assert initial_response.json().get("action") == "initial", (
        f"Expected action='initial' on first save, got: {initial_response.json()}"
    )

    # Step 2 — amendment without change_reason → must be rejected
    bad_amendment_response = _post_findings(
        client, auth_headers, key,
        clinical_outcome="no_issue",
        patient_summary="Updated note — no reason given.",
        # No change_reason
    )
    assert bad_amendment_response.status_code == 400, (
        f"Expected 400 for amendment without change_reason, "
        f"got {bad_amendment_response.status_code}: {bad_amendment_response.text}"
    )

    # Step 3 — amendment with change_reason → must succeed
    good_amendment_response = _post_findings(
        client, auth_headers, key,
        clinical_outcome="no_issue",
        patient_summary="Corrected note after further review.",
        change_reason="Test correction — score recalculated after audio review",
    )
    assert good_amendment_response.status_code == 200, (
        f"Expected 200 for amendment with change_reason, "
        f"got {good_amendment_response.status_code}: {good_amendment_response.text}"
    )
    assert good_amendment_response.json().get("action") == "amendment", (
        f"Expected action='amendment' on second save, got: {good_amendment_response.json()}"
    )

    # Step 4 — verify audit trail
    history_response = client.get(
        f"/assessments/{key}/findings/history",
        headers=auth_headers,
    )
    assert history_response.status_code == 200, (
        f"Expected 200 for GET /findings/history, "
        f"got {history_response.status_code}: {history_response.text}"
    )

    history = history_response.json()
    assert len(history) == 2, (
        f"Expected 2 audit entries (initial + amendment), got {len(history)}: {history}"
    )
    assert history[0]["action"] == "initial", (
        f"First history entry should be 'initial', got '{history[0]['action']}'"
    )
    assert history[1]["action"] == "amendment", (
        f"Second history entry should be 'amendment', got '{history[1]['action']}'"
    )


# ── TC-SAF-002 ────────────────────────────────────────────────────────────────

@pytest.mark.gcp
@pytest.mark.skip(
    reason="Requires a real pipeline run — the temp .wav file only exists when "
           "actual audio is processed via ffmpeg and GCP STT. This overlaps with "
           "TC-SEC-003 and should be verified together. Remove this skip once "
           "GCP credentials are available in the test environment."
)
def test_temp_file_deleted_after_pipeline_safety(client, auth_headers, test_assessment_key):
    """
    TC-SAF-002: Temporary audio file is deleted after pipeline processing.

    Safety perspective: an undeleted audio file on disk constitutes a patient
    data residue risk under GDPR / data minimisation principles.

    Verifies that after a successful pipeline run, no temporary .wav files
    remain in the working directory or system temp folder.

    PREREQUISITE: GCP_PROJECT_ID set and valid Application Default Credentials.
    Remove @pytest.mark.skip once GCP credentials are available.
    """
    pass


# ── TC-SAF-003 ────────────────────────────────────────────────────────────────

@pytest.mark.gcp
@pytest.mark.skip(
    reason="Requires a real GCP call to confirm the guard fires before STT returns "
           "any result — the mocked version in TC-PIP-004 covers the code path but "
           "not the live integration. Remove this skip once GCP credentials are available."
)
def test_empty_transcript_guard_fires_before_scoring_live(client, auth_headers, test_assessment_key):
    """
    TC-SAF-003: Empty transcript guard triggers before any scoring occurs (live GCP).

    Complements TC-PIP-004 (mocked) by verifying the same behaviour against a
    real GCP STT call using a silent audio file — ensuring no scores are
    produced and no TaskResult row is written to the database.

    PREREQUISITE: GCP_PROJECT_ID set, Application Default Credentials, and a
    silent audio fixture at tests/fixtures/silent.wav.
    Remove @pytest.mark.skip once GCP credentials are available.
    """
    pass
