# Software Architecture Document

**Document ID:** CA-SAD-001  
**Product:** CogAssess — Speech Biomarker Assessment Platform  
**Version:** 1.0  
**Date:** 2026-06-05  
**Status:** Draft  
**Prepared by:** St John Lynch & Co. Ltd / MemoryTell Ltd  
**IEC 62304 Safety Class:** Class B  

---

## Document Control

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1 | 2026-05-15 | Development Team | Initial draft |
| 1.0 | 2026-06-05 | Development Team | First complete release |

---

## Table of Contents

1. Introduction  
2. System Context  
3. High-Level Architecture  
4. Software Items  
   - 4.1 Authentication Module  
   - 4.2 Database Layer  
   - 4.3 API Layer  
   - 4.4 Speech Analysis Pipeline  
   - 4.5 Frontend Application  
5. Internal Interfaces  
6. External Interfaces  
7. Data Architecture  
8. Security Architecture  
9. Deployment Architecture  
10. Architectural Decisions and Rationale  
11. Requirements Traceability  

---

## 1. Introduction

### 1.1 Purpose

This Software Architecture Document (SAD) describes the architecture of the CogAssess software system. It identifies the software items that compose the system, defines their responsibilities and interfaces, and documents the key architectural decisions made during design. It is produced in accordance with IEC 62304:2006+AMD1:2015 §5.3 (Software Architectural Design).

This document is the primary reference for detailed design, implementation, and unit verification activities.

### 1.2 Scope

This document covers CogAssess version 0.5.x and applies to all software items identified within the system boundary. SOUP components are identified and their integration points described; internal design of SOUP components is out of scope.

### 1.3 Referenced Documents

| Reference | Title |
|-----------|-------|
| CA-SRS-001 | CogAssess Software Requirements Specification |
| IEC 62304:2006+AMD1:2015 | Medical device software — Software life cycle processes |
| ISO 14971:2019 | Application of risk management to medical devices |

### 1.4 Definitions

| Term | Definition |
|------|-----------|
| Software Item | A software unit or collection of units that is separately identifiable and testable |
| SOUP | Software of Unknown Provenance — third-party software not developed under this lifecycle |
| API | Application Programming Interface |
| SPA | Single-Page Application — a web application that loads a single HTML page and updates dynamically |
| ORM | Object-Relational Mapper — software that maps database rows to programming language objects |
| JWT | JSON Web Token — a signed, self-contained token used for authentication |
| STT | Speech-to-Text — automated transcription of spoken audio |
| Pipeline | The ordered sequence of analysis stages applied to each recorded audio file |

---

## 2. System Context

CogAssess operates as a local web application. The clinician and patient interact via a browser. The backend runs on the same machine or local server. The only external network dependency is the Google Cloud Speech-to-Text API, which receives audio data (with no patient identifiers) and returns a text transcript.

```
+------------------+        +---------------------------+        +----------------------+
|                  |  HTTP  |                           |  HTTPS |                      |
|   Web Browser    +------->+   CogAssess Backend (API) +------->+  Google Cloud STT    |
| (Clinician/      |        |   FastAPI / Python        |        |  (Chirp V2 model)    |
|  Patient UI)     |<-------+                           |<-------+                      |
|                  |  JSON  |           +               |  JSON  |                      |
+------------------+        |     SQLite Database       |        +----------------------+
                            |     (local filesystem)    |
                            +---------------------------+
                                        |
                             +----------+---------+
                             |  Local Filesystem  |
                             |  (temp audio files)|
                             +--------------------+
```

**System boundary:** All components within the dashed boundary run on the clinician's workstation or local server. The Google Cloud STT API is outside the system boundary and is treated as SOUP (SOUP-001).

---

## 3. High-Level Architecture

CogAssess uses a **three-tier client-server architecture**:

| Tier | Technology | Responsibility |
|------|-----------|----------------|
| Presentation | React 18 SPA (Vite) | Clinician and patient user interface; audio capture |
| Application | FastAPI (Python) | Business logic, pipeline orchestration, authentication, API |
| Data | SQLite via SQLAlchemy ORM | Persistent storage of all patient and assessment records |

The frontend communicates with the backend exclusively via a RESTful JSON API over HTTP. There is no direct database access from the frontend. The backend handles all data validation, authentication enforcement, and pipeline execution.

### 3.1 Software Item Decomposition

The system is decomposed into the following top-level software items:

