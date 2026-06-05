"""
conftest.py — CogAssess test fixtures.

Heavy ML dependencies (spaCy, librosa, sentence-transformers, transformers,
Google Cloud) are injected as stubs into sys.modules BEFORE main.py is imported
so that their module-level load calls never execute.
"""

import sys
import types
import importlib
import os
from unittest.mock import MagicMock

# ── Keep real numpy before anything else touches it ──────────────────────────
import numpy as _real_numpy  # noqa: F401  (must import first)

# ─────────────────────────────────────────────────────────────────────────────
# 1.  Build lightweight stub modules for every heavy dependency.
#     The stubs only need to satisfy the attribute accesses that occur at
#     module-level in main.py (spacy.load, SentenceTransformer(...),
#     hf_pipeline(...), librosa.load, soundfile, etc.).
# ─────────────────────────────────────────────────────────────────────────────

def _make_module(name: str) -> types.ModuleType:
    """Return a MagicMock registered as a module."""
    mod = MagicMock(spec=types.ModuleType)
    mod.__name__ = name
    mod.__spec__ = importlib.util.spec_from_loader(name, loader=None)
    return mod


# ── spaCy ─────────────────────────────────────────────────────────────────────
_spacy_mod = _make_module("spacy")
_fake_nlp = MagicMock()
_fake_nlp.return_value = MagicMock()   # _nlp(transcript) → doc
_spacy_mod.load = MagicMock(return_value=_fake_nlp)
sys.modules["spacy"] = _spacy_mod

# ── librosa ───────────────────────────────────────────────────────────────────
_librosa_mod = _make_module("librosa")
_librosa_effects = MagicMock()
_librosa_feature  = MagicMock()
_librosa_mod.effects = _librosa_effects
_librosa_mod.feature = _librosa_feature
sys.modules["librosa"] = _librosa_mod
sys.modules["librosa.effects"] = _librosa_effects
sys.modules["librosa.feature"]  = _librosa_feature

# ── soundfile ─────────────────────────────────────────────────────────────────
sys.modules["soundfile"] = _make_module("soundfile")

# ── sentence_transformers ─────────────────────────────────────────────────────
_st_mod = _make_module("sentence_transformers")
_fake_embedder = MagicMock()
_fake_embedder.encode = MagicMock(return_value=_real_numpy.zeros((2, 768)))
_st_mod.SentenceTransformer = MagicMock(return_value=_fake_embedder)
sys.modules["sentence_transformers"] = _st_mod

# ── sklearn ───────────────────────────────────────────────────────────────────
_sklearn_mod          = _make_module("sklearn")
_sklearn_metrics      = _make_module("sklearn.metrics")
_sklearn_pairwise     = _make_module("sklearn.metrics.pairwise")
_sklearn_pairwise.cosine_similarity = MagicMock(
    return_value=_real_numpy.array([[0.9]])
)
_sklearn_mod.metrics           = _sklearn_metrics
_sklearn_metrics.pairwise      = _sklearn_pairwise
sys.modules["sklearn"]                    = _sklearn_mod
sys.modules["sklearn.metrics"]            = _sklearn_metrics
sys.modules["sklearn.metrics.pairwise"]   = _sklearn_pairwise

# ── transformers ──────────────────────────────────────────────────────────────
_transformers_mod = _make_module("transformers")
_fake_emotion_pipeline = MagicMock()
# Return a realistic 7-emotion list for any call
_emotion_result = [
    [
        {"label": "neutral",  "score": 0.80},
        {"label": "joy",      "score": 0.05},
        {"label": "sadness",  "score": 0.05},
        {"label": "anger",    "score": 0.02},
        {"label": "fear",     "score": 0.02},
        {"label": "disgust",  "score": 0.01},
        {"label": "surprise", "score": 0.05},
    ]
]
_fake_emotion_pipeline.return_value = _emotion_result
_transformers_mod.pipeline = MagicMock(return_value=_fake_emotion_pipeline)
sys.modules["transformers"] = _transformers_mod

# ── Google Cloud ──────────────────────────────────────────────────────────────
_google_mod           = _make_module("google")
_google_cloud_mod     = _make_module("google.cloud")
_gcs_v2_mod           = _make_module("google.cloud.speech_v2")
_gcs_v2_types_mod     = _make_module("google.cloud.speech_v2.types")

# SpeechClient stub
_fake_speech_client = MagicMock()
_gcs_v2_mod.SpeechClient = MagicMock(return_value=_fake_speech_client)

