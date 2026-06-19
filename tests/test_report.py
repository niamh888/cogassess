"""
test_report.py — Clinical report API contract and PDF/print feature tests.

Test cases:
  TC-RPT-001: GET /assessments/{key} returns all fields required to render the clinical report PDF
  TC-RPT-002: Report endpoint includes clinical findings fields once findings have been recorded
  TC-RPT-003: Clinical report page renders a 'Print / Save as PDF' button          [SKIP — browser]
  TC-RPT-004: Dashboard printer icon is present for complete assessments            [SKIP — browser]
"""

import pytest


# ── TC-RPT-001 ────────────────────────────────────────────────────────────────

def test_report_endpoint_returns_pdf_essential_fields(client, auth_headers, test_assessment_key):
    """
    TC-RPT-001: GET /assessments/{key} returns all fields required to render the
    clinical report PDF.

    The 'Print / Save as PDF' button on ReportPage.jsx calls window.print() over
    the existing GET /assessments/{key} response. This test verifies that the API
    response contract includes every field the report template consumes:

      - assessment_ref   — PDF letterhead identifier
      - patient          — nested object with patient_ref (pseudonymised ref)
      - clinician_name   — PDF letterhead
      - date_of_assessment — PDF letterhead
      - assessment_type  — displayed in report header
      - task_results     — list (may be empty for a fresh assessment)
      - l1_language      — session conditions section
      - environment      — session conditions section

    A missing field would produce a blank or broken PDF. This test catches any
    API schema regression introduced alongside the print feature.
    """
    key = test_assessment_key
    r = client.get(f"/assessments/{key}", headers=auth_headers)
    assert r.status_code == 200, (
        f"TC-RPT-001: Expected 200 from GET /assessments/{key}, "
        f"got {r.status_code}: {r.text[:300]}"
    )

    body = r.json()

    required_fields = [
        "assessment_ref",
        "patient",
        "clinician_name",
        "date_of_assessment",
        "assessment_type",
        "task_results",
        "l1_language",
        "environment",
    ]
    missing = [f for f in required_fields if f not in body]
    assert not missing, (
        f"TC-RPT-001 FAILED: GET /assessments/{key} response is missing "
        f"PDF-essential field(s): {missing}\n"
        f"Keys present: {list(body.keys())}"
    )

    # patient must be a dict with patient_ref
    patient = body.get("patient")
    assert isinstance(patient, dict), (
        f"TC-RPT-001: 'patient' field should be a dict, got {type(patient)}"
    )
    assert "patient_ref" in patient, (
        f"TC-RPT-001: 'patient.patient_ref' is missing. patient keys: {list(patient.keys())}"
    )

    # task_results must be a list
    assert isinstance(body["task_results"], list), (
        f"TC-RPT-001: 'task_results' should be a list, got {type(body['task_results'])}"
    )


# ── TC-RPT-002 ────────────────────────────────────────────────────────────────

def test_report_includes_findings_fields_after_save(client, auth_headers, test_assessment_key):
    """
    TC-RPT-002: GET /assessments/{key} includes clinical findings fields once
    findings have been recorded.

    The ReportPage PDF print includes a 'Findings recorded' date and the
    clinical outcome in the header area. These fields must be present and
    correctly populated after a PUT /assessments/{key}/findings call.

    Steps:
      1. PUT findings with a clinical_outcome of 'monitor'
      2. GET /assessments/{key} and verify findings fields are present:
           - clinical_outcome  (set to 'monitor')
           - findings_recorded_at  (non-None ISO timestamp)
           - patient_summary  (the clinician-written summary text)
    """
    key = test_assessment_key

    # Record findings
    put_r = client.put(
        f"/assessments/{key}/findings",
        json={
            "clinical_outcome": "monitor",
            "follow_up_months": 6,
            "patient_summary": "Speech biomarkers within expected range. Review in 6 months.",
        },
        headers=auth_headers,
    )
    assert put_r.status_code == 200, (
        f"TC-RPT-002: PUT /assessments/{key}/findings failed — "
        f"{put_r.status_code}: {put_r.text[:300]}"
    )

    # Verify GET returns those fields
    get_r = client.get(f"/assessments/{key}", headers=auth_headers)
    assert get_r.status_code == 200
    body = get_r.json()

    assert body.get("clinical_outcome") == "monitor", (
        f"TC-RPT-002: clinical_outcome should be 'monitor', got '{body.get('clinical_outcome')}'"
    )
    assert body.get("findings_recorded_at") is not None, (
        "TC-RPT-002: findings_recorded_at should be set after saving findings, got None"
    )
    assert body.get("patient_summary") == (
        "Speech biomarkers within expected range. Review in 6 months."
    ), (
        f"TC-RPT-002: patient_summary mismatch: '{body.get('patient_summary')}'"
    )


# ── TC-RPT-003 ────────────────────────────────────────────────────────────────

@pytest.mark.browser
@pytest.mark.skip(
    reason="Requires browser automation (Playwright) — verifying that the "
           "'Print / Save as PDF' button is rendered in ReportPage.jsx requires "
           "a real browser DOM. Prerequisite: Playwright fixture pointing at "
           "http://localhost:5173. Remove this skip once E2E tests are configured."
)
def test_clinical_report_page_has_print_button():
    """
    TC-RPT-003: Clinical report page renders a 'Print / Save as PDF' button.

    Navigates to /assessment/{key}/report and verifies:
      - A button with text 'Print / Save as PDF' is present in the DOM
      - The button has class 'no-print' (so it does not appear in the printed PDF)
      - Clicking the button triggers window.print() (spy on window.print)

    PREREQUISITE: Playwright E2E test framework and a completed assessment.
    Remove @pytest.mark.skip once browser automation is configured.
    """
    pass


# ── TC-RPT-004 ────────────────────────────────────────────────────────────────

@pytest.mark.browser
@pytest.mark.skip(
    reason="Requires browser automation (Playwright) — verifying that the printer "
           "icon SVG link is rendered in DashboardPage.jsx for complete assessments "
           "requires a real browser DOM. Prerequisite: Playwright fixture pointing at "
           "http://localhost:5173. Remove this skip once E2E tests are configured."
)
def test_dashboard_printer_icon_present_for_complete_assessments():
    """
    TC-RPT-004: Dashboard shows a printer icon for complete assessments.

    Navigates to /dashboard and, for each assessment row with status 'complete',
    verifies:
      - A link element with title 'Print / Download PDF' is present in the row
      - The link's href contains '?print=1'
      - The link contains an SVG printer icon

    Also verifies that incomplete ('in_progress') rows do NOT show the icon.

    PREREQUISITE: Playwright E2E test framework with at least one complete assessment.
    Remove @pytest.mark.skip once browser automation is configured.
    """
    pass