| Item ID | Name | Location | Language |
|---------|------|----------|----------|
| SI-01 | Authentication Module | `auth.py` | Python |
| SI-02 | Database Layer | `database.py`, `models.py`, `schemas.py` | Python |
| SI-03 | API Layer | `main.py` (endpoint handlers) | Python |
| SI-04 | Speech Analysis Pipeline | `main.py` (pipeline functions) | Python |
| SI-05 | Frontend Application | `frontend/src/` | JavaScript (React) |

---

## 4. Software Items

### 4.1 Software Item SI-01: Authentication Module

**File:** `auth.py`  
**Purpose:** Provides all authentication and authorisation functions used by the API layer.

#### 4.1.1 Responsibilities

- Hash clinician passwords using bcrypt before storage (SRS-SEC-001)
- Verify a supplied plaintext password against a stored bcrypt hash
- Generate signed JWT access tokens using HMAC-SHA256 (SRS-SEC-002)
- Validate incoming JWT tokens on protected API routes (SRS-SEC-003)
- Extract and return the authenticated clinician identity from a validated token
- Enforce token expiry (8-hour lifetime) (SRS-FUN-002)

#### 4.1.2 Key Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `hash_password` | `(password: str) -> str` | Returns bcrypt hash of supplied password |
| `verify_password` | `(plain: str, hashed: str) -> bool` | Returns True if plain matches hash |
| `create_access_token` | `(data: dict) -> str` | Returns signed JWT with 8h expiry |
| `get_current_clinician` | `(token: str, db: Session) -> Clinician` | FastAPI dependency; validates JWT and returns Clinician ORM object |

#### 4.1.3 External Dependencies

| SOUP | Usage |
|------|-------|
| SOUP-008 (python-jose) | JWT signing and validation |
| SOUP-009 (passlib / bcrypt) | Password hashing |

#### 4.1.4 Configuration

The JWT signing key is read from the environment variable `COGASSESS_SECRET_KEY`. If this variable is not set, the module raises a configuration error on startup. The key must be at least 32 bytes of cryptographically random data.

#### 4.1.5 Safety and Security Notes

- The signing key must never be committed to version control.
- Token expiry is enforced server-side on every protected request; client-side expiry indication is supplementary only.
- Failed authentication returns HTTP 401 without indicating whether the username or password was wrong (SRS-FUN-003).

---

### 4.2 Software Item SI-02: Database Layer

**Files:** `database.py`, `models.py`, `schemas.py`  
**Purpose:** Defines all persistent data structures, manages the database connection, and validates data entering and leaving the API.

#### 4.2.1 Sub-items

| Sub-item | File | Responsibility |
|----------|------|----------------|
| SI-02a | `database.py` | SQLAlchemy engine and session factory; `get_db` FastAPI dependency |
| SI-02b | `models.py` | ORM class definitions mapping Python objects to database tables |
| SI-02c | `schemas.py` | Pydantic models for request validation and response serialisation |

#### 4.2.2 Data Models (SI-02b)

**Clinician**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | Integer | PK, auto-increment | |
| username | String | Unique, indexed, not null | Login identifier |
| hashed_password | String | Not null | bcrypt hash only |
| full_name | String | Not null | Display name |
| created_at | DateTime | Default: utcnow | |

**Patient**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | Integer | PK, auto-increment | |
| patient_ref | String | Unique, indexed, not null | Pseudonymised code only — no name |
| date_of_birth | String | Optional | ISO 8601 date string |
| age_band | String | Optional | e.g. "45–54" |
| language | String | Default: "en" | Assessment language |
| l1_language | String | Default: "English" | Patient's first language |
| created_at | DateTime | Default: utcnow | |

**Assessment**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | Integer | PK, auto-increment | |
| assessment_key | String | Unique, indexed, not null | UUID — used in URLs |
| assessment_ref | String | Unique, indexed | CA-YYYY-NNNN — human-readable |
| patient_id | Integer | FK → Patient.id, not null | |
| clinician_id | Integer | FK → Clinician.id, not null | |
| date_of_assessment | String | Not null | ISO 8601 date |
| assessment_type | String | Default: "initial" | initial / repeat |
| referral_source | String | Optional | |
| reason | String | Optional | Clinical reason |
| notes | String | Optional | General notes |
| status | String | Default: "in_progress" | in_progress / complete |
| selected_tasks | Text | Default: JSON list | JSON-serialised task ID list |
| environment | String | Default: "Quiet clinical room" | |
| had_interruptions | String | Default: "None" | None / Minor / Significant |
| interruption_notes | String | Optional | |
| clinical_outcome | String | Optional | Set after findings review |
| follow_up_period | String | Optional | Plain text e.g. "3 months" |
| follow_up_date | String | Optional | ISO 8601 date |
| clinical_notes_findings | Text | Optional | Internal only |
| patient_summary | Text | Optional | Patient-facing text |
| findings_recorded_at | DateTime | Optional | |
| created_at | DateTime | Default: utcnow | |

