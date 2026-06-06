# Software Requirements Specification

**Document ID:** CA-SRS-001  
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
| 0.1 | 2026-05-01 | Development Team | Initial draft |
| 1.0 | 2026-06-05 | Development Team | First complete release |

---

## Table of Contents

1. Introduction  
2. Overall System Description  
3. Functional Requirements  
4. External Interface Requirements  
5. Performance Requirements  
6. Safety Requirements  
7. Security Requirements  
8. Data Requirements  
9. Software of Unknown Provenance (SOUP)  
10. Constraints  
11. Requirements Traceability Matrix  

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for the CogAssess software system. It is produced in accordance with IEC 62304:2006+AMD1:2015 (Medical device software — Software life cycle processes) for a Class B software system.

This document serves as the primary reference for design, implementation, verification, and validation activities throughout the software development lifecycle.

### 1.2 Scope

**Product name:** CogAssess  
**Version scope:** v0.5.x (current development series)

CogAssess is a clinical-grade speech biomarker assessment platform designed for use by qualified clinicians. The system records spoken audio from patients performing structured speech tasks, processes the audio through a multi-stage analytical pipeline, and produces quantitative biomarker scores and clinical flag indicators to assist clinicians in evaluating cognitive function.

CogAssess is intended as a clinical decision support tool. It does not issue diagnoses, prescribe treatment, or control any therapeutic device. All outputs are interpreted by a qualified clinician.

### 1.3 Intended Use

CogAssess is intended to be used by qualified healthcare professionals (clinicians, speech and language therapists, neuropsychologists, or similarly qualified practitioners) to assist in the assessment of speech and language biomarkers associated with cognitive conditions including but not limited to:

- Mild cognitive impairment (MCI)
- Early-stage dementia
- Traumatic brain injury (TBI) / concussion
- Autism spectrum disorder (ASD) / Asperger's syndrome
- Depression and anxiety
- Parkinson's disease and other motor speech disorders

The software is not intended for use as a standalone diagnostic tool. Outputs must be interpreted in the context of full clinical assessment.

### 1.4 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|-----------|
| API | Application Programming Interface |
| Assessment | A complete session comprising one or more speech tasks for a single patient |
| Assessment Key | A system-generated UUID uniquely identifying an assessment record |
| Assessment Ref | A human-readable identifier (e.g. CA-2026-0001) assigned to each assessment |
| Biomarker | A quantitative measure derived from speech analysis used as an indicator of cognitive function |
| Clinician | An authenticated user of the CogAssess system; a qualified healthcare professional |
| CRUD | Create, Read, Update, Delete |
| GCP | Google Cloud Platform |
| JWT | JSON Web Token |
| L1 | First (native) language of the patient |
| SOUP | Software of Unknown Provenance — third-party software components incorporated into the system |
| SRS | Software Requirements Specification |
| STT | Speech-to-Text |
| Task | A single structured speech exercise within an assessment |
| UUID | Universally Unique Identifier |

### 1.5 Referenced Standards and Documents

| Reference | Title |
|-----------|-------|
| IEC 62304:2006+AMD1:2015 | Medical device software — Software life cycle processes |
| ISO 14971:2019 | Medical devices — Application of risk management to medical devices |
| IEC 62366-1:2015 | Medical devices — Usability engineering |
| GDPR (EU) 2016/679 | General Data Protection Regulation |
| Health Research Regulations 2018 (Ireland) | Statutory Instrument No. 314 of 2018 |
| CA-SAD-001 | CogAssess Software Architecture Document (companion document) |

### 1.6 Document Overview

Section 2 describes the overall system context and classification. Section 3 defines functional requirements. Sections 4–8 cover non-functional requirements. Section 9 lists all SOUP components. Section 10 lists constraints. Section 11 provides a traceability matrix linking requirements to design and test artefacts.

---

## 2. Overall System Description

### 2.1 Product Context

CogAssess operates as a client-server web application deployed on a local clinical network or workstation. The backend analytical pipeline runs on the host machine; an internet connection is required only for the Google Cloud Speech-to-Text transcription service. All patient data and assessment records are stored locally.

