# CA-SRR-001 — Software Release Record

| Field | Value |
|---|---|
| Document ID | CA-SRR-001 |
| Title | Software Release Record |
| Project | CogAssess |
| Version | 1.0.0 |
| Release Date | 2026-06-29 |
| Author | Niamh St John Lynch |
| Organisation | MemoryTell Ltd / St John Lynch & Co. Ltd |
| IEC 62304 Class | Class B |
| Status | Released / Research Prototype |
| GitHub Repository | niamh888/cogassess |

---

## 1. Purpose

This Software Release Record (SRR) documents the formal release of CogAssess version 1.0.0 in accordance with IEC 62304:2006+AMD1:2015 §6.3 (Software release). It captures the release identification, scope, known limitations, SDLC verification status, deployment instructions, and the criteria for the next planned release.

This is the second formal release of CogAssess. It supersedes the pre-release v0.5.0-beta (released 2026-06-05, delivered to MemoryTell Ltd.). The principal addition in v1.0.0 is a machine-learning change management monitoring system implementing the FDA Predetermined Change Control Plan (PCCP) framework and IEC 62304 §8 software maintenance obligations.

This document is intended for use by the development team, quality assurance personnel, and any regulatory reviewers assessing conformance of the CogAssess software lifecycle. It should be read in conjunction with the full SDLC documentation suite listed in Section 6.

---

## 2. Release Identification

| Attribute | Value |
|---|---|
| Software item | CogAssess |
| Release version | 1.0.0 |
| Release date | 2026-06-29 |
| Git commit reference | To be filled at release |
| Release classification | Research prototype |
| IEC 62304 software safety classification | Class B |
| Platform | Windows 11 (development); Linux recommended for production |
| Runtime | Python 3.11+, Node.js 18+, React 18 |
| Repository | https://github.com/niamh888/cogassess |

### 2.1 Version Numbering Convention