**TaskResult**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | Integer | PK, auto-increment | |
| assessment_id | Integer | FK → Assessment.id, not null | |
| task_index | Integer | Not null | 0-based position in battery |
| task_id | String | Not null | e.g. "routine", "fluency" |
| transcript | Text | Optional | STT output |
| scores | Text | Not null | JSON: domain scores + composite |
| pipeline | Text | Optional | JSON: raw pipeline measures |
| report | Text | Not null | JSON: flags, composite score |
| recorded_at | DateTime | Default: utcnow | |

#### 4.2.3 Migrations

Database schema changes are managed via `migrate.py`, which uses raw `ALTER TABLE ... ADD COLUMN` statements safe for execution against existing databases. SQLAlchemy's `Base.metadata.create_all()` creates tables on first run.

#### 4.2.4 Safety Notes

- No patient name is stored at any point (SRS-FUN-010).
- Task results are written once per task per assessment; a re-submission overwrites the existing result for that task index, requiring explicit re-submission by the clinician (SRS-SAF-003).

---

### 4.3 Software Item SI-03: API Layer

**File:** `main.py` (endpoint handler functions)  
**Purpose:** Exposes a RESTful HTTP API consumed by the frontend. Orchestrates authentication, database access, and pipeline execution.

#### 4.3.1 API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/health` | No | Service health check |
| POST | `/auth/login` | No | Authenticate clinician; return JWT |
| GET | `/auth/me` | Yes | Return current clinician identity |
| POST | `/clinicians` | Yes | Create new clinician account |
| POST | `/patients` | Yes | Register or retrieve patient |
| GET | `/patients` | Yes | List all patients |
| GET | `/patients/{ref}` | Yes | Get patient by reference |
| POST | `/assessments` | Yes | Create new assessment |
| GET | `/assessments` | Yes | List assessments for current clinician |
| GET | `/assessments/{key}` | Yes | Get full assessment detail including task results |
| POST | `/assessments/{key}/tasks/{idx}` | Yes | Submit task recording; trigger pipeline |
| PUT | `/assessments/{key}/findings` | Yes | Save or update clinical findings |

#### 4.3.2 Assessment Completion Logic

When a task result is submitted (`POST /assessments/{key}/tasks/{idx}`), the API counts the number of TaskResult records for the assessment and compares it against the length of `selected_tasks`. If the counts match, `assessment.status` is set to `"complete"`. This check prevents premature completion if the same task index is re-submitted.

#### 4.3.3 Assessment Reference Generation

`assessment_ref` is generated post-insert (requiring the auto-incremented `id`):

```
assessment_ref = f"CA-{assessment.created_at.year}-{assessment.id:04d}"
```

A two-commit pattern is used: the assessment is committed to obtain its `id`, then `assessment_ref` is set and committed in a second write.

#### 4.3.4 Access Control

Every protected endpoint injects `get_current_clinician` as a FastAPI dependency. This dependency validates the JWT, extracts the clinician identity, and returns the Clinician ORM object. Endpoints that retrieve or modify patient-specific data additionally verify that the requesting clinician is the owner of the assessment (SRS-SEC-004).

#### 4.3.5 CORS Configuration

The API is configured with `allow_origins=["*"]` for development. Production deployments must restrict this to the specific frontend origin.

---

### 4.4 Software Item SI-04: Speech Analysis Pipeline

**File:** `main.py` (pipeline stage functions)  
**Purpose:** Processes a submitted audio recording through five sequential analytical stages and produces biomarker scores, domain sub-scores, and clinical flags.

#### 4.4.1 Pipeline Overview

```
  Audio (WebM)
       |
       v
  [SI-04a] Audio Pre-processor
  Convert WebM -> 16kHz mono WAV (ffmpeg / SOUP-012)
       |
       v
  [SI-04b] Speech Recogniser
  WAV -> transcript (Google Cloud STT / SOUP-001)
       |
       v
  +----+----+
  |         |
  v         v
[SI-04c]  [SI-04d]
Acoustic   Linguistic
Analyser   Analyser
(librosa)  (spaCy)
  |         |
  +----+----+
       |
       v
  [SI-04e] Semantic Scorer
  Transcript -> semantic similarity score (sentence-transformers / SOUP-004)
       |
       v
  [SI-04f] Emotion Classifier
  Transcript -> emotion distribution (HuggingFace / SOUP-005)
       |
       v
  [SI-04g] Score Aggregator & Flag Generator
  All measures -> domain scores, composite score, clinical flags
       |
       v
  Result (JSON: scores, pipeline, report)
```

