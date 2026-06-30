# CogAssess — Speech Biomarker Assessment Platform

A clinician-facing speech biomarker assessment platform developed by **St John Lynch & Co. Ltd** and shared with **MemoryTell Ltd** at v.0.5.0 for feasibility / prototype (what's possible)!

CogAssess records short speech samples from patients, runs them through a five-stage AI analysis pipeline, and presents clinicians with a scored cognitive report across four domains. Clinicians then record findings and generate a patient-facing summary.

> **Clinical notice:** CogAssess outputs are speech biomarker indicators — not a diagnosis. Results should be interpreted by a qualified clinician and should not be shared directly with patients.

---

## Features

- **Configurable task battery** — 8 speech tasks, 8 clinical condition presets (Early dementia, MCI, Parkinson's, etc.)
- **Five-stage AI pipeline** — STT → acoustics → linguistics → semantics → emotion
- **Clinical report** — per-task and cumulative scores, population bell curve, clinical flags
- **Clinical findings workflow** — outcome, follow-up date, internal notes, patient summary
- **Patient summary page** — printable, no numerical scores, plain-English bell curve
- **JWT authentication** — 8-hour sessions, bcrypt password hashing
- **PCCP-aligned change management monitoring** — drift detection (z-score, PSI, K-S, CUSUM), three-layer change event notification, clinical performance metrics (F1, AUC-ROC)
- **IEC 62304 Class B** SDLC documentation suite included in `docs/`

---

## How it works

The patient records speech in the browser. Audio is sent to the FastAPI backend where five pipeline stages run in sequence:

```
Browser (React + MediaRecorder)
  └── POST /assessments/{key}/tasks/{index}
        ├── Stage 1: Google Chirp STT          — speech to text
        ├── Stage 2: librosa acoustics          — pause timing, pitch, HNR
        ├── Stage 3: spaCy morphology           — vocabulary, pronouns, disfluencies
        ├── Stage 4: sentence-transformers      — semantic variability and coherence
        └── Stage 5: j-hartmann emotion         — 7-class emotion detection
```

**Scored domains (0–100, higher = better preserved):**

| Domain | What it measures |
|--------|-----------------|
| Motor speech | Articulation rate, pause frequency, harmonic-to-noise ratio |
| Semantic memory | Vocabulary richness, high-frequency word use, topic coherence |
| Episodic memory | First-person narrative, type-token ratio, disfluency count |
| Emotional processing | Emotional range, flat affect detection |

**Risk flags:** Low risk ≥ 70 · Moderate 45–69 · Elevated < 45

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.10–3.13 | 3.13 confirmed working |
| Node.js | 18 LTS+ | For the React frontend |
| ffmpeg | Any recent | Converts browser audio (webm → wav) |
| Google Cloud account | — | Chirp STT; free tier: 60 min/month |

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/niamh888/cogassess.git
cd cogassess
```

### 2. Install ffmpeg

**Windows:**
```powershell
winget install ffmpeg
```
Note the full path to `ffmpeg.exe` after installation — you will need it when starting the server. Typical location:
```
C:\Users\<YourName>\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_...\bin\ffmpeg.exe
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

---

### 3. Python backend

```bash
# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download the spaCy English model
python -m spacy download en_core_web_sm
```

> On first startup the HuggingFace models (~670 MB) download automatically and are cached locally. Subsequent startups are fast.

---

### 4. React frontend

```bash
cd frontend
npm install
```

---

### 5. Google Cloud — Chirp STT

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select a project and note the **Project ID**
3. Enable **Cloud Speech-to-Text API** (`speech.googleapis.com`)
4. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) and authenticate:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

> **University / organisation accounts:** If your org blocks service account keys, Application Default Credentials (above) are the recommended approach for development.

---

### 6. Initialise the database and create the first clinician account

```bash
# Windows
venv\Scripts\python.exe init_db.py

# macOS / Linux
venv/bin/python init_db.py
```

This creates `cogassess.db` and a default administrator account:

| Username | Password |
|----------|----------|
| `admin` | `changeme` |

**Change the password after first login** by updating it directly via the API or by editing `init_db.py` before running it.

---

### 7. Run the application

Open two terminals.

**Terminal 1 — backend (Windows with OneDrive path):**
```powershell
$env:GCP_PROJECT_ID = "your-project-id"
$env:FFMPEG_PATH    = "C:\Users\YourName\AppData\Local\...\ffmpeg.exe"
venv\Scripts\python.exe -m uvicorn main:app
```

> **Windows / OneDrive note:** Do not use `--reload`. The watchfiles file watcher crashes on paths containing spaces (common with OneDrive). Restart the server manually after backend changes.

**Terminal 1 — backend (macOS / Linux):**
```bash
export GCP_PROJECT_ID="your-project-id"
venv/bin/python -m uvicorn main:app --reload
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser and sign in with your clinician credentials.

---

### 8. Verify the pipeline

```
GET http://localhost:8000/health
```

Expected response:
```json
{"status": "ok", "pipeline_stages": ["chirp_stt", "acoustic", "morphology", "semantics", "emotion"]}
```

---

## Automated testing

The test suite covers 44 test cases mapped to [CA-SVP-001](docs/SVP.md). No GCP account, no ML models, and no running server are required — all heavy dependencies are stubbed at runtime.

### First-time setup (test dependencies only)

```powershell
pip install pytest "bcrypt<4.0"
```

> `bcrypt<4.0` is required for compatibility with passlib 1.7.x. If you installed from `requirements.txt` into a venv, run `pip install "bcrypt<4.0"` inside that same venv.

---

### Run the full suite with log output

```powershell
python run_tests.py
```

This runs all tests and writes two files to `logs/`:

| File | Purpose |
|------|---------|
| `logs/test_log_YYYYMMDD-HHMMSS.md` | Timestamped pass/fail table, one row per test, SVP test case ID linked |
| `logs/anomaly_log.md` | Append-only failure log; each failure gets an `ANO-NNN` entry with error detail and "Open" status |

Exit code is `0` if all tests pass, `1` if any fail — suitable for CI pipelines.

---

### Run with raw pytest output (no log files)

```powershell
python -m pytest tests/ -v
```

---

### Test coverage

| Test file | SVP test cases | Status |
|-----------|---------------|--------|
| test_auth.py | TC-AUTH-001, TC-AUTH-002, TC-AUTH-003 | Automated |
| test_assessments.py | TC-ASS-001, TC-ASS-002, TC-ASS-003 | Automated |
| test_findings.py | TC-FIND-001, TC-FIND-002, TC-SAF-001 | Automated |
| test_patients.py | TC-PAT-001, TC-PAT-003 | Automated |
| test_pipeline.py | TC-PIP-002, TC-PIP-004 | Automated |
| test_security.py | TC-SEC-001, TC-SEC-002, TC-REP-001 | Automated |
| test_soup.py | TC-SOUP-001, TC-SOUP-002, TC-SOUP-003 | TC-SOUP-001/002 automated; TC-SOUP-003 requires `pip install pip-audit` |
| test_owasp.py | TC-OWA-001 – TC-OWA-010 | Automated — OWASP API Security Top 10 penetration tests |

Tests that require a live browser (TC-REC-001, TC-REC-002) and tests that require a GCP connection (TC-PIP-001, TC-PIP-003) are defined in CA-SVP-001 as manual verification steps.

---

## Change management monitoring

CogAssess includes a PCCP-aligned (Predetermined Change Control Plan) monitoring system accessible via the **Monitoring** page after login.

### What it monitors

| Metric | What it detects |
|--------|----------------|
| Z-score | Mean shift in any pipeline feature relative to the baseline |
| PSI (Population Stability Index) | Distributional shape change — detects drift z-score misses |
| K-S test (Kolmogorov-Smirnov) | Full distributional comparison with statistical p-value |
| CUSUM | Gradual monotonic trends that accumulate over many assessments |
| Emotion entropy | Stability of the emotion classifier's confidence distribution |

The overall feature status is the **worst-case** across all metrics. Thresholds are defined in `change_control.json` — edit only after clinical validation review.

### Change events

When a threshold is breached, the system:
1. Raises a **red badge** on the Monitoring nav link (ambient alert for any logged-in user)
2. Appends a structured entry to `logs/change_events.md` (engineering log, persistent)
3. Creates a `ChangeEvent` record in the database requiring formal review or dismissal

Open change events must not be left unreviewed — see `docs/DEPLOYMENT.md §6.7.4`.

### Establishing the baseline

Navigate to **Monitoring → Compute baseline**. Requires ≥ 5 completed assessments. Recompute after every 20–30 new assessments to keep the baseline clinically representative.

### Unlocking clinical performance metrics (F1, AUC, sensitivity, specificity)

These metrics require clinician-confirmed outcome labels. Add them after each patient's diagnosis is confirmed:

```bash
PUT /assessments/{assessment_key}/clinical-label
Body: { "label": "normal" }   # or "mci", "dementia", "other"
```

Requires ≥ 10 labeled assessments with at least one normal and one impaired case.

---

## Production deployment

> Full instructions are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Read that document before proceeding.

**Pre-deployment checklist (summary):**

- [ ] Server has ≥ 8 GB RAM — required for CPU ML inference
- [ ] PostgreSQL provisioned (RDS on AWS, or local install) — SQLite is not suitable for production
- [ ] HTTPS enabled — clinical data must not travel over plain HTTP
- [ ] `allow_origins=["*"]` in `main.py` changed to your production domain
- [ ] JWT secret key generated (`python -c "import secrets; print(secrets.token_hex(32))"`) and stored securely (AWS Secrets Manager or `chmod 600` `.env` file)
- [ ] GCP service account key created and stored securely — not committed to git
- [ ] spaCy model downloaded on the server (`python -m spacy download en_core_web_sm`)
- [ ] HuggingFace models pre-cached on the server (see [docs/DEPLOYMENT.md §6.5](docs/DEPLOYMENT.md))
- [ ] Default `admin` / `changeme` password changed before first clinical session
- [ ] Full test suite run on the production server: `python run_tests.py` → must show `Failed: 0`
- [ ] Test log saved to the trial master file **[REGULATORY]**
- [ ] `change_control.json` present in project root and unmodified
- [ ] Monitoring page loads without error after first startup
- [ ] Any change events from test data dismissed before clinical use
- [ ] Clinical outcome label workflow explained to principal investigator (see [docs/DEPLOYMENT.md §6.7.5](docs/DEPLOYMENT.md))
- [ ] Deployment sign-off table in [docs/DEPLOYMENT.md §9](docs/DEPLOYMENT.md) completed and filed **[REGULATORY]**

**AWS users:** See [docs/DEPLOYMENT.md §4](docs/DEPLOYMENT.md) for EC2 + RDS setup, ALB/HTTPS via ACM, and Secrets Manager credential storage.

**Linux/VPS users:** See [docs/DEPLOYMENT.md §5](docs/DEPLOYMENT.md) for PostgreSQL, nginx, Let's Encrypt, and systemd service setup.

---

## Clinician workflow

1. **Sign in** at `http://localhost:5173`
2. **Dashboard** — view all assessments; click **+ New assessment**
3. **Intake form** — enter patient reference, date of birth (age band auto-filled), language, environment, condition preset and task selection
4. **Recording screen** — hand the device to the patient; they work through each task; audio is processed after each one
5. **Clinical report** — per-task scores, population bell curve, clinical flags
6. **Record findings** — outcome, follow-up date, internal clinical notes
7. **Patient summary** — printable page with outcome badge, plain-English bell curve, clinician-written summary (no numerical scores shown)

---

## Project structure

```
cogassess/
├── main.py                  # FastAPI backend — pipeline, auth, monitoring, all endpoints
├── models.py                # SQLAlchemy ORM models (incl. PipelineMetric, DriftBaseline, ChangeEvent)
├── schemas.py               # Pydantic request/response schemas
├── database.py              # DB engine and session
├── auth.py                  # JWT creation and verification
├── init_db.py               # First-run DB initialisation
├── migrate.py               # Additive schema migrations
├── change_control.json      # PCCP artefact — performance thresholds (edit only after clinical review)
├── requirements.txt         # Python dependencies
├── cogassess.db             # SQLite database (test data only — replace for production)
├── logs/
│   ├── change_events.md     # Append-only engineering change event log
│   └── anomaly_log.md       # Test failure log
├── docs/                    # IEC 62304 Class B / IEC 82304-1 documentation suite
│   ├── SRS.md / SRS.docx    # CA-SRS-001 Software Requirements Specification
│   ├── SAD.md / SAD.docx    # CA-SAD-001 Software Architecture Description
│   ├── SDP.md / SDP.docx    # CA-SDP-001 Software Development Plan
│   ├── SVP.md / SVP.docx    # CA-SVP-001 Software Verification Plan
│   ├── RMF.md / RMF.docx    # CA-RMF-001 Risk Management File (ISO 14971)
│   ├── SOUP.md / SOUP.docx  # CA-SOUP-001 SOUP Evaluation Records
│   ├── SRR.md / SRR.docx    # CA-SRR-001 Software Release Record
│   ├── SEC.md / SEC.docx    # CA-SEC-001 Security Architecture & Threat Model
│   ├── RTM.md               # CA-RTM-001 Requirements Traceability Matrix
│   ├── VP.md                # CA-VP-001 Software Validation Plan (IEC 82304-1 §6)
│   ├── VR.md                # CA-VR-001 Software Validation Report (IEC 82304-1 §6)
│   ├── DEPLOYMENT.md        # CA-DEP-001 AWS Deployment & Monitoring Guide
│   ├── IB.md                # CA-IB-001 Investigator's Brochure (clinical investigation)
│   ├── IB_All_Indications.md         # IB Appendix — all study indications
│   ├── IB_AppendixA_CRF.md           # IB Appendix A — Case Report Form
│   └── IB_AppendixC_PIL_ICF.md       # IB Appendix C — PIL / Informed Consent Form
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Routes and layout (ClinicianLayout / PatientLayout)
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── IntakePage.jsx
│   │   │   ├── PatientPage.jsx        # Patient-facing recording screen
│   │   │   ├── ReportPage.jsx         # Clinical report
│   │   │   ├── ClinicalFindingsPage.jsx
│   │   │   ├── PatientSummaryPage.jsx # Printable patient summary
│   │   │   ├── MonitoringPage.jsx     # Change management dashboard
│   │   │   └── AboutPage.jsx
│   │   ├── components/
│   │   │   ├── Header.jsx        # Sticky header with logo → home
│   │   │   ├── Footer.jsx
│   │   │   ├── ScoreRing.jsx
│   │   │   └── RecordingWave.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── data/
│   │   │   ├── tasks.js          # 8 speech task definitions
│   │   │   └── conditions.js     # 8 clinical condition presets
│   │   └── index.css             # CSS variables (MemoryTell forest green brand)
│   ├── public/
│   │   ├── sjl-logo.png   # Wordmark (header, footer, patient summary)
│   │   └── sjl-icon.png   # Favicon
│   └── index.html
└── README.md
```

---

## Regulatory documentation

A full IEC 62304 Class B / IEC 82304-1 software lifecycle document suite is in `docs/`. The eight core SDLC documents (SRS through SEC) are available as both Markdown (`.md`) and Word (`.docx`). Newer documents (RTM, VP, VR, DEPLOYMENT, IB suite) are Markdown only.

| Document | ID | Description |
|----------|----|-------------|
| Software Requirements Specification | CA-SRS-001 | ~110 functional, safety, security, and performance requirements |
| Software Architecture Description | CA-SAD-001 | 5 software items, pipeline architecture, security architecture |
| Software Development Plan | CA-SDP-001 | Lifecycle model, roles, tools, coding standards, release criteria |
| Software Verification Plan | CA-SVP-001 | 44 test cases across 11 requirement groups |
| Risk Management File | CA-RMF-001 | ISO 14971 hazard analysis — 10 hazards, all residual risks acceptable |
| SOUP Evaluation Records | CA-SOUP-001 | 14 third-party components evaluated including CVE review |
| Software Release Record | CA-SRR-001 | v1.0.0 release baseline, known limitations, SDLC checklist |
| Security Architecture & Threat Model | CA-SEC-001 | STRIDE analysis, pen test record, production pre-conditions |
| Requirements Traceability Matrix | CA-RTM-001 | Full mapping of all ~110 requirements to test cases and verification status |
| Software Validation Plan | CA-VP-001 | IEC 82304-1 §6 — 5 validation activities, acceptance criteria, release gates |
| Software Validation Report | CA-VR-001 | IEC 82304-1 §6 — automated results pre-filled; pending sections for FPI |
| Investigator's Brochure | CA-IB-001 | EU MDR Article 62 clinical investigation — protocol, CRF, PIL/ICF |

---

## License compliance

| Component | License | Commercial use |
|-----------|---------|----------------|
| Google Chirp STT | Proprietary | ✅ Pay-per-use |
| librosa | ISC | ✅ Free |
| spaCy | MIT | ✅ Free |
| sentence-transformers (all-mpnet-base-v2) | Apache 2.0 | ✅ Free |
| j-hartmann/emotion-english-distilroberta-base | Apache 2.0 | ✅ Free |
| FastAPI / SQLAlchemy / python-jose / passlib | MIT / Apache 2.0 | ✅ Free |
| React / Vite | MIT | ✅ Free |

---

## Known limitations (v1.0.0)

- Scoring algorithms are **not yet clinically validated** on a representative patient population
- SQLite is suitable for **single-site pilot use** only — migrate to PostgreSQL for multi-clinician production deployment
- Emotion classifier and STT are **optimised for English** — non-English L1 speakers are flagged on the report but not fully accommodated
- Automated test suite covers 29 of 43 SVP test cases — browser and GCP-dependent cases remain manual
- Dynamic penetration testing (OWASP ZAP) not yet completed — static/API-layer pen tests (TC-OWA-001–010) are passing

---

*Developed by St John Lynch & Co. Ltd · © 2026 St John Lynch & Co. Ltd. All rights reserved. Shared with MemoryTell at v.0.5.0 to demonstrate feasibility project (what's possible).  Updated under DkIT PhD work to v.1.0.0 to demonstrate PCCP integration and performance, data drift analysis and feedback mechanism.  Publically accessible for review and publication pending - refer to citation.cff*