CogAssess follows Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH[-prerelease]`. The `-beta` suffix indicates a pre-release build that has not yet completed full clinical validation. This version is suitable for supervised research use only and must not be used for unsupervised clinical decision-making.

---

## 3. Scope of This Release

Release 1.0.0 builds on the v0.5.0-beta foundation. In addition to all components delivered in v0.5.0-beta, this release adds a change management monitoring system and associated regulatory documentation. The following components are included in this release.

### 3.1 Backend (FastAPI / Python)

- **Five-stage speech analysis pipeline:**
  1. Audio ingestion and format conversion via ffmpeg (WAV/MP3/M4A → 16kHz mono WAV)
  2. Automatic Speech Recognition via Google Cloud Speech-to-Text (Chirp model)
  3. Acoustic feature analysis via librosa (pitch, jitter, shimmer, MFCCs, speech rate, pause patterns)
  4. Linguistic analysis via spaCy (lexical diversity, syntactic complexity, named entity count, clause density)
  5. Semantic scoring via sentence-transformers (MiniLM cosine similarity) and emotion classification via HuggingFace pipeline (j-hartmann/emotion-english-distilroberta-base)
- **Eight assessment tasks:** picture description, story recall (immediate and delayed), category fluency, letter fluency, prospective memory, digit span, and conversational speech
- **Eight condition presets:** cognitively normal (CN), mild cognitive impairment (MCI), dementia, aphasia, depression, anxiety, ADHD, and traumatic brain injury (TBI)
- **Clinical findings workflow:** assessors can record clinical observations per session, with `findings_recorded_at` timestamp
- **Patient summary endpoint:** aggregated scores across sessions per patient
- **JWT authentication:** HS256 tokens with 8-hour expiry, bcrypt password hashing via passlib

### 3.2 Frontend (React 18 SPA)

- Session creation and management UI
- Real-time audio recording with MediaRecorder API (WAV export)
- Task-by-task assessment interface with condition preset selection
- Clinical findings entry panel
- Patient summary dashboard
- JWT Bearer token authentication integrated with all API calls
- **Monitoring dashboard** (new in v1.0.0): data drift table (Z-score, PSI, K-S, CUSUM), open change event management, and clinical performance metrics panel (sensitivity, specificity, PPV, NPV, F1, AUC-ROC)

### 3.3 Database

- SQLite via SQLAlchemy 2.x ORM
- Schema: `clinicians`, `patients`, `sessions`, `tasks`, `acoustic_features`, `linguistic_features`, `semantic_scores`, `emotion_results`, `clinical_findings`
- **New in v1.0.0:** `drift_baselines` (baseline statistics per feature), `change_events` (open/dismissed drift events), `assessments.clinical_outcome_label` column

### 3.4 SDLC Documentation Suite

The following IEC 62304 companion documents are included in this release:

| Document ID | Title |
|---|---|
| CA-SRS-001 | Software Requirements Specification |
| CA-SAD-001 | Software Architecture Description |
| CA-SDP-001 | Software Development Plan |
| CA-SVP-001 | Software Verification Plan |
| CA-RMF-001 | Risk Management File |
| CA-SOUP-001 | Software of Unknown Provenance Evaluation |
| CA-SRR-001 | Software Release Record (this document) |
| CA-SEC-001 | Security Architecture and Threat Model |
| CA-RTM-001 | Requirements Traceability Matrix |
| CA-VP-001 | Software Validation Plan (IEC 82304-1 §6) |
| CA-VR-001 | Software Validation Report (IEC 82304-1 §6) |
| CA-PCCP-001 | Predetermined Change Control Plan (FDA 2024 / MDCG-2025-6) — machine-readable: `change_control.json` |

---

## 4. Changes from Previous Version

### 4.1 Previous Release Reference

| Attribute | Value |
|---|---|
| Previous release | 0.5.0-beta |
| Previous release date | 2026-06-05 |
| Delivered to | MemoryTell Ltd. (feasibility prototype) |

### 4.2 New Features in v1.0.0

| Feature | Description |
|---|---|
| Change management monitoring | Real-time data drift detection per pipeline feature using four complementary metrics: Z-score (mean shift), PSI (distributional distance), K-S test (non-parametric distributional comparison), CUSUM (sequential trend accumulation) |
| Shape statistics | Skewness and excess kurtosis tracked per feature at baseline and compared in each monitoring window |
| Shannon entropy | Derived feature `emotion.entropy` tracks the informativeness of the 7-class emotion probability distribution |
| Clinical performance metrics | `GET /monitoring/performance/clinical` endpoint computes sensitivity, specificity, PPV, NPV, F1, and AUC-ROC against clinician-recorded outcome labels (minimum 10 labels required) |
| Clinical outcome labelling | `PUT /assessments/{key}/clinical-label` endpoint allows clinicians to record `normal`, `mci`, `dementia`, or `other` per assessment |
| PCCP artefact | `change_control.json` at repository root encodes the Predetermined Change Control Plan (FDA 2024 guidance; MDCG-2025-6) as a machine-readable governance document |
| Automatic DB migration | `_run_migrations()` in `main.py` adds new columns (`skewness`, `kurtosis_excess`, `raw_values`, `clinical_outcome_label`) to existing databases at startup without data loss |
| Monitoring dashboard | React `MonitoringPage` at `/monitoring` showing drift table (8-column with all metric values and thresholds), open change events, and clinical performance panel |
| Updated documentation | `docs/DEPLOYMENT.md §6.7` (monitoring setup), `README.md` (pre-deployment checklist and monitoring section), `frontend/README.md` (project-specific content replacing Vite boilerplate) |

### 4.3 Bug Fixes and Removals

| Item | Description |
|---|---|
| Removed `stt.confidence` from monitoring | Google Cloud Chirp universal model does not return meaningful confidence scores (always returns 0.0). Feature removed from `_DRIFT_FEATURES` and `change_control.json` to prevent spurious drift alerts. |

---

## 5. Known Limitations and Open Issues

The following limitations and open issues are acknowledged for release 1.0.0. Each has been assessed for risk in CA-RMF-001. None are assessed as unacceptable for supervised research use; all are planned for remediation in a future production release.

### 5.1 Model Validation

The acoustic, linguistic, and semantic scoring algorithms have not yet been clinically validated on a representative patient population. Score thresholds and weighting factors are derived from published literature and internal judgement. Scores must be interpreted by a qualified clinician and must not be used as the sole basis for clinical diagnosis. A formal clinical validation study is planned for a future production release.

### 5.2 SQLite Single-File Database

SQLite does not support row-level locking or concurrent write access from multiple processes. This database is not suitable for multi-clinician concurrent production use. For the current release, CogAssess is intended for single-site, single-clinician pilot use. Migration to PostgreSQL is planned for a future production release.

### 5.3 No Automated Test Suite

The verification test cases defined in CA-SVP-001 have not yet been automated. All testing for this release is manual, following the procedures documented in CA-SVP-001. An automated unit and integration test suite is planned for a future release.

### 5.4 Windows OneDrive Path Compatibility

When the project directory is located within a Windows OneDrive-synchronised path containing spaces, `uvicorn --reload` crashes due to a `watchfiles` library incompatibility with such paths. **Workaround:** run the server without the `--reload` flag (`uvicorn main:app --host 0.0.0.0 --port 8000`). This does not affect functionality; hot-reload is a development convenience only. Resolution is planned for a future release.

### 5.5 ffmpeg Path Configuration

The `ffmpeg` executable is not automatically discovered from the system PATH in all environments. Users must set the `FFMPEG_PATH` environment variable to the full path of the ffmpeg binary if it is not on the system PATH. See README.md for configuration instructions.

### 5.6 bcrypt / passlib Compatibility

`bcrypt` version 4.x introduced a breaking change that removes the `__about__` attribute relied upon by `passlib` 1.7.x. This is mitigated by a startup patch in `main.py` that restores the missing attribute before passlib initialises. This issue is tracked as SOUP-04 in CA-SOUP-001. A permanent fix via `passlib` upgrade or replacement is planned for a future release.

### 5.7 English-Only Language Support

The Google Cloud STT Chirp model and the HuggingFace emotion classifier (`j-hartmann/emotion-english-distilroberta-base`) are optimised for English-language speech. Non-English speakers will receive degraded transcription and emotion classification accuracy. The system logs a warning when non-English speech is detected, but does not refuse to process it or provide alternative models. Full multilingual support is deferred to a future release.

---

## 6. SDLC Verification Checklist

The following table records the verification and validation status of each required IEC 62304 Class B / IEC 82304-1 lifecycle activity as of this release. Items marked "Not yet" are recorded as known gaps and are planned for remediation before v1.0 / first-patient-in.

| Item | Status | Evidence |
|---|---|---|
| All SRS requirements documented | Complete | CA-SRS-001 |
| Software architecture documented | Complete | CA-SAD-001 |
| Development plan approved | Complete | CA-SDP-001 |
| Verification plan defined | Complete | CA-SVP-001 |
| Risk management file completed | Complete | CA-RMF-001 |
| SOUP evaluation completed | Complete | CA-SOUP-001 |
| Security architecture documented | Complete | CA-SEC-001 |
| Requirements traceability matrix | Complete | CA-RTM-001 |
| Validation plan defined (IEC 82304-1 §6) | Complete | CA-VP-001 |
| Validation report template (IEC 82304-1 §6) | Partially complete | CA-VR-001 — sections to be completed at FPI |
| Automated test suite (44 SVP test cases) | 42 passing / 14 skipped | Test log TR-20260606-113847 |
| API-layer penetration test (OWASP Top 10) | **Complete — all 10 PASS** | CA-SEC-001 §10.2, CA-VR-001 §3.1 |
| Bandit static analysis | **Complete — 0 actionable findings** | CA-SEC-001 §10.1, CA-VR-001 §3.3 |
| System-level browser/GCP tests | Not yet | To be executed before FPI per CA-VP-001 VA-001 |
| OWASP ZAP dynamic scan | Not yet | To be executed on production server before FPI |
| Usability evaluation (IEC 62366-1) | Not yet | To be completed before FPI per CA-VP-001 VA-003 |
| Clinical validation study (concurrent validity) | Not yet | Planned per CA-IB-001 |
| Traceability: SRS requirements → architecture | Complete | CA-SAD-001 §6 |
| Traceability: requirements → risk controls | Complete | CA-RMF-001 §5 |
| Traceability: requirements → test cases | Complete | CA-RTM-001 |
| Traceability: requirements → verification cases | Partial | CA-SVP-001 (manual cases defined, not yet executed) |

---

## 7. Deployment Instructions Summary

Full deployment instructions are provided in `README.md` at the root of the repository. A summary is provided here for reference.

### 7.1 Prerequisites

- Python 3.11 or later
- Node.js 18 or later and npm
- ffmpeg installed and accessible (set `FFMPEG_PATH` if not on system PATH)
- Google Cloud Platform project with Speech-to-Text API enabled
- GCP service account JSON key file

### 7.2 Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
source venv/bin/activate  # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (copy and edit .env.example)
# Required: SECRET_KEY, GOOGLE_APPLICATION_CREDENTIALS, FFMPEG_PATH (if needed)

# Run the backend server (omit --reload on OneDrive paths)
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 7.3 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 7.4 First-Run Initialisation

On first run, the SQLite database is created automatically by SQLAlchemy. A default clinician account should be created via the `/auth/register` endpoint before clinical use. Refer to README.md for the full first-run walkthrough.

### 7.5 Production Deployment Pre-conditions

Before deploying to any environment where real patient data will be processed, the following pre-conditions must be satisfied (see also CA-SEC-001 §8):

- HTTPS via TLS 1.2 or later must be configured
- CORS origins must be restricted to the specific deployment domain
- Rate limiting must be applied to `/auth/login`
- A minimum 256-bit random `SECRET_KEY` must be stored in a secrets manager
- API-layer penetration test (OWASP API Security Top 10, TC-OWA-001–010) must be passing — **completed 2026-06-06, all 10 PASS**; dynamic penetration test (OWASP ZAP) must be conducted on the live server and all Critical/High findings remediated before first-patient-in
- The clinical validation study must be completed or a risk acceptance decision formally recorded

---

## 8. Release Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Released by | ______________ | ______________ | ______________ |
| Quality reviewed by | ______________ | ______________ | ______________ |
| Clinical reviewed by | ______________ | ______________ | ______________ |

By signing this document, the approvers confirm that they have reviewed the release scope, known limitations, and SDLC verification checklist, and accept the release of CogAssess version 1.0.0 for supervised research use subject to the limitations stated in Section 5.

---

## 9. Next Planned Version — v1.x / Production Release Objectives

The following objectives are targeted for CogAssess v1.0, at which point the software will be considered suitable for production deployment in a clinical research setting:

| Objective | Description |
|---|---|
| Automated test suite | Unit tests (pytest) and integration tests for all five pipeline stages and all API endpoints, achieving minimum 80% line coverage |
| Clinical validation study | Prospective study on a representative patient population to validate scoring algorithms and establish normative ranges per condition preset |
| PostgreSQL migration | Replace SQLite with PostgreSQL to support multi-clinician concurrent access and row-level locking |
| Penetration testing | Internal API-layer pen test (OWASP Top 10, TC-OWA-001–010) completed 2026-06-06 — all PASS. Dynamic OWASP ZAP scan and third-party pen test review required before clinical release. |
| Rate limiting | Implement request rate limiting on `/auth/login` and audio upload endpoints |
| File size validation | Enforce a maximum audio upload size (target: 25 MB) with appropriate error response |
| HttpOnly cookie token storage | Migrate JWT token from localStorage to HttpOnly cookies to mitigate XSS risk |
| CORS restriction | Restrict `allow_origins` to specific deployment domain(s) |
| Multilingual support assessment | Evaluate options for non-English STT and emotion classification models |
| Real-world pilot study | Supervised deployment at a clinical research partner site with prospective data collection |

---

*End of CA-SRR-001*

*Document controlled under the CogAssess SDLC documentation suite. For the current revision, refer to the GitHub repository at https://github.com/niamh888/cogassess.*