##### Algorithm Type Classification

In accordance with EU MDR 2017/745 Annex I §17 and FDA AI/ML-Based SaMD guidance, each pipeline stage is classified by algorithm type and lock status. **Locked** algorithms use model weights fixed at the version evaluated in CA-SOUP-001 and are not retrained, fine-tuned, or updated during clinical operation of CogAssess.

| Stage | Sub-item | Algorithm Class | Lock Status |
|-------|----------|-----------------|-------------|
| SI-04a | Audio Pre-processor (ffmpeg) | Deterministic — format conversion | Not applicable (no ML) |
| SI-04b | Speech Recogniser (Google Chirp) | AI inference — deep learning ASR | Locked — API version pinned; model managed by Google LLC |
| SI-04c | Acoustic Analyser (librosa) | Deterministic — digital signal processing | Not applicable (no ML) |
| SI-04d | Linguistic Analyser (spaCy en_core_web_sm) | Rule-based NLP with locked statistical model | Locked — model weights pinned to evaluated version per CA-SOUP-001 |
| SI-04e | Semantic Scorer (all-mpnet-base-v2) | AI inference — pre-trained transformer | **Locked** — weights fixed at evaluated version; CogAssess does not retrain or fine-tune this model |
| SI-04f | Emotion Classifier (emotion-english-distilroberta-base) | AI inference — pre-trained transformer | **Locked** — weights fixed at evaluated version; CogAssess does not retrain or fine-tune this model |
| SI-04g | Score Aggregator | Deterministic — weighted arithmetic | Not applicable (no ML) |

**Locked algorithm statement (SRS-AI-001):** The pre-trained AI/ML components in stages SI-04e and SI-04f are locked algorithms. Model weights are fixed at the versions recorded in CA-SOUP-001. No online learning, transfer learning, or weight modification occurs during clinical operation. Any future model update requires a full SOUP re-evaluation, software verification cycle, and change control approval before incorporation into a released version of CogAssess.

#### 4.4.2 SI-04a: Audio Pre-processor

**SOUP:** ffmpeg (SOUP-012)

| Input | Output |
|-------|--------|
| Audio blob (WebM format, from MediaRecorder API) | 16kHz mono WAV file (temporary) |

Converts the browser-captured WebM audio to a 16kHz mono WAV file required by the STT API and librosa. Uses `subprocess.run` to invoke ffmpeg. The temporary WAV file is deleted in a `finally` block regardless of pipeline success or failure (SRS-SEC-005).

**Error behaviour:** If ffmpeg is not found (`FileNotFoundError`), the pipeline raises an exception. This propagates as HTTP 500 to the client, which displays the error phase on the recording screen. The assessment is not marked complete.

#### 4.4.3 SI-04b: Speech Recogniser

**SOUP:** Google Cloud Speech-to-Text V2 Chirp (SOUP-001)

| Input | Output |
|-------|--------|
| 16kHz mono WAV file | Plain text transcript (string) |

Submits the WAV file to the Google Cloud Speech-to-Text V2 API using the Chirp universal model. Returns the top-confidence transcript as a plain string.

**Error behaviour:** If the transcript is empty or null, the pipeline proceeds but downstream scores are computed against an empty string. The flag generator detects this condition and raises a `Refer`-severity flag indicating transcription failure (SRS-FUN-050, SRS-SAF-006).

**Privacy note:** The audio file is submitted to Google Cloud with no patient identifiers. The GCP project ID is configured via the `GCP_PROJECT_ID` environment variable (SRS-SEC-006).

#### 4.4.4 SI-04c: Acoustic Analyser

**SOUP:** librosa (SOUP-002), numpy (SOUP-013), soundfile (SOUP-014)

| Input | Output |
|-------|--------|
| WAV file path | Dict of acoustic measures |

Extracts the following measures from the raw audio waveform:

