# CogAssess — Cognitive Assessment Platform

A speech biomarker pipeline for cognitive deficit screening, modelled on the
[TELL (Toolkit to Examine Lifelike Language)](https://www.karger.com/Article/FullText/536878)
architecture from Universidad de San Andrés, Argentina.

All components are commercially licensed. TELL's non-commercial components
(PySentimiento, FreeLing, FastText, PRAAT) have been replaced with
commercial-safe equivalents.

---

## How it works

The participant records a brief speech sample (60 seconds) in the browser.
The audio is sent to the FastAPI backend where five pipeline stages run in sequence:

```
Browser (React + MediaRecorder)
  └── POST /assess  (audio/webm)
        ├── Stage 1: Google Chirp STT       — transcribes speech to text
        ├── Stage 2: Librosa acoustics       — pause timing, pitch, HNR
        ├── Stage 3: spaCy morphology        — word-finding, pronouns, disfluencies
        ├── Stage 4: sentence-transformers   — semantic variability and coherence
        └── Stage 5: j-hartmann emotion      — 7-class emotion detection
```

The output is a scored report across four cognitive domains:

| Domain | What it measures |
|--------|-----------------|
| Motor speech | Articulation rate, pause frequency, harmonic-to-noise ratio |
| Semantic memory | Vocabulary richness, high-frequency word use, topic coherence |
| Episodic memory | First-person narrative use, type-token ratio, disfluency count |
| Emotional processing | Emotional range, flat affect detection |

Scores are 0–100. A composite score and overall risk flag (low / moderate / elevated)
are generated per session.

> **Clinical disclaimer:** Scores are indicative only and require clinical validation
> before use in any diagnostic context. Not for use as a standalone diagnostic tool.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.10+ | 3.13 confirmed working |
| Node.js | 18+ | For the React frontend |
| ffmpeg | Any recent | Used to convert browser audio (webm → wav) |
| Google Cloud account | — | For Chirp STT; free tier includes 60 min/month |

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
After install, find the full path to `ffmpeg.exe` — you will need it in step 5.
Typical location:
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

### 3. Set up the Python backend

```bash
# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install fastapi "uvicorn[standard]" python-multipart pydantic \
    spacy sentence-transformers scikit-learn \
    "transformers[torch]" librosa soundfile \
    google-cloud-speech

# Download the spaCy English model
python -m spacy download en_core_web_sm
```

> **Note:** The sentence-transformers and emotion models (~670MB total) download
> automatically from HuggingFace on first startup and are cached locally.

---

### 4. Set up the React frontend

```bash
cd frontend
npm install
```

---

### 5. Configure environment variables

Copy the example file:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit `.env` and set:

- `GCP_PROJECT_ID` — your Google Cloud project ID (see step 6)
- `FFMPEG_PATH` — full path to the ffmpeg binary (Windows only; leave as `ffmpeg` on Mac/Linux)

On Windows, set variables in PowerShell before starting the server:
```powershell
$env:GCP_PROJECT_ID = "your-project-id"
$env:FFMPEG_PATH = "C:\Users\YourName\AppData\Local\...\ffmpeg.exe"
```

---

### 6. Google Cloud — Chirp STT setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select a project and note the **Project ID**
3. Search for **"Cloud Speech-to-Text API"** (service: `speech.googleapis.com`) and enable it
4. Install the Google Cloud CLI: [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
5. Authenticate:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

> **Note for organisation accounts (e.g. university):** If your organisation blocks
> service account key creation, use Application Default Credentials (step 5 above)
> instead of a JSON key file. This is also the recommended approach for development.

---

### 7. Run the application

Open two terminals.

**Terminal 1 — backend:**
```bash
# Activate venv first
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux

uvicorn main:app --reload --port 8000
```

On first startup the HuggingFace models will download (~670MB). Subsequent
startups are fast.

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Verifying the pipeline

Visit **http://localhost:8000/health** — you should see:

```json
{"status": "ok", "pipeline_stages": ["chirp_stt", "acoustic", "morphology", "semantics", "emotion"]}
```

In the browser, the **Pipeline mode** toggle shows **Live API** by default.
Record a 30–60 second speech sample and click **Stop & analyse**.

---

## Project structure

```
cogassess/
├── main.py              # FastAPI backend — all 5 pipeline stages
├── requirements.txt     # Python dependencies
├── .env.example         # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # React UI — recording, task flow, report
│   │   ├── main.jsx     # React entry point
│   │   └── index.css    # CSS variables and base styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Scoring reference

All scores are 0–100. Higher = better preserved function.

| Score | Formula inputs |
|-------|---------------|
| Motor speech | Articulation rate, pause count (≥300ms), HNR |
| Semantic memory | High-frequency word ratio, semantic granularity, topic coherence |
| Episodic memory | First-person ratio, disfluency count, type-token ratio |
| Emotional processing | Neutral affect excess (penalises flat affect) |
| Composite | Mean of all four domain scores |

**Risk flags:**
- **Low risk:** composite ≥ 70
- **Moderate risk:** composite 45–69
- **Elevated risk:** composite < 45

---

## License compliance

| Component | License | Commercial use |
|-----------|---------|----------------|
| Google Chirp STT | Proprietary | ✅ Pay-per-use ($0.024/min) |
| Librosa | ISC | ✅ Free |
| spaCy | MIT | ✅ Free |
| sentence-transformers (all-mpnet-base-v2) | Apache 2.0 | ✅ Free |
| j-hartmann/emotion-english-distilroberta-base | Apache 2.0 | ✅ Free |
| FastAPI | MIT | ✅ Free |
| React / Vite | MIT | ✅ Free |

**Replaced from TELL (non-commercial components):**

| TELL component | License issue | Replacement |
|----------------|--------------|-------------|
| OpenAI Whisper | MIT but poor clinical accuracy | Google Chirp |
| FastText vectors | CC BY-SA (ShareAlike) | sentence-transformers Apache 2.0 |
| PySentimiento | Non-commercial only | j-hartmann Apache 2.0 |
| FreeLing | AGPL (SaaS disclosure) | spaCy MIT |
| PRAAT | GPL | Librosa ISC |

---

## Background

This platform is based on the TELL architecture:

> García, A.M. et al. (2024). *Toolkit to Examine Lifelike Language v.2.0:
> Optimizing Speech Biomarkers of Neurodegeneration.*
> Karger Publishers. DOI: 10.1159/000536878

Relevant datasets for validation:
- **DementiaBank / Pitt Corpus** — access via [talkbank.org](https://talkbank.org)
- **ADReSS / ADReSSo** — INTERSPEECH 2020/2021 challenge data, via DementiaBank
- **PREPARE Challenge** — NIA multilingual dataset (English, Spanish, Mandarin)
