"""
test_patients.py — Patient record tests for CogAssess.

Test cases:
  TC-PAT-001: Patient record uses pseudonymised reference, no name field stored
  TC-PAT-002: Age band is auto-calculated from date of birth in the UI  [SKIP — browser]
  TC-PAT-003: Non-English L1 language stored correctly
"""

import pytest


# ── TC-PAT-001 ────────────────────────────────────────────────────────────────

def test_patient_uses_pseudonymised_ref_no_name_field(client, auth_headers):
    """
    TC-PAT-001: Patient record uses pseudonymised reference, no name field stored.

    Creates a patient using only a pseudonymous reference (no real name).
    Asserts:
      - POST /patients returns 201
      - Response body contains 'patient_ref'
      - Response body does NOT contain a top-level 'name' key
      - GET /patients/{ref} also returns no 'name' key in the response
    """
    patient_ref = "TEST-P002"

    # Create patient — no name field submitted
    create_response = client.post(
        "/patients",
        json={"patient_ref": patient_ref},
        headers=auth_headers,
    )
    # Accept 201 (created) or 400 (already exists from a previous run)
    if create_response.status_code == 400:
        # Patient already in DB from a previous test run — that's fine for this test
        pass
    else:
        assert create_response.status_code == 201, (
            f"Expected 201 creating patient, got {create_response.status_code}: "
            f"{create_response.text}"
        )
        body = create_response.json()
        assert "patient_ref" in body, "Response missing 'patient_ref' field"
        assert body["patient_ref"] == patient_ref

        # No top-level 'name' key should exist (clinician_name in assessments is OK,
        # but the patient record itself must not contain the patient's real name)
        assert "name" not in body, (
            f"Patient record must not contain a 'name' field — found it: {body}"
        )

    # Retrieve the patient and verify no 'name' key
    get_response = client.get(f"/patients/{patient_ref}", headers=auth_headers)
    assert get_response.status_code == 200, (
        f"Expected 200 for GET /patients/{patient_ref}, got {get_response.status_code}"
    )
    get_body = get_response.json()
    assert "patient_ref" in get_body, "GET response missing 'patient_ref'"
    assert "name" not in get_body, (
        f"GET /patients response must not expose a 'name' field — found: {get_body}"
    )


# ── TC-PAT-003 ────────────────────────────────────────────────────────────────

def test_non_english_l1_language_stored_correctly(client, auth_headers):
    """
    TC-PAT-003: Non-English L1 language stored correctly.

    Creates a patient with l1_language='Irish', then retrieves the full
    patient list and verifies the stored value matches.
    """
    patient_ref = "TEST-P-IRISH-001"

    create_response = client.post(
        "/patients",
        json={"patient_ref": patient_ref, "l1_language": "Irish"},
        headers=auth_headers,
    )
    # 201 = created, 400 = already exists from a prior run
    assert create_response.status_code in (201, 400), (
        f"Unexpected status creating Irish L1 patient: {create_response.status_code} "
        f"{create_response.text}"
    )

    # Retrieve the patient directly to verify l1_language
    get_response = client.get(f"/patients/{patient_ref}", headers=auth_headers)
    assert get_response.status_code == 200, (
        f"Expected 200 retrieving patient {patient_ref}, got {get_response.status_code}"
    )
    patient_data = get_response.json()
    assert patient_data.get("l1_language") == "Irish", (
        f"Expected l1_language='Irish', got '{patient_data.get('l1_language')}'"
    )

    # Also verify via the list endpoint
    list_response = client.get("/patients", headers=auth_headers)
    assert list_response.status_code == 200

    patients = list_response.json()
    matching = [p for p in patients if p["patient_ref"] == patient_ref]
    assert len(matching) == 1, (
        f"Expected exactly one patient with ref {patient_ref} in list, "
        f"found {len(matching)}"
    )
    assert matching[0]["l1_language"] == "Irish", (
        f"l1_language in list response is '{matching[0]['l1_language']}', expected 'Irish'"
    )


# ── TC-PAT-002 ────────────────────────────────────────────────────────────────

@pytest.mark.browser
@pytest.mark.skip(
    reason="Requires browser automation — age band auto-calculation is a frontend "
           "behaviour triggered by the date-of-birth picker in IntakePage.jsx. "
           "Prerequisite: configure Playwright E2E tests and remove this skip."
)
def test_age_band_auto_calculated_from_date_of_birth():
    """
    TC-PAT-002: Age band is auto-calculated from date of birth in the UI.

    Verifies that entering a date of birth in the intake form automatically
    populates the age band field with the correct decade band (e.g. '55-64').

    PREREQUISITE: Playwright E2E test framework.
    Remove @pytest.mark.skip once browser automation is configured.
    """
    pass