| Measure | Description | Clinical significance |
|---------|-------------|----------------------|
| `pause_count` | Number of inter-word silences exceeding 300 ms | Elevated pause frequency is associated with word-finding difficulty and increased cognitive processing demand in MCI |
| `pauses_per_minute` | Normalised pause frequency | Normalises pause count to recording duration; enables comparison across tasks of different lengths |
| `articulation_rate_syl_per_sec` | Estimated syllables per second during voiced segments (pauses excluded) | Reduced rate is a marker of motor speech disorders (Parkinson's disease, dysarthria) and cognitive slowing |
| `hnr_db` | Harmonics-to-noise ratio — ratio of periodic to aperiodic energy in the signal (dB) | Reduced HNR indicates vocal roughness or breathiness; associated with laryngeal involvement in Parkinson's disease |
| `mean_f0_hz` | Mean fundamental frequency (pitch) in Hz | Reduced pitch variability is associated with Parkinson's disease and depression; abnormal mean F0 may indicate neurological or laryngeal involvement |
| `speech_rate_wpm` | Estimated words per minute including pauses | Reduced overall speech rate reflects the combined effect of articulation slowing and increased pausing |

#### 4.4.5 SI-04d: Linguistic Analyser

**SOUP:** spaCy en_core_web_sm (SOUP-003)

| Input | Output |
|-------|--------|
| Transcript string | Dict of linguistic measures |

Extracts the following measures using spaCy morphological and dependency parse:

| Measure | Description | Clinical significance |
|---------|-------------|----------------------|
| `word_count` | Total word count of transcript | Reduced output on open-ended tasks indicates diminished generative capacity; sensitive to MCI and executive dysfunction |
| `unique_words` | Count of unique word types produced | Directly reflects vocabulary breadth; reduced unique word count is associated with semantic memory decline |
| `type_token_ratio` | Lexical diversity: unique word types / total words | Reduced TTR is one of the most replicated speech biomarkers in MCI and early Alzheimer's disease (Petti et al., 2020) |
| `hesitation_count` | Count of filled pauses: uh, um, er | Elevated disfluency reflects anomia and increased cognitive processing load; > 3–4 per structured task is clinically notable |
| `hesitations_per_minute` | Normalised hesitation frequency | Normalises disfluency count to recording duration for cross-task comparison |
| `first_person_ratio` | Proportion of first-person pronouns (I, me, my) among all person references | Reduced self-referential language in personal narrative tasks is associated with episodic memory decline |
| `mean_sentence_length` | Mean words per sentence | Reduced syntactic complexity (shorter sentences) is associated with language impairment in MCI and aphasia |
| `pronoun_count` | Total pronoun usage | Elevated pronoun-to-noun ratio (pronoun substitution for specific nouns) is a recognised anomia marker in early dementia |

#### 4.4.6 SI-04e: Semantic Scorer

**SOUP:** sentence-transformers all-mpnet-base-v2 (SOUP-004)

| Input | Output |
|-------|--------|
| Transcript string | Cosine similarity score (0.0–1.0) |

Encodes the transcript using the all-mpnet-base-v2 sentence embedding model and computes cosine similarity against a task-specific reference corpus embedding. The resulting score is scaled to 0–100 for display.

#### 4.4.7 SI-04f: Emotion Classifier

**SOUP:** j-hartmann/emotion-english-distilroberta-base (SOUP-005)

| Input | Output |
|-------|--------|
| Transcript string | Dict of emotion label → probability scores |

Classifies the transcript across 7 emotion categories (anger, disgust, fear, joy, neutral, sadness, surprise). The output is used as a supplementary indicator; it does not independently determine the composite score.

#### 4.4.8 SI-04g: Score Aggregator and Flag Generator

**Input:** Outputs of SI-04c, SI-04d, SI-04e, SI-04f  
**Output:** `scores` dict, `report` dict containing composite score and clinical flags

**Domain score computation:**

| Domain | Primary inputs |
|--------|---------------|
| `motor_speech` | hnr_db, articulation_rate_syl_per_sec, pause_count |
| `semantic_memory` | semantic similarity score, type_token_ratio, unique_words |
| `episodic_memory` | first_person_ratio, mean_sentence_length, word_count |
| `emotional_processing` | emotion classifier probabilities |

Each domain score is normalised to a 0–100 scale using empirically defined normative ranges. The composite score is the weighted mean of domain scores.

**Clinical flag generation:**

Flags are generated by comparing each individual measure against defined normative thresholds. Each flag has:
- `label`: plain-language description of the finding
- `severity`: `note` / `watch` / `refer`
- `detail`: quantitative observation and clinical context

Severity thresholds:

| Severity | Meaning |
|----------|---------|
| `note` | Measure outside typical range but not clinically urgent; logged for completeness |
| `watch` | Measure warrants monitoring across repeat sessions |
| `refer` | Measure significantly outside normative range; formal assessment recommended |

---

### 4.5 Software Item SI-05: Frontend Application

**Directory:** `frontend/src/`  
**Technology:** React 18, React Router v6, Vite build tool  
**Purpose:** Provides the clinician-facing and patient-facing user interfaces.

#### 4.5.1 Sub-item Decomposition

| Sub-item | Path | Responsibility |
|----------|------|----------------|
| SI-05a | `context/AuthContext.jsx` | Global authentication state; JWT storage and retrieval |
| SI-05b | `App.jsx` | Router configuration; protected route enforcement |
| SI-05c | Pages | Individual screen components (see §4.5.3) |
| SI-05d | Components | Reusable UI components (see §4.5.4) |
| SI-05e | Data | Static task and condition definitions |

#### 4.5.2 SI-05a: Authentication Context

Manages clinician authentication state for the entire frontend application.

- Stores the JWT in `localStorage` under the key `cogassess_token`
- Exposes `login(token, name)`, `logout()`, and `isAuthenticated` to all child components via React Context
- On application load, reads the stored token to restore session across page refreshes
- `logout()` clears `localStorage` and redirects to `/login`

**Note:** Storing JWT in `localStorage` is a deliberate trade-off for simplicity. It is appropriate for a local deployment context. If CogAssess is deployed on a shared network, consideration should be given to `httpOnly` cookie-based token storage.

#### 4.5.3 SI-05c: Pages

| Page | Route | User | Requirement refs |
|------|-------|------|-----------------|
| LoginPage | `/login` | Clinician | SRS-FUN-001 |
| DashboardPage | `/dashboard` | Clinician | SRS-FUN-090, SRS-FUN-091 |
| IntakePage | `/intake` | Clinician | SRS-FUN-010–029 |
| PatientPage | `/assessment/:key/record` | Patient (+ clinician handoff) | SRS-FUN-030–039 |
| ReportPage | `/assessment/:key/report` | Clinician | SRS-FUN-060–067 |
| ClinicalFindingsPage | `/assessment/:key/findings` | Clinician | SRS-FUN-070–075 |
| PatientSummaryPage | `/assessment/:key/summary` | Clinician (for printing) | SRS-FUN-080–083 |
| AboutPage | `/about` | Clinician | — |

#### 4.5.4 SI-05d: Components

| Component | File | Purpose |
|-----------|------|---------|
| Footer | `components/Footer.jsx` | Persistent footer with privacy/terms links |
| PolicyModal | `components/PolicyModal.jsx` | Modal overlay for policy text |
| RecordingWave | `components/RecordingWave.jsx` | Animated visual indicator during recording |
| ScoreRing | `components/ScoreRing.jsx` | Circular score display for task results |

#### 4.5.5 SI-05e: Data Layer

| File | Content |
|------|---------|
| `data/tasks.js` | Definitions for all 8 tasks: id, title, domain, instruction, duration, measures, stimulus (optional), clinicianNote (optional) |
| `data/conditions.js` | Definitions for all 8 condition presets: id, label, description, task list |
| `data/policies.js` | Privacy policy and terms of use text |

#### 4.5.6 Protected Route Enforcement (SI-05b)

All routes except `/login` are wrapped in a `ProtectedLayout` component. `ProtectedLayout` reads `isAuthenticated` from `AuthContext` and redirects to `/login` if false. This enforces client-side route protection (SRS-FUN-005). Server-side enforcement is provided independently by JWT validation on every API request (SRS-SEC-003).

#### 4.5.7 Audio Capture

Audio capture uses the browser `MediaRecorder` API with MIME type `audio/webm`. Chunks are collected in 250ms intervals and assembled into a single `Blob` on recording stop. The blob is submitted to the backend as a `multipart/form-data` POST request.

---

## 5. Internal Interfaces

### 5.1 Frontend ↔ API Layer (SI-05 ↔ SI-03)

All communication uses HTTP/1.1 JSON. The frontend sends a Bearer JWT in every protected request header:

```
Authorization: Bearer <jwt>
```

Responses are JSON objects. Error responses follow FastAPI's default format:

```json
{ "detail": "<error description>" }
```

### 5.2 API Layer ↔ Authentication Module (SI-03 ↔ SI-01)

FastAPI dependency injection. Every protected endpoint declares `get_current_clinician` as a dependency. FastAPI calls this function before the endpoint handler, passing the extracted Bearer token. The function returns a `models.Clinician` ORM object or raises `HTTPException(401)`.

### 5.3 API Layer ↔ Database Layer (SI-03 ↔ SI-02)

FastAPI dependency injection via `get_db`. Every endpoint that accesses the database receives a `Session` object from `SessionLocal`. Sessions are closed after each request.

### 5.4 API Layer ↔ Pipeline (SI-03 ↔ SI-04)

The pipeline is invoked synchronously within the task submission endpoint handler (`POST /assessments/{key}/tasks/{idx}`). The endpoint:
1. Saves the uploaded audio to a temporary file
2. Calls the pipeline function with the temp file path and task ID
3. Receives the result dict (transcript, scores, pipeline data, report)
4. Writes a `TaskResult` ORM record to the database
5. Deletes the temporary file in a `finally` block

### 5.5 Pipeline ↔ SOUP Components (SI-04 ↔ SOUP)

| Interface | Protocol |
|-----------|----------|
| SI-04a → ffmpeg | subprocess call via `subprocess.run` |
| SI-04b → Google Cloud STT | Google Cloud Python client library (gRPC) |
| SI-04c → librosa | Direct Python function calls; numpy arrays |
| SI-04d → spaCy | Direct Python function calls; spaCy Doc objects |
| SI-04e → sentence-transformers | Direct Python function calls; numpy arrays |
| SI-04f → HuggingFace pipeline | Direct Python function calls; dict output |

---

## 6. External Interfaces

### 6.1 Google Cloud Speech-to-Text V2

| Attribute | Value |
|-----------|-------|
| Protocol | gRPC (via Google Cloud Python client) |
| Authentication | Application Default Credentials or service account key |
| Input | 16kHz mono WAV audio bytes |
| Output | JSON transcript with confidence score |
| PII transmitted | None — audio only, no patient reference |
| Failure mode | Empty transcript or exception; treated as pipeline error |

### 6.2 Browser MediaRecorder API

| Attribute | Value |
|-----------|-------|
| Protocol | Browser Web API (JavaScript) |
| MIME type | audio/webm |
| Permission | Requested via `navigator.mediaDevices.getUserMedia` |
| Failure mode | Permission denied → error message shown to patient; recording does not start |

---

## 7. Data Architecture

### 7.1 Database

- **Engine:** SQLite (file-based, single-writer)
- **Location:** `cogassess.db` in the application working directory
- **ORM:** SQLAlchemy 2.x
- **Schema management:** `migrate.py` (additive ALTER TABLE migrations)

### 7.2 Data Flow Summary

```
Patient speaks
     |
     v
Browser (MediaRecorder) -> WebM Blob
     |
     v POST /assessments/{key}/tasks/{idx}
     |
     v
Backend: save to temp file
     |
     v
ffmpeg: convert to WAV
     |
     v
GCP STT: WAV -> transcript
     |
     v
librosa: WAV -> acoustic measures
spaCy: transcript -> linguistic measures
sentence-transformers: transcript -> semantic score
HuggingFace: transcript -> emotion scores
     |
     v
Aggregator: measures -> domain scores + composite + flags
     |
     v
SQLite: write TaskResult record
     |
     v
DELETE temp file
     |
     v
Return JSON result to frontend
     |
     v
Frontend: navigate to next task or report
```

### 7.3 Temporary File Management

Temporary audio files are created in the OS temp directory using Python's `tempfile.mkstemp`. They are always deleted in a `finally` block, ensuring deletion occurs whether or not the pipeline succeeds (SRS-SEC-005).

---

## 8. Security Architecture

### 8.1 Authentication Flow

```
Clinician enters credentials
        |
        v
POST /auth/login
        |
        v
Verify username exists in DB
        |
        v
bcrypt.verify(plaintext, hash)
        |
        v
If match: create_access_token({"sub": username})
        |
        v
Return JWT (8h expiry) to frontend
        |
        v
Frontend stores in localStorage
        |
        v
All subsequent requests: Authorization: Bearer <jwt>
```

### 8.2 Defence in Depth

| Layer | Control |
|-------|---------|
| Network | Local deployment; no external exposure by default |
| API | JWT required on all patient-data endpoints |
| API | Clinician ownership check on assessment access |
| Storage | bcrypt hashed passwords; no plaintext |
| Data | Pseudonymised patient references only |
| External | Audio only submitted to GCP; no PII |
| Filesystem | Temp files deleted immediately post-processing |
| UI | Patient screen never renders scores or flags |

---

## 9. Deployment Architecture

### 9.1 Development Deployment

```
Developer workstation
├── Python venv
│   ├── uvicorn (ASGI server, no --reload in production)
│   └── main.py → listens on localhost:8000
├── Node.js (npm / Vite)
│   └── frontend dev server → listens on localhost:5173
└── cogassess.db (SQLite file, working directory)
```

### 9.2 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `COGASSESS_SECRET_KEY` | Yes | JWT signing key (≥32 bytes random) |
| `GCP_PROJECT_ID` | Yes | Google Cloud project for STT billing |
| `FFMPEG_PATH` | Conditional | Full path to ffmpeg binary if not on system PATH |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes | Path to GCP service account key JSON |

### 9.3 Startup Sequence

1. Set required environment variables
2. Activate Python virtual environment
3. Run `python migrate.py` (if schema updates are pending)
4. Run `python init_db.py` (first run only — seeds admin account)
5. Start backend: `python -m uvicorn main:app`
6. Start frontend dev server: `npm run dev` (from `frontend/`)
7. Open browser to `http://localhost:5173`

---

## 10. Architectural Decisions and Rationale

| Decision | Rationale |
|----------|-----------|
| **Local SQLite rather than cloud database** | Ensures patient data does not leave the clinical environment. Eliminates network dependency for data access. Appropriate for single-site deployment. |
| **Synchronous pipeline execution** | Simplifies error handling and result traceability. For a single-clinician deployment, concurrent pipeline execution is not required. Async execution may be introduced in a future version if multi-site concurrency is needed. |
| **JWT stored in localStorage** | Acceptable for local deployment. Trade-off accepted: simpler implementation vs. XSS risk (mitigated by local-only deployment). |
| **GCP Chirp for STT** | Commercial-grade accuracy for clinical speech, including accented and disfluent speech. Reduces liability for transcription errors compared to self-hosted open-source models. |
| **React SPA with Vite** | Fast development iteration; component-based architecture matches the multi-step assessment flow naturally. |
| **Pseudonymised patient references** | GDPR data minimisation principle. Clinicians maintain the mapping between reference codes and patient identities in their own clinical records system; CogAssess does not need to hold it. |
| **Pipeline as synchronous Python functions** | Enables straightforward unit testing of each stage independently. Each stage function has well-defined inputs and outputs with no shared mutable state. |
| **No automatic deletion of records** | Clinical records must be retained per applicable regulations. Deletion is an administrative action, not a system behaviour. |

---

## 11. Requirements Traceability

| SAD Section | Requirements Addressed |
|-------------|----------------------|
| §4.1 Authentication Module | SRS-FUN-001 – 006, SRS-SEC-001, SRS-SEC-002, SRS-SEC-003 |
| §4.2 Database Layer | SRS-FUN-010, SRS-FUN-015, SRS-FUN-021, SRS-FUN-022, SRS-DAT-001 – 003, SRS-SAF-003, SRS-SAF-008 |
| §4.3 API Layer | SRS-FUN-020 – 029, SRS-FUN-055 – 057, SRS-FUN-070 – 075, SRS-FUN-090 – 092, SRS-SEC-003, SRS-SEC-004 |
| §4.4 Pipeline | SRS-FUN-040 – 050, SRS-SAF-006, SRS-SEC-005, SRS-SEC-006 |
| §4.4a Audio Pre-processor | SRS-INT-021, SRS-SEC-005 |
| §4.4b Speech Recogniser | SRS-FUN-040, SRS-FUN-050, SRS-SAF-006, SRS-INT-020 |
| §4.4c Acoustic Analyser | SRS-FUN-041 |
| §4.4d Linguistic Analyser | SRS-FUN-042 |
| §4.4e Semantic Scorer | SRS-FUN-043 |
| §4.4f Emotion Classifier | SRS-FUN-044 |
| §4.4g Score Aggregator | SRS-FUN-045 – 048 |
| §4.5 Frontend Application | SRS-FUN-030 – 039, SRS-FUN-060 – 067, SRS-FUN-080 – 083, SRS-INT-001 – 005, SRS-SAF-001, SRS-SAF-002 |
| §4.5a Auth Context | SRS-FUN-004, SRS-FUN-005 |
| §4.5b Protected Routes | SRS-FUN-005 |
| §4.5c PatientPage | SRS-FUN-030 – 039, SRS-SAF-002 |
| §4.5c ReportPage | SRS-FUN-060 – 067, SRS-SAF-001 |
| §4.5c ClinicalFindingsPage | SRS-FUN-070 – 075 |
| §4.5c PatientSummaryPage | SRS-FUN-080 – 083 |
| §7 Data Architecture | SRS-DAT-001 – 003, SRS-SEC-005 |
| §8 Security Architecture | SRS-SEC-001 – 007 |
| §9 Deployment | ASM-003 – 005 |

---

*End of document. CA-SAD-001 v1.0.*
