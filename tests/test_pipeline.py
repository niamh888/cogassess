"""
test_pipeline.py — Pipeline integration tests for CogAssess.

Test cases:
  TC-PIP-001: STT returns a non-empty transcript for a valid audio sample  [SKIP — GCP]
  TC-PIP-002: Composite score is a float between 0 and 100
  TC-PIP-003: Morphology analysis returns expected keys for a valid transcript  [SKIP — GCP]
  TC-PIP-004: Empty transcript raises 422, not silent pass with zero scores
"""

import pytest

import io
from unittest.mock import patch, MagicMock
from datetime import date


# ── Realistic mock data ───────────────────────────────────────────────────────

_TRANSCRIPT_20W = (
    "I usually start my morning by making a cup of tea and then I like to "
    "read the newspaper before the day begins properly"
)

_ACOUSTIC_REALISTIC = {
    "speech_rate_syllables_per_sec": 3.5,
    "pause_count": 2,
    "mean_pause_duration_ms": 450.0,
    "total_pause_duration_sec": 0.9,
    "pitch_mean_hz": 180.0,
    "pitch_std_hz": 25.0,
    "hnr_db": 8.5,
    "articulation_rate": 3.5,
}

_MORPHOLOGY_REALISTIC = {
    "noun_ratio": 0.35,
    "verb_ratio": 0.25,
    "first_person_ratio": 0.6,
    "third_person_ratio": 0.1,
    "type_token_ratio": 0.75,
    "disfluency_count": 1,
    "word_count": 22,
    "unique_words": 19,
}

_SEMANTICS_REALISTIC = {
    "semantic_variability": 0.02,
    "high_frequency_word_ratio": 0.35,
    "semantic_granularity_score": 0.65,
    "topic_coherence": 0.85,
}

_EMOTION_REALISTIC = {
    "joy": 0.05,
    "sadness": 0.05,
    "anger": 0.02,
    "fear": 0.02,
    "disgust": 0.01,
    "surprise": 0.05,
    "neutral": 0.80,
    "dominant_emotion": "neutral",
    "valence": "neutral",
}

_STT_EMPTY = {
    "transcript": "",
    "words_per_minute": 0,
    "confidence": 0.0,
    "model": "chirp",
}