The system interacts with:
- The clinician via a web browser (clinician-facing UI)
- The patient via a simplified recording interface (patient-facing UI, browser-based)
- Google Cloud Speech-to-Text V2 API (external service, read-only: audio in, transcript out)
- The local filesystem (temporary audio files)
- A local SQLite database (persistent storage)

### 2.2 User Classes

| User Class | Description | Access Level |
|------------|-------------|--------------|
| Clinician | Qualified healthcare professional conducting assessments | Full access to all clinical data and reports |
| Patient | Assessment subject — interacts only with the recording interface | Recording interface only; no access to scores or reports |
| Administrator | System administrator responsible for user account management | Clinician account creation; no direct patient data access required |

### 2.3 Operating Environment

| Component | Specification |
|-----------|--------------|
| Host OS | Windows 10/11 (primary); Linux (supported) |
| Browser | Google Chrome 120+, Microsoft Edge 120+, Firefox 120+ |
| Network | Local network or localhost; internet required for STT |
| Audio hardware | Microphone accessible to the browser (built-in or external) |
| Python runtime | Python 3.10–3.13 |
| Node.js | 18 LTS or higher (build/dev environment) |

### 2.4 Software Safety Classification

In accordance with IEC 62304 Clause 4.3, CogAssess is classified as **Class B** software.

**Justification:** A failure of the CogAssess software could result in a clinician receiving erroneous or missing biomarker data. In the most serious credible scenario, this could contribute to a delayed or incorrect clinical decision. However, CogAssess is not used in isolation — results are always interpreted within a broader clinical context — and it does not directly control any therapeutic device or administer any treatment. Death or serious irreversible injury as a direct consequence of a software failure is not considered a reasonably foreseeable outcome.

### 2.5 Assumptions and Dependencies

| ID | Assumption / Dependency |
|----|------------------------|
| ASM-001 | The clinician is a qualified healthcare professional capable of interpreting biomarker indicators in clinical context. |
| ASM-002 | The host workstation has a working microphone accessible to the browser. |
| ASM-003 | An active internet connection is available for Google Cloud Speech-to-Text transcription. |
| ASM-004 | The Google Cloud project credentials (Application Default Credentials or service account key) are correctly configured on the host. |
| ASM-005 | ffmpeg is installed and accessible on the host system (via FFMPEG_PATH environment variable or system PATH). |
| ASM-006 | The clinician obtains appropriate patient consent before conducting an assessment. |
| ASM-007 | The system is operated on a device compliant with the organisation's IT security policy. |

---

## 3. Functional Requirements

Requirements are identified as **SRS-FUN-NNN**. Priority: **M** = Mandatory, **D** = Desirable.

### 3.1 Clinician Authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-FUN-001 | The system shall require clinicians to authenticate with a username and password before accessing any patient data or clinical functionality. | M |
| SRS-FUN-002 | The system shall issue a time-limited session token (JWT) upon successful authentication. Session tokens shall expire after no more than 8 hours of inactivity. | M |
| SRS-FUN-003 | The system shall reject authentication attempts with invalid credentials and shall not disclose whether the username or password was incorrect. | M |
| SRS-FUN-004 | The system shall provide a logout function that invalidates the current session token immediately. | M |
| SRS-FUN-005 | The system shall redirect unauthenticated users to the login screen when they attempt to access protected routes. | M |
| SRS-FUN-006 | The system shall support the creation of new clinician accounts by a user with administrator privileges. | M |

### 3.2 Patient Registration

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-FUN-010 | The system shall allow a clinician to register a patient using a pseudonymised patient reference code. No patient name shall be stored in the system. | M |
| SRS-FUN-011 | The system shall record the patient's date of birth (optional) and shall automatically derive and display the appropriate age band from the date of birth. | M |
| SRS-FUN-012 | The system shall record the patient's age band (Under 18 / 18–24 / 25–34 / 35–44 / 45–54 / 55–64 / 65–74 / 75–84 / 85+). Age band may be set manually if date of birth is not available. | M |
| SRS-FUN-013 | The system shall record the patient's first (native) language (L1). | M |
| SRS-FUN-014 | The system shall display a warning when the patient's L1 is not English, indicating that fluency scores may be affected. | M |
| SRS-FUN-015 | If a patient with the given reference already exists in the system, the system shall use the existing record rather than creating a duplicate. | M |

