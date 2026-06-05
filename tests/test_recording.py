"""
test_recording.py — Browser-side recording tests for CogAssess.

Test cases:
  TC-REC-001: Audio recording is captured in the browser via MediaRecorder  [SKIP — browser]
  TC-REC-002: Real-time waveform is displayed during recording              [SKIP — browser]

Both tests require a browser automation framework (e.g. Playwright).
Remove @pytest.mark.skip decorators once Playwright E2E tests are configured.
"""

import pytest


# ── TC-REC-001 ────────────────────────────────────────────────────────────────

@pytest.mark.browser
@pytest.mark.skip(
    reason="Requires browser automation (Playwright) — MediaRecorder API is not "
           "accessible from pytest. Prerequisite: install playwright, configure "
           "a browser fixture, and point it at http://localhost:5173. "
           "Remove this skip once E2E tests are set up."
)
def test_audio_recording_captured_in_browser():
    """
    TC-REC-001: Audio recording is captured in the browser via MediaRecorder.

    Navigates to the patient recording screen (/assessment/{key}/record),
    grants microphone permission, starts a recording, speaks for 5 seconds,
    stops the recording, and verifies that:
      - The audio blob is non-empty
      - The POST to /assessments/{key}/tasks/{index} returns 200 or 422
        (422 is acceptable for silence; the point is that the request is made)

    PREREQUISITE: Playwright E2E test framework.
    Remove @pytest.mark.skip once browser automation is configured.
    """
    pass


# ── TC-REC-002 ────────────────────────────────────────────────────────────────

@pytest.mark.browser
@pytest.mark.skip(
    reason="Requires browser automation (Playwright) — waveform rendering is a "
           "canvas/SVG element that can only be verified in a real browser context. "
           "Prerequisite: Playwright fixture pointing at http://localhost:5173. "
           "Remove this skip once E2E tests are set up."
)
def test_waveform_displayed_during_recording():
    """
    TC-REC-002: Real-time waveform is displayed during recording.

    Navigates to the patient recording screen, starts a recording, and verifies
    that the RecordingWave component is visible and animating (canvas or SVG
    element has non-zero dimensions and is updating).

    PREREQUISITE: Playwright E2E test framework.
    Remove @pytest.mark.skip once browser automation is configured.
    """
    pass
