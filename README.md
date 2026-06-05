# Cognitive Assessment Platform

Speech biomarker pipeline for cognitive deficit assessment.
Replicates the TELL architecture using a fully commercial-safe stack.

## Architecture

```
Browser (React)
  └── MediaRecorder API (audio/webm)
        └── POST /assess
              ├── Stage 1: Google Chirp STT       ($0.024/min — commercial ✅)
              ├── Stage 2: Librosa + SpeechBrain  (ISC / Apache 2.0 ✅)
              ├── Stage 3: spaCy morphology        (MIT ✅)
              ├── Stage 4: sentence-transformers   (Apache 2.0 ✅)
              └── Stage 5: j-hartmann emotion      (Apache 2.0 ✅)
```

## Quick start

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Set Google Cloud credentials for Chirp STT
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
export GOOGLE_CLOUD_PROJECT="your-project-id"

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm create vite@latest . -- --template react
npm install
# Copy App.jsx into src/
npm run dev
```

Open http://localhost:5173

## Activating live pipeline stages

Each stage in `backend/main.py` has a detailed docstring with the production
implementation. To activate a stage, uncomment the production code block and
remove the STUB return statement.

### Stage 1 — Chirp STT
1. Create a Google Cloud project and enable the Speech-to-Text V2 API
2. Create a service account with `roles/speech.client`
3. Download the JSON key and set GOOGLE_APPLICATION_CREDENTIALS
4. Set PROJECT_ID in main.py

### Stage 3 — spaCy
```python
import spacy
nlp = spacy.load("en_core_web_sm")  # or en_core_web_trf for higher accuracy
```

### Stage 4 — Sentence Transformers
```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
```
First run downloads ~420MB model weights to ~/.cache/huggingface/

### Stage 5 — Emotion model
```python
from transformers import pipeline
classifier = pipeline("text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None)
```
First run downloads ~250MB model weights to ~/.cache/huggingface/

## Scoring

Scores are indicative and require clinical validation before deployment.
Domain weights and thresholds in `compute_scores()` should be calibrated
against a normative dataset before clinical use.

## License compliance summary

| Component              | License      | Commercial use |
|------------------------|--------------|----------------|
| Google Chirp (API)     | Proprietary  | ✅ Pay-per-use |
| Librosa                | ISC          | ✅ Free        |
| SpeechBrain            | Apache 2.0   | ✅ Free        |
| spaCy                  | MIT          | ✅ Free        |
| sentence-transformers  | Apache 2.0   | ✅ Free        |
| j-hartmann emotion     | Apache 2.0   | ✅ Free        |
| FastAPI                | MIT          | ✅ Free        |
| React                  | MIT          | ✅ Free        |

Replaced from TELL (non-commercial components):
- Whisper → Google Chirp
- FastText CC BY-SA → sentence-transformers Apache 2.0
- PySentimiento (non-commercial) → j-hartmann Apache 2.0
- FreeLing AGPL → spaCy MIT
- PRAAT GPL → Librosa ISC + SpeechBrain Apache 2.0