### 3.3 Assessment Creation and Configuration

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-FUN-020 | The system shall allow a clinician to create a new assessment linked to an existing patient record. | M |
| SRS-FUN-021 | The system shall generate a unique assessment key (UUID) for each assessment at the time of creation. | M |
| SRS-FUN-022 | The system shall generate a human-readable assessment reference (format: CA-YYYY-NNNN) for each assessment, unique within the system. | M |
| SRS-FUN-023 | The system shall record the date of assessment, assessment type (initial / repeat), referral source, and clinical reason. | M |
| SRS-FUN-024 | The system shall record the recording environment (e.g. Quiet clinical room, Home visit) for each assessment. | M |
| SRS-FUN-025 | The system shall record whether interruptions occurred during the assessment and allow free-text notes where interruptions are recorded. | M |
| SRS-FUN-026 | The system shall allow the clinician to select a clinical condition preset to pre-configure the task battery (minimum 8 presets: General screening, Early dementia, TBI/Concussion, ASD, Asperger's syndrome, Depression/Anxiety, Parkinson's/Motor speech, Dyslexia). | M |
| SRS-FUN-027 | The system shall allow the clinician to customise the task battery by individually enabling or disabling tasks from the available set (minimum 8 tasks). | M |
| SRS-FUN-028 | The system shall not allow an assessment to be created with zero tasks selected. | M |
| SRS-FUN-029 | The system shall display the domain, estimated duration, and clinical measures associated with each task to assist the clinician in task selection. | D |