# types stubs
_gcs_v2_types_mod.cloud_speech = MagicMock()
_gcs_v2_mod.types              = _gcs_v2_types_mod

_google_mod.cloud   = _google_cloud_mod
_google_cloud_mod.speech_v2        = _gcs_v2_mod
_google_cloud_mod.speech_v2.types  = _gcs_v2_types_mod

sys.modules["google"]                       = _google_mod
sys.modules["google.cloud"]                 = _google_cloud_mod
sys.modules["google.cloud.speech_v2"]       = _gcs_v2_mod
sys.modules["google.cloud.speech_v2.types"] = _gcs_v2_types_mod

# Also stub the cloud_speech submodule that main.py imports directly
_cloud_speech_mod = _make_module("google.cloud.speech_v2.types.cloud_speech")
sys.modules["google.cloud.speech_v2.types.cloud_speech"] = _cloud_speech_mod

# ─────────────────────────────────────────────────────────────────────────────
# 2.  NOW it is safe to import from the application.
# ─────────────────────────────────────────────────────────────────────────────
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

# Add project root to path so imports resolve correctly
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from database import Base, get_db  # noqa: E402
from main import app               # noqa: E402
from auth import hash_password     # noqa: E402
import models                      # noqa: E402

# ─────────────────────────────────────────────────────────────────────────────
# 3.  Test database — a separate SQLite file so the production DB is untouched.
# ─────────────────────────────────────────────────────────────────────────────
TEST_DB_URL  = "sqlite:///./test_cogassess.db"
_test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)


def _override_get_db():
    """FastAPI dependency override that uses the test SQLite database."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


# ─────────────────────────────────────────────────────────────────────────────
# Register custom markers so pytest does not warn about unknown marks
# ─────────────────────────────────────────────────────────────────────────────

def pytest_configure(config):
    config.addinivalue_line("markers", "browser: requires browser automation (e.g. Playwright)")
    config.addinivalue_line("markers", "gcp: requires live Google Cloud Chirp STT connection")
    config.addinivalue_line("markers", "deployment: requires production HTTPS deployment")
    config.addinivalue_line("markers", "multi_user: requires a second clinician account fixture")


# ─────────────────────────────────────────────────────────────────────────────
# 4.  Session-scoped fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def setup_test_db():
    """Create all tables, seed a test clinician, yield, then tear down."""
    Base.metadata.create_all(bind=_test_engine)

    db = TestSessionLocal()
    try:
        # Only create if not already present (guards against re-entry in edge cases)
        if not db.query(models.Clinician).filter_by(username="test_clinician").first():
            clinician = models.Clinician(
                username="test_clinician",
                hashed_password=hash_password("test_password"),
                full_name="Test Clinician",
            )
            db.add(clinician)
            db.commit()
    finally:
        db.close()

    yield

    # Teardown
    Base.metadata.drop_all(bind=_test_engine)
    _test_engine.dispose()
    db_path = os.path.join(_PROJECT_ROOT, "test_cogassess.db")
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture(scope="session")
def client(setup_test_db):
    """Session-scoped TestClient."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth_headers(client):
    """Log in as test_clinician and return the Authorization header dict."""
    response = client.post(
        "/auth/login",
        data={"username": "test_clinician", "password": "test_password"},
    )
    assert response.status_code == 200, (
        f"Login failed during fixture setup: {response.status_code} {response.text}"
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def test_patient(client, auth_headers):
    """Create a reusable test patient and return the patient_ref string."""
    patient_ref = "TEST-P001"
    # Attempt creation; if it already exists (e.g. parallel test runs) that's fine.
    response = client.post(
        "/patients",
        json={"patient_ref": patient_ref, "l1_language": "English"},
        headers=auth_headers,
    )
    # 201 = created, 400 = already exists — both are acceptable here
    assert response.status_code in (201, 400), (
        f"Unexpected status creating test patient: {response.status_code} {response.text}"
    )
    return patient_ref


@pytest.fixture(scope="function")
def test_assessment_key(client, auth_headers, test_patient):
    """
    Create a fresh assessment for TEST-P001 and return the assessment_key string.
    Function-scoped so each test that needs it gets an isolated assessment.
    """
    from datetime import date
    response = client.post(
        "/assessments",
        json={
            "patient_ref": test_patient,
            "date_of_assessment": str(date.today()),
            "selected_tasks": ["routine", "fluency", "memory"],
        },
        headers=auth_headers,
    )
    assert response.status_code == 201, (
        f"Failed to create test assessment: {response.status_code} {response.text}"
    )
    return response.json()["assessment_key"]