_STT_REAL = {
    "transcript": _TRANSCRIPT_20W,
    "words_per_minute": 22,
    "confidence": 0.97,
    "model": "chirp",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _fake_audio_file():
    """Return a minimal in-memory fake audio file (bytes)."""
    return io.BytesIO(b"FAKE_AUDIO_DATA")


def _submit_task(client, auth_headers, assessment_key):
    """
    POST a fake audio file to /assessments/{key}/tasks/0.
    Returns the raw response object.
    """
    audio_bytes = _fake_audio_file()
    return client.post(
        f"/assessments/{assessment_key}/tasks/0",
        params={"task_id": "routine"},
        files={"audio": ("test.wav", audio_bytes, "audio/wav")},
        headers=auth_headers,
    )


# ── TC-PIP-004 ────────────────────────────────────────────────────────────────

def test_empty_transcript_raises_422(client, auth_headers, test_assessment_key):
    """
    TC-PIP-004: Empty transcript raises 422, not silent pass with zero scores.

    Mocks transcribe_audio to return an empty transcript (simulating silence).
    Also mocks _to_wav and extract_acoustic_features to prevent real I/O.
    Asserts:
      - Response status is 422
      - Response detail mentions 'No speech detected' (case-insensitive)
    """
    key = test_assessment_key

    with patch("main.transcribe_audio", return_value=_STT_EMPTY) as _mock_stt, \
         patch("main._to_wav", return_value="/tmp/fake.wav") as _mock_wav, \
         patch("main.extract_acoustic_features", return_value=_ACOUSTIC_REALISTIC) as _mock_acx, \
         patch("os.unlink") as _mock_unlink:

        response = _submit_task(client, auth_headers, key)

    assert response.status_code == 422, (
        f"Expected 422 for empty transcript, got {response.status_code}: {response.text}"
    )

    detail = response.json().get("detail", "")
    assert "no speech detected" in detail.lower(), (
        f"Expected 'No speech detected' in error detail, got: '{detail}'"
    )


# ── TC-PIP-002 ────────────────────────────────────────────────────────────────

def test_composite_score_is_float_between_0_and_100(client, auth_headers, test_assessment_key):
    """
    TC-PIP-002: Composite score is a float between 0 and 100.

    Mocks all five pipeline stages to return realistic values and posts a fake
    audio file.  Asserts:
      - Response status is 200
      - scores['composite'] is a float and 0 <= composite <= 100
      - All four domain scores (motor_speech, semantic_memory, episodic_memory,
        emotional_processing) are in the range [0, 100]
    """
    key = test_assessment_key

    with patch("main.transcribe_audio", return_value=_STT_REAL), \
         patch("main._to_wav", return_value="/tmp/fake.wav"), \
         patch("main.extract_acoustic_features", return_value=_ACOUSTIC_REALISTIC), \
         patch("main.analyse_morphology", return_value=_MORPHOLOGY_REALISTIC), \
         patch("main.analyse_semantics", return_value=_SEMANTICS_REALISTIC), \
         patch("main.analyse_emotion", return_value=_EMOTION_REALISTIC), \
         patch("os.unlink"):

        response = _submit_task(client, auth_headers, key)

    assert response.status_code == 200, (
        f"Expected 200 for valid pipeline run, got {response.status_code}: {response.text}"
    )

    body = response.json()
    assert "scores" in body, f"Response missing 'scores': {body.keys()}"

    scores = body["scores"]

    # Composite score
    assert "composite" in scores, f"'composite' missing from scores: {scores}"
    composite = scores["composite"]
    assert isinstance(composite, (int, float)), (
        f"composite score should be a number, got {type(composite).__name__}: {composite}"
    )
    assert 0 <= composite <= 100, (
        f"composite score {composite} is outside the [0, 100] range"
    )

    # Domain scores
    domain_keys = ["motor_speech", "semantic_memory", "episodic_memory", "emotional_processing"]
    for domain in domain_keys:
        assert domain in scores, f"Domain score '{domain}' missing from scores: {scores}"
        domain_score = scores[domain]
        assert isinstance(domain_score, (int, float)), (
            f"Domain score '{domain}' should be a number, got {type(domain_score).__name__}"
        )
        assert 0 <= domain_score <= 100, (
            f"Domain score '{domain}' = {domain_score} is outside [0, 100]"
        )


# ── TC-PIP-001 ────────────────────────────────────────────────────────────────

@pytest.mark.gcp
@pytest.mark.skip(
    reason="Requires live GCP Chirp STT — set GCP_PROJECT_ID environment variable "
           "and provide a real .wav audio file. Remove this skip to run against GCP."
)
def test_stt_returns_non_empty_transcript_for_valid_audio(client, auth_headers, test_assessment_key):
    """
    TC-PIP-001: STT returns a non-empty transcript for a valid audio sample.

    Posts a real speech audio file to the pipeline endpoint and verifies that
    Google Chirp STT returns a transcript of at least 5 words.

    PREREQUISITE: GCP_PROJECT_ID set, valid Application Default Credentials,
    and a real audio file at tests/fixtures/sample_speech.wav.
    Remove @pytest.mark.skip once GCP credentials are available in the test environment.
    """
    pass


# ── TC-PIP-003 ────────────────────────────────────────────────────────────────

@pytest.mark.gcp
@pytest.mark.skip(
    reason="Requires live GCP Chirp STT to produce a real transcript for morphology "
           "analysis. Remove this skip once TC-PIP-001 is passing."
)
def test_morphology_analysis_returns_expected_keys(client, auth_headers, test_assessment_key):
    """
    TC-PIP-003: Morphology analysis returns expected keys for a valid transcript.

    Runs the full pipeline with a real audio file and verifies that the
    morphology stage returns: noun_ratio, verb_ratio, type_token_ratio,
    disfluency_count, word_count, unique_words.

    PREREQUISITE: GCP_PROJECT_ID set and valid Application Default Credentials.
    Remove @pytest.mark.skip once GCP credentials are available in the test environment.
    """
    pass