### 3.4 Audio Recording

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-FUN-030 | The system shall request microphone permission from the browser before initiating any recording. | M |
| SRS-FUN-031 | The system shall display a clear and accessible recording interface to the patient, showing only the task instruction. Biomarker scores, clinical flags, and clinician information shall not be visible on the patient-facing screen. | M |
| SRS-FUN-032 | The system shall display the task instruction text clearly and at an accessible font size during recording. | M |
| SRS-FUN-033 | The system shall display a countdown timer showing the remaining recording time for each task. | M |
| SRS-FUN-034 | The system shall automatically stop recording when the allotted task duration expires. | M |
| SRS-FUN-035 | The system shall allow the patient (or clinician on the patient's behalf) to stop recording early. | M |
| SRS-FUN-036 | For tasks requiring a clinician preparatory action (e.g. reading a stimulus story), the system shall display an interstitial screen requiring clinician confirmation before handing the device to the patient. | M |
| SRS-FUN-037 | For tasks with a reading stimulus (e.g. read-aloud passage), the system shall display the stimulus text prominently on the patient-facing screen. | M |
| SRS-FUN-038 | The system shall display a visual progress indicator showing which tasks have been completed and which remain in the current assessment. | M |
| SRS-FUN-039 | The system shall display a processing indicator while the submitted recording is being analysed. | M |

### 3.5 Speech Analysis Pipeline

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-FUN-040 | The system shall transcribe each recorded audio file to text using an automated speech recognition service before analysis. | M |
| SRS-FUN-041 | The system shall extract acoustic features from each recording including: speech rate (syllables per second), articulation rate, pause count, pause frequency, harmonics-to-noise ratio (HNR), and mean fundamental frequency (F0). | M |
| SRS-FUN-042 | The system shall perform lexical and syntactic analysis of each transcript including: word count, type-token ratio (TTR), mean utterance length, pronoun usage, and hesitation marker frequency (uh, um, er). | M |
| SRS-FUN-043 | The system shall perform semantic analysis by computing the semantic similarity between the transcript and a reference corpus relevant to the task domain. | M |
| SRS-FUN-044 | The system shall classify the emotional content of each transcript across a minimum of 7 emotion categories. | M |
| SRS-FUN-045 | The system shall compute a composite biomarker score (0–100 scale) for each task from the combined analytical measures. | M |
| SRS-FUN-046 | The system shall compute domain-specific sub-scores for each task in the following domains where applicable: motor speech, semantic memory, episodic memory, and emotional processing. | M |
| SRS-FUN-047 | The system shall generate clinical flags for each task, categorised by severity (Note / Watch / Refer), where individual measures fall outside expected normative ranges. | M |
| SRS-FUN-048 | Each clinical flag shall include a plain-language explanation of the observed measure and its clinical significance. | M |
| SRS-FUN-049 | The system shall store the full pipeline output (transcript, scores, flags, acoustic features) for each completed task in the database. | M |
| SRS-FUN-050 | If the speech recognition service is unavailable or returns an empty transcript, the system shall record an error state for the affected task and shall not silently produce invalid scores. | M |

### 3.6 Assessment Progress and Completion

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-FUN-055 | The system shall allow an assessment to be resumed from the correct task if interrupted, without requiring previously completed tasks to be repeated. | M |
| SRS-FUN-056 | The system shall mark an assessment as complete only when all selected tasks have been submitted and processed. | M |
| SRS-FUN-057 | The system shall redirect a clinician to the report page if they attempt to access the recording interface for an already-completed assessment. | M |

### 3.7 Clinical Reporting

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-FUN-060 | The system shall generate a clinical report page for each completed assessment, accessible to authenticated clinicians only. | M |
| SRS-FUN-061 | The clinical report shall display, for each completed task: the task name, domain-specific scores, composite score, score risk level (Low risk / Moderate / Elevated), and all clinical flags. | M |
| SRS-FUN-062 | The clinical report shall display a cumulative summary panel showing: mean composite score across all tasks, mean domain scores, consolidated clinical flags (deduplicated, highest severity wins), and overall risk level. | M |
| SRS-FUN-063 | The clinical report shall display a population comparison chart (normal distribution, μ=70, σ=15) showing where the patient's domain scores and composite score fall relative to the reference population. | M |
| SRS-FUN-064 | The clinical report shall display a session conditions panel showing L1 language, recording environment, and any interruptions, with amber or red warnings where conditions may affect score validity. | M |
| SRS-FUN-065 | The clinical report shall display the full transcript for each completed task, accessible via an expandable section. | D |
| SRS-FUN-066 | The clinical report shall display a prominent notice that all outputs are for clinician interpretation only and do not constitute a diagnosis. | M |
| SRS-FUN-067 | The clinical report shall display the assessment reference, patient reference, date of assessment, clinician name, and assessment type. | M |

### 3.8 Clinical Findings

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-FUN-070 | The system shall provide a clinical findings form allowing the clinician to record: clinical outcome, follow-up period, follow-up date, internal clinical notes, and a patient-facing summary. | M |
| SRS-FUN-071 | The system shall provide the following clinical outcome options as a minimum: No issue found; Monitor — review in 3 months; Monitor — review in 6 months; Monitor — review in 12 months; Refer for specialist review; Refer urgently. | M |
| SRS-FUN-072 | The system shall prompt the clinician to enter a follow-up date when a monitoring outcome is selected. | M |
| SRS-FUN-073 | Internal clinical notes shall be stored in the system and shall not be accessible via the patient-facing summary page. | M |
| SRS-FUN-074 | The system shall record the date and time at which clinical findings were saved. | M |
| SRS-FUN-075 | The system shall allow previously saved clinical findings to be updated by the recording clinician. | M |

### 3.9 Patient Summary

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-FUN-080 | The system shall provide a patient summary page containing: assessment reference, patient reference, date of assessment, clinician name, clinical outcome (in plain language), follow-up date (if applicable), and the clinician-authored patient summary text. | M |
| SRS-FUN-081 | The patient summary page shall not display any numerical biomarker scores, domain sub-scores, composite scores, or clinical flag details. | M |
| SRS-FUN-082 | The patient summary page shall be printable (print / save as PDF) with navigation and clinical UI elements hidden in the printed output. | M |
| SRS-FUN-083 | The patient summary page shall display a plain-language disclaimer stating that the summary does not constitute a medical diagnosis. | M |

### 3.10 Dashboard and Record Management

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-FUN-090 | The system shall provide a dashboard listing all assessments accessible to the authenticated clinician, including: assessment reference, patient reference, date, status, and task count. | M |
| SRS-FUN-091 | The dashboard shall display assessments in reverse chronological order (most recent first). | M |
| SRS-FUN-092 | The system shall allow navigation from the dashboard to the clinical report for any completed assessment. | M |

---

## 4. External Interface Requirements

### 4.1 User Interface

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-INT-001 | The user interface shall be operable in a standard web browser without requiring additional plugins or extensions. | M |
| SRS-INT-002 | The interface shall meet WCAG 2.1 Level AA accessibility guidelines, including sufficient colour contrast ratios and keyboard navigability. | M |
| SRS-INT-003 | The patient-facing recording interface shall be designed for minimal cognitive load — large text, single clear action per screen. | M |
| SRS-INT-004 | The system shall provide a visible "skip to main content" link for keyboard and screen reader users. | M |
| SRS-INT-005 | The system shall remain usable on screen widths down to 375px (mobile devices). | D |

### 4.2 Hardware Interfaces

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-INT-010 | The system shall access the device microphone via the browser Web Audio / MediaRecorder API. It shall not access audio hardware directly. | M |
| SRS-INT-011 | The system shall request microphone permission using the browser's standard permission mechanism. If permission is denied, the system shall display a clear error message and shall not proceed to recording. | M |

### 4.3 Software Interfaces (SOUP)

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-INT-020 | The system shall interface with Google Cloud Speech-to-Text V2 API (Chirp model) for audio transcription using the official Google Cloud Python client library. | M |
| SRS-INT-021 | Audio submitted to the Google Cloud Speech-to-Text API shall be pre-converted to 16kHz mono WAV format using ffmpeg prior to submission. | M |
| SRS-INT-022 | The system shall use the librosa Python library for acoustic feature extraction. | M |
| SRS-INT-023 | The system shall use the spaCy Python library (en_core_web_sm model) for syntactic and morphological analysis. | M |
| SRS-INT-024 | The system shall use the sentence-transformers library (all-mpnet-base-v2 model) for semantic similarity scoring. | M |
| SRS-INT-025 | The system shall use the j-hartmann/emotion-english-distilroberta-base model via the HuggingFace transformers library for emotion classification. | M |

### 4.4 Communications Interfaces

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-INT-030 | All communication between the frontend client and the backend API shall use HTTP/1.1 or HTTP/2 over localhost or local network. | M |
| SRS-INT-031 | All API endpoints that access patient data shall require a valid JWT Bearer token in the Authorization header. | M |
| SRS-INT-032 | The backend API shall implement CORS (Cross-Origin Resource Sharing) headers permitting requests from the configured frontend origin. | M |

---

## 5. Performance Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-PRF-001 | The system shall return the analysis pipeline result for a single task within 60 seconds of audio submission under normal operating conditions. | M |
| SRS-PRF-002 | The system shall load the dashboard page within 3 seconds under normal network conditions. | D |
| SRS-PRF-003 | The audio recording interface shall initialise and be ready for recording within 2 seconds of the clinician initiating the recording phase. | M |
| SRS-PRF-004 | The system shall handle at least 10 simultaneous assessments (across different clinician sessions) without degradation in pipeline response time exceeding 50%. | D |

---

## 6. Safety Requirements

The following requirements are derived from the risk analysis activities conducted in accordance with ISO 14971.

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-SAF-001 | The system shall display a prominent, non-dismissible notice on every clinical report screen stating that outputs are for clinician interpretation only and do not constitute a diagnosis. | M |
| SRS-SAF-002 | The patient-facing recording interface shall not display any numerical scores, risk levels, or clinical flag text at any point during or after recording. | M |
| SRS-SAF-003 | The system shall not overwrite a previously saved task result without explicit re-submission by the clinician. | M |
| SRS-SAF-004 | The system shall display an amber warning on the clinical report when the patient's L1 is not English, indicating potential impact on fluency-related scores. | M |
| SRS-SAF-005 | The system shall display an amber or red warning on the clinical report when suboptimal recording conditions (non-quiet environment, interruptions) were recorded. | M |
| SRS-SAF-006 | The system shall not proceed to biomarker scoring if the speech recognition stage returns an empty or null transcript; it shall instead record an error state for that task. | M |
| SRS-SAF-007 | Clinical flag severity levels (Note, Watch, Refer) shall be consistently and accurately applied according to the normative thresholds defined in the design specification. | M |
| SRS-SAF-008 | The system shall record the assessment reference, patient reference, clinician identity, date and time, and all task results immutably in the database upon completion. | M |

---

## 7. Security Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-SEC-001 | Clinician passwords shall be hashed using bcrypt with a minimum cost factor of 12 rounds before storage. Plaintext passwords shall not be stored or logged. | M |
| SRS-SEC-002 | JWT session tokens shall be signed using HMAC-SHA256 (HS256). The signing key shall be at least 32 bytes of cryptographically random data, stored as an environment variable and not committed to version control. | M |
| SRS-SEC-003 | All API endpoints that return patient or assessment data shall validate the JWT token and return HTTP 401 if the token is absent, malformed, or expired. | M |
| SRS-SEC-004 | The system shall enforce that a clinician can only access assessment data associated with their own account. | M |
| SRS-SEC-005 | Temporary audio files created during pipeline processing shall be deleted from the filesystem immediately after processing is complete, regardless of whether processing succeeded or failed. | M |
| SRS-SEC-006 | No patient identifiable data shall be transmitted to third-party services. Audio submitted to the Google Cloud STT service shall not be linked to patient identifiers at the API level. | M |
| SRS-SEC-007 | The SQLite database file shall be stored in the application working directory. Organisations are responsible for applying appropriate filesystem-level access controls and encryption at rest. | M |
| SRS-SEC-008 | API error responses shall not expose internal implementation details. Response bodies for HTTP 4xx and 5xx errors shall contain only a brief, user-facing message and must not include Python stack traces, SQL error messages, database file paths, ORM class names, or framework version strings. | M |
| SRS-SEC-009 | The server shall validate and constrain all client-submitted input. Database queries shall use parameterised statements (SQLAlchemy ORM). JSON request bodies shall be validated against a Pydantic schema; unrecognised fields shall be silently discarded. The server shall not crash or return HTTP 5xx in response to malformed, oversized, or injection-pattern input. | M |

---

## 8. Data Requirements

### 8.1 Data Entities

| Entity | Key Fields | Notes |
|--------|------------|-------|
| Clinician | id, username (hashed), hashed_password, full_name, created_at | No email stored by default |
| Patient | id, patient_ref (pseudonymised), date_of_birth, age_band, language, l1_language, created_at | No name stored |
| Assessment | id, assessment_key (UUID), assessment_ref, patient_id, clinician_id, date_of_assessment, type, status, selected_tasks, environment, had_interruptions, interruption_notes, clinical_outcome, follow_up_period, follow_up_date, clinical_notes_findings, patient_summary, findings_recorded_at, created_at | |
| TaskResult | id, assessment_id, task_index, task_id, transcript, scores (JSON), pipeline (JSON), report (JSON), recorded_at | Raw pipeline output retained |

### 8.2 Data Retention

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-DAT-001 | All assessment records, task results, and clinical findings shall be retained in the local database until explicitly deleted by an authorised administrator. | M |
| SRS-DAT-002 | The system shall not implement automatic deletion or expiry of patient records. | M |
| SRS-DAT-003 | Organisations shall be responsible for defining and enforcing their own data retention policies in line with applicable regulations. | M |

---

## 9. Software of Unknown Provenance (SOUP)

The following third-party components are incorporated into CogAssess. In accordance with IEC 62304 Clause 8.1.2, each SOUP component has been identified and its intended use documented. For Class B software, anomaly lists for each SOUP shall be evaluated as part of the risk management process.

| SOUP ID | Component | Version | Supplier | Intended Use | Safety Impact |
|---------|-----------|---------|----------|--------------|---------------|
| SOUP-001 | Google Cloud Speech-to-Text V2 (Chirp) | API v2 | Google LLC | Audio transcription | Medium — incorrect transcript affects all downstream scores |
| SOUP-002 | librosa | 0.10.x | librosa contributors | Acoustic feature extraction | Medium — incorrect acoustic measures affect motor speech scores |
| SOUP-003 | spaCy (en_core_web_sm) | 3.x | Explosion AI | Syntactic / morphological NLP analysis | Low–Medium — affects lexical and fluency scores |
| SOUP-004 | sentence-transformers (all-mpnet-base-v2) | Latest stable | HuggingFace / UKP Lab | Semantic similarity scoring | Low–Medium — affects semantic memory scores |
| SOUP-005 | j-hartmann/emotion-english-distilroberta-base | HuggingFace | joeddav / HuggingFace | Emotion classification | Low — supplementary indicator only |
| SOUP-006 | FastAPI | 0.111+ | Sebastián Ramírez | Backend API framework | Low — infrastructure component |
| SOUP-007 | SQLAlchemy | 2.x | SQLAlchemy contributors | ORM / database access layer | Medium — data integrity of all records |
| SOUP-008 | python-jose | 3.x | Michael Hart | JWT token generation and validation | High — authentication and access control |
| SOUP-009 | passlib / bcrypt | 1.7.x / 4.0.x | passlib contributors | Password hashing | High — clinician credential security |
| SOUP-010 | React | 18.x | Meta (Facebook) | Frontend UI framework | Low — rendering only |
| SOUP-011 | React Router | 6.x | Remix Software | Client-side routing | Low — navigation only |
| SOUP-012 | ffmpeg | 8.x | FFmpeg contributors | Audio format conversion (WebM to WAV) | Medium — failed conversion prevents analysis |
| SOUP-013 | numpy | Latest stable | NumPy contributors | Numerical computation (pipeline calculations) | Low–Medium — affects score calculation |
| SOUP-014 | soundfile | Latest stable | libsndfile contributors | Audio file I/O | Low — pre-processing step |

### 9.1 AI/ML Algorithm Locking Requirements

Pre-trained AI/ML models incorporated in the CogAssess pipeline are classified as **locked algorithms** in accordance with FDA AI/ML-Based SaMD guidance and EU MDR 2017/745 Annex I §17. A locked algorithm is one whose model parameters (weights) are fixed and do not change based on new data encountered during clinical operation.

| ID | Requirement | Priority |
|----|-------------|----------|
| SRS-AI-001 | The pre-trained transformer models used in the CogAssess pipeline — Stage SI-04e (all-mpnet-base-v2) and Stage SI-04f (emotion-english-distilroberta-base) — shall be locked algorithms. Model weights shall be fixed at the version evaluated in CA-SOUP-001 and shall not be retrained, fine-tuned, or automatically updated during clinical operation or deployment of CogAssess. | M |
| SRS-AI-002 | Any update to a locked AI/ML model component shall require a full SOUP re-evaluation per IEC 62304 §8.1.2, re-execution of all verification test cases affected by the change, and change control approval before the updated model is incorporated into a released version of CogAssess. | M |

---

## 10. Constraints

| ID | Constraint |
|----|-----------|
| CON-001 | The system is implemented using Python (backend) and React/JavaScript (frontend). No other primary languages shall be introduced without a change control process. |
| CON-002 | All patient data shall be stored locally. Cloud-based database services shall not be used without a formal Data Processing Agreement review. |
| CON-003 | The Google Cloud Speech-to-Text service must be used for transcription; no alternative STT service is currently qualified. |
| CON-004 | The frontend shall be a single-page application (SPA) delivered by a Vite-based build. |
| CON-005 | The backend API shall conform to the OpenAPI 3.x specification (auto-generated by FastAPI). |
| CON-006 | The system shall operate without a dedicated GPU. All ML inference shall run on CPU. |

---

## 11. Requirements Traceability Matrix

The following matrix maps each functional requirement to its corresponding design element and planned test case. Full test case definitions are maintained in the Software Verification Plan (CA-SVP-001).

| Requirement ID | Description (summary) | Design Reference | Test Case ID |
|----------------|----------------------|------------------|--------------|
| SRS-FUN-001 | Clinician login required | CA-SAD §3.1 | TC-AUTH-001 |
| SRS-FUN-002 | JWT 8-hour expiry | CA-SAD §3.1 | TC-AUTH-002 |
| SRS-FUN-003 | Invalid credential handling | CA-SAD §3.1 | TC-AUTH-003 |
| SRS-FUN-010 | Pseudonymised patient registration | CA-SAD §3.2 | TC-PAT-001 |
| SRS-FUN-011 | Auto age band from DOB | CA-SAD §3.2 | TC-PAT-002 |
| SRS-FUN-014 | Non-English L1 warning | CA-SAD §3.2 | TC-PAT-003 |
| SRS-FUN-020 | Assessment creation | CA-SAD §3.3 | TC-ASS-001 |
| SRS-FUN-022 | Human-readable assessment ref | CA-SAD §3.3 | TC-ASS-002 |
| SRS-FUN-026 | Condition preset selection | CA-SAD §3.3 | TC-ASS-003 |
| SRS-FUN-030 | Microphone permission request | CA-SAD §3.4 | TC-REC-001 |
| SRS-FUN-031 | No scores on patient screen | CA-SAD §3.4 | TC-REC-002 |
| SRS-FUN-040 | STT transcription | CA-SAD §3.5 | TC-PIP-001 |
| SRS-FUN-045 | Composite score computation | CA-SAD §3.5 | TC-PIP-002 |
| SRS-FUN-047 | Clinical flag generation | CA-SAD §3.5 | TC-PIP-003 |
| SRS-FUN-050 | Empty transcript error handling | CA-SAD §3.5 | TC-PIP-004 |
| SRS-FUN-060 | Clinical report access | CA-SAD §3.6 | TC-REP-001 |
| SRS-FUN-063 | Population comparison chart | CA-SAD §3.6 | TC-REP-002 |
| SRS-FUN-066 | Clinician-only notice on report | CA-SAD §3.6 | TC-REP-003 |
| SRS-FUN-070 | Clinical findings form | CA-SAD §3.7 | TC-FIND-001 |
| SRS-FUN-073 | Internal notes not on patient summary | CA-SAD §3.7 | TC-FIND-002 |
| SRS-FUN-080 | Patient summary content | CA-SAD §3.8 | TC-SUM-001 |
| SRS-FUN-081 | No scores on patient summary | CA-SAD §3.8 | TC-SUM-002 |
| SRS-FUN-082 | Patient summary printable | CA-SAD §3.8 | TC-SUM-003 |
| SRS-SAF-001 | Clinician-only notice | CA-SAD §4.1 | TC-SAF-001 |
| SRS-SAF-002 | No scores on patient screens | CA-SAD §4.1 | TC-SAF-002 |
| SRS-SAF-006 | Empty transcript error state | CA-SAD §4.1 | TC-SAF-003 |
| SRS-SEC-001 | bcrypt password hashing | CA-SAD §4.2 | TC-SEC-001 |
| SRS-SEC-002 | JWT HS256 signing | CA-SAD §4.2 | TC-SEC-002, TC-OWA-003, TC-OWA-004, TC-OWA-005 |
| SRS-SEC-003 | JWT validation on all protected endpoints — 401 if absent/malformed/expired | CA-SAD §4.2 | TC-OWA-010 |
| SRS-SEC-004 | Clinician can only access their own assessment data | CA-SAD §4.2 | TC-OWA-001, TC-OWA-002 |
| SRS-SEC-005 | Temp audio file deletion | CA-SAD §4.2 | TC-SEC-003 |
| SRS-SEC-006 | No PII to third-party services | CA-SAD §4.2 | TC-SEC-004 |
| SRS-SEC-008 | Error responses must not expose internal implementation details | CA-SAD §4.2 | TC-OWA-006 |
| SRS-SEC-009 | Input validation — parameterised queries, schema validation, no 5xx on bad input | CA-SAD §4.2 | TC-OWA-007, TC-OWA-008, TC-OWA-009 |
| SRS-AI-001 | Locked AI/ML model weights — no retraining during clinical use | CA-SAD §4.4, §9.1 | TC-SOUP-001, TC-SOUP-002 |
| SRS-AI-002 | AI/ML model update requires SOUP re-evaluation and change control | CA-SAD §4.4, §9.1 | — |
| SRS-SOUP-001 | Safety-relevant SOUP packages have exact version pins | CA-SAD §9 | TC-SOUP-001 |
| SRS-SOUP-002 | Safety-relevant SOUP packages installed in deployment environment | CA-SAD §9 | TC-SOUP-002 |
| SRS-SOUP-003 | No HIGH or CRITICAL CVEs in installed SOUP packages | CA-SAD §9 | TC-SOUP-003 |

---

*End of document. CA-SRS-001 v1.0.*
