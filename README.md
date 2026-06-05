# CogAssess — Speech Biomarker Assessment Platform

A clinician-facing speech biomarker assessment platform developed by **St John Lynch & Co. Ltd** on behalf of **MemoryTell Ltd**.

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
├── main.py                  # FastAPI backend — pipeline, auth, all endpoints
├── models.py                # SQLAlchemy ORM models
├── schemas.py               # Pydantic request/response schemas
├── database.py              # DB engine and session
├── auth.py                  # JWT creation and verification
├── init_db.py               # First-run DB initialisation
├── migrate.py               # Additive schema migrations
├── requirements.txt         # Python dependencies
├── cogassess.db             # SQLite database (test data only — replace for production)
├── docs/                    # IEC 62304 Class B SDLC documentation
│   ├── SRS.md / SRS.docx    # CA-SRS-001 Software Requirements Specification
│   ├── SAD.md / SAD.docx    # CA-SAD-001 Software Architecture Description
│   ├── SDP.md / SDP.docx    # CA-SDP-001 Software Development Plan
│   ├── SVP.md / SVP.docx    # CA-SVP-001 Software Verification Plan
│   ├── RMF.md / RMF.docx    # CA-RMF-001 Risk Management File (ISO 14971)
│   ├── SOUP.md / SOUP.docx  # CA-SOUP-001 SOUP Evaluation Records
│   ├── SRR.md / SRR.docx    # CA-SRR-001 Software Release Record
│   └── SEC.md / SEC.docx    # CA-SEC-001 Security Architecture & Threat Model
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
│   │   ├── memorytell-logo.png   # Wordmark (header, footer, patient summary)
│   │   └── memorytell-icon.png   # Favicon
│   └── index.html
└── README.md
```

---

## Regulatory documentation

A full IEC 62304 Class B software lifecycle document suite is in `docs/`. All documents are available as both Markdown (`.md`) and Word (`.docx`).

| Document | ID | Description |
|----------|----|-------------|
| Software Requirements Specification | CA-SRS-001 | ~80 functional, safety, security, and performance requirements |
| Software Architecture Description | CA-SAD-001 | 5 software items, pipeline architecture, security architecture |
| Software Development Plan | CA-SDP-001 | Lifecycle model, roles, tools, coding standards, release criteria |
| Software Verification Plan | CA-SVP-001 | 30 test cases across 10 requirement groups |
| Risk Management File | CA-RMF-001 | ISO 14971 hazard analysis — 10 hazards, all residual risks acceptable |
| SOUP Evaluation Records | CA-SOUP-001 | 14 third-party components evaluated including CVE review |
| Software Release Record | CA-SRR-001 | v0.5.0-beta release baseline, known limitations, SDLC checklist |
| Security Architecture & Threat Model | CA-SEC-001 | STRIDE analysis, production pre-conditions |

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

## Known limitations (v0.5.0-beta)

- Scoring algorithms are **not yet clinically validated** on a representative patient population
- SQLite is suitable for **single-site pilot use** only — migrate to PostgreSQL for multi-clinician production deployment
- Emotion classifier and STT are **optimised for English** — non-English L1 speakers are flagged on the report but not fully accommodated
- No automated test suite yet — manual test cases are defined in CA-SVP-001
- Penetration testing not yet completed — required before production deployment

---

*Developed by St John Lynch & Co. Ltd · © 2026 MemoryTell Ltd. All rights reserved.*
