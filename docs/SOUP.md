# SOUP Evaluation Records

| Field | Value |
|---|---|
| Document ID | CA-SOUP-001 |
| Title | Software of Unknown Provenance (SOUP) Evaluation Records — CogAssess Speech Biomarker Assessment Platform |
| Version | 1.0 |
| Date | 2026-06-05 |
| Author | MemoryTell Ltd / St John Lynch & Co. Ltd |
| Status | Released |
| IEC 62304 Software Safety Class | Class B |
| Standard | IEC 62304:2006+A1:2015 §8.1.2 — Software of unknown provenance |
| Companion Documents | CA-RMF-001, CA-SRS-001, CA-SAD-001, CA-SDP-001 |

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [SOUP Identification Criteria](#2-soup-identification-criteria)
3. [Evaluation Methodology](#3-evaluation-methodology)
4. [Anomaly List Review Process](#4-anomaly-list-review-process)
5. [SOUP Evaluation Records](#5-soup-evaluation-records)
6. [SOUP Update Policy](#6-soup-update-policy)
7. [Conclusion](#7-conclusion)
8. [References](#8-references)

---

## 1. Purpose and Scope

### 1.1 Purpose

This document records the identification, evaluation, and risk assessment of all Software of Unknown Provenance (SOUP) components used in CogAssess v1.0, in accordance with IEC 62304:2006+A1:2015 §8.1.2. SOUP is defined as software that is already developed and generally available and that has not been developed for the purpose of being incorporated into the medical device, or software previously developed for which adequate records of the development processes are not available.

For each SOUP component, this document records:

- The component's identity, version, and source.
- Its function within the CogAssess system.
- The anomaly list review conducted.
- Any known issues relevant to the intended use of CogAssess.
- The potential impact of SOUP failure on patient safety.
- Risk control measures applied.
- The software safety classification assigned to the SOUP item under IEC 62304.

### 1.2 Scope

This document covers all third-party open-source and commercial libraries incorporated into CogAssess v1.0, including backend Python dependencies, frontend JavaScript dependencies, AI/ML models, build-time tools, and external service integrations. SOUP components used only at build time and absent from the deployed runtime are identified and assessed as non-safety-critical.

Fourteen SOUP components are evaluated in this document (SOUP-01 to SOUP-14).

---

## 2. SOUP Identification Criteria

A software component is classified as SOUP and subject to the evaluation procedures in this document if it meets any of the following criteria:

1. **Third-party library:** The component is not developed or maintained by MemoryTell Ltd / St John Lynch & Co. Ltd and is incorporated into the CogAssess system via a package manager (pip, npm) or direct inclusion.
2. **External service SDK:** The component is an SDK or client library for an external cloud service (e.g. Google Cloud Platform).
3. **Pre-trained AI/ML model:** The component is a pre-trained machine learning model incorporated into the inference pipeline.
4. **Transitive dependency with direct safety impact:** A transitive dependency that, if it fails, could have a direct impact on the safety or security of the system.

Internal CogAssess code modules (main.py, auth.py, database.py, models.py, schemas.py, init_db.py, migrate.py, and the React frontend source code) are first-party software and are not SOUP. They are subject to the development and verification processes documented in CA-SDP-001 and CA-SVP-001.

---

## 3. Evaluation Methodology

For each SOUP component, the following evaluation steps were performed:

### 3.1 Version Identification

The exact version of each SOUP component in use was identified from the project's dependency management files:

- **Backend (Python):** `requirements.txt` — explicit version pins for all safety-relevant and security-relevant components.
- **Frontend (JavaScript):** `package.json` and `package-lock.json`.
- **AI models:** HuggingFace model card version identifiers recorded at integration.

### 3.2 Anomaly List Review

The publicly available anomaly (defect/issue) list for each component was reviewed. Review sources included:

- PyPI project pages and changelogs.
- GitHub issue trackers and release notes.
- CVE databases (National Vulnerability Database, NIST NVD).
- HuggingFace model cards.
- GCP service release notes and known issue pages.

The review was scoped to anomalies that could plausibly affect the safety, security, or correctness of CogAssess in its intended use. Purely cosmetic or performance-related issues with no safety pathway were noted but not treated as requiring risk controls.

### 3.3 Failure Impact Analysis

For each SOUP component, the failure modes and their potential impact on CogAssess were assessed:

- **Failure mode:** What could go wrong with this component?
- **Impact pathway:** How would that failure manifest in CogAssess?
- **Safety impact:** Could the failure lead to patient harm or a safety hazard identified in CA-RMF-001?

### 3.4 Risk Control Assignment

Where a failure impact was identified as potentially safety-relevant, risk control measures were assigned and cross-referenced to the relevant hazard in CA-RMF-001 or to a specific software requirement in CA-SRS-001.

### 3.5 Safety Classification

Each SOUP component was assigned one of the following IEC 62304 safety classifications:

| Classification | Meaning |
|---|---|
| **Safety-relevant** | Failure of this SOUP component could contribute to a hazard with patient safety implications (S2 or above in CA-RMF-001 terminology). Requires full anomaly list review and documented risk controls. |
| **Non-safety** | Failure of this SOUP component cannot plausibly lead to patient harm. Anomaly list review performed for completeness. |
| **Security-relevant** | Failure of this SOUP component could compromise system security (authentication, data integrity, privacy), which maps to safety hazards H-002, H-005, H-007, H-008 in CA-RMF-001. |

---

## 4. Anomaly List Review Process

The anomaly list review is a documented review of publicly available defect and vulnerability information for each SOUP component. The following process was applied:

1. **Search:** The component name and version were searched in the CVE database (https://nvd.nist.gov/), the relevant GitHub repository issues (filtered by label: "bug", "security"), and the PyPI / npm release history.
2. **Filter:** Anomalies were filtered to those relevant to the intended use of CogAssess — specifically, issues affecting correctness of computation, data integrity, authentication/authorisation, data privacy, or system availability.
3. **Assess:** Each relevant anomaly was assessed for its applicability to CogAssess. Where the CogAssess implementation pattern avoids the known vulnerability or defect (e.g. by not using the affected API or by applying a configuration mitigation), this was documented.
4. **Record:** Findings are recorded in the SOUP Evaluation Records table in Section 5.
5. **Date of review:** All anomaly list reviews in this document were conducted on or before 2026-06-05.

---

## 5. SOUP Evaluation Records

The following table provides the full SOUP evaluation record for all 14 components in CogAssess v1.0.

| SOUP ID | Component | Version | Source | Function in CogAssess System | Anomaly List Reviewed | Known Issues Relevant to Intended Use | Failure Impact | Risk Control | Safety Classification |
|---|---|---|---|---|---|---|---|---|---|
| SOUP-01 | **FastAPI** | 0.115.x | PyPI (https://pypi.org/project/fastapi/) | Python web framework providing all REST API endpoints for the CogAssess backend. Handles HTTP routing, request validation (via Pydantic), dependency injection (including JWT authentication dependencies), and response serialisation. All five pipeline stages are invoked via FastAPI route handlers. | PyPI changelog and GitHub release notes reviewed. No open CVEs identified for FastAPI 0.115.x at date of review. | No known issues affecting safety or security in the current version relevant to CogAssess intended use. Prior versions had issues with dependency injection bypass; current version unaffected. | API endpoints become unavailable. Clinicians cannot submit audio for analysis or retrieve results. Impact is clinician-facing service disruption; no silent incorrect scoring. Hazard H-004 (system unavailable). | User-facing error page displayed on server unavailability (H-004 control). FastAPI version pinned in requirements.txt. | Safety-relevant (availability) |
| SOUP-02 | **SQLAlchemy** | 2.0.50 | PyPI (https://pypi.org/project/SQLAlchemy/) | Object-relational mapper (ORM) for all CogAssess database operations. Manages creation, reading, updating, and deletion of patient session records, assessment records, task responses, and user accounts in the SQLite database. Also used by Alembic for schema migrations. | PyPI changelog and GitHub issue tracker reviewed. No CVEs relevant to SQLAlchemy 2.0.50 ORM data integrity at date of review. | No known data integrity issues in SQLAlchemy 2.0.50 relevant to the CogAssess data access patterns. The 2.0 API (as opposed to legacy 1.x "2.0 compatibility mode") has resolved several implicit commit behaviour issues present in earlier releases. | Database operations fail, potentially resulting in data loss (assessment records not persisted), data corruption, or inability to retrieve records. Could contribute to Hazard H-005 (wrong patient association) if ORM layer silently misroutes queries. | SQLAlchemy 2.0.50 used in full 2.0 API mode (not legacy compatibility mode). SQLite transactional integrity enforced by using explicit session commits. Database migration scripts (migrate.py) managed via Alembic. Version pinned in requirements.txt. | Safety-relevant (data integrity) |
| SOUP-03 | **python-jose** | 3.5.0 | PyPI (https://pypi.org/project/python-jose/) | JWT (JSON Web Token) library used for signing and verifying authentication tokens. All protected CogAssess API endpoints verify the JWT Bearer token using python-jose before processing requests. Token creation (on login) and verification (on every protected request) are the primary use cases. | PyPI release history, GitHub issue tracker (latchset/python-jose), and NVD CVE database reviewed. | **CVE-2024-33663** (algorithm confusion attack): This CVE affected python-jose ≤ 3.3.0. The installed version (3.5.0) postdates this CVE and is not subject to the reported vulnerability. The explicit `algorithms=["HS256"]` specification in all `jose.jwt.decode()` calls in auth.py is retained as defence-in-depth, preventing any algorithm confusion attack regardless of library behaviour. The "none" algorithm is not accepted. **Note:** version discrepancy between the originally evaluated version (3.3.0) and the installed version (3.5.0) was identified by TC-SOUP-001 on 2026-06-06 and resolved by updating the pin in requirements.txt. | JWT verification fails or is bypassed, allowing unauthenticated access to protected endpoints. Contributes to Hazard H-002 (patient data breach). | `algorithms=["HS256"]` explicitly specified in all `jwt.decode()` calls in auth.py. JWT secret key loaded from environment variable (not hardcoded). Token expiry enforced. python-jose pinned to 3.5.0 in requirements.txt. An upgrade path to a more actively maintained JWT library (e.g. PyJWT) remains scheduled for v1.1. | Security-relevant |
| SOUP-04 | **passlib 1.7.4 / bcrypt 4.0.1** | passlib 1.7.4; bcrypt 4.0.1 | PyPI (https://pypi.org/project/passlib/, https://pypi.org/project/bcrypt/) | Password hashing and verification for CogAssess user accounts. passlib provides the high-level `CryptContext` API; bcrypt is the underlying hashing algorithm implementation. Used in auth.py for hashing passwords at registration and verifying passwords at login. | PyPI pages, GitHub repositories (pyca/bcrypt, efficks/passlib), and NVD reviewed. | **Known incompatibility:** bcrypt 4.x introduced a breaking change (removal of the `__about__` attribute) that causes passlib 1.7.4 to raise an `AttributeError` on import in some configurations. passlib 1.7.4 is the last release of passlib and is no longer actively maintained. **Status:** Mitigated in CogAssess. bcrypt pinned to 4.0.1 (the first 4.x release, before further breaking changes). A compatibility patch suppresses the `AttributeError` in main.py startup (patching `passlib.handlers.bcrypt.__about__`). Password hashing and verification have been verified to function correctly with this configuration. | Password hashing fails, preventing user login. If silently returning incorrect hash comparisons, could allow unauthorised access. Contributes to Hazard H-002 (data breach). | bcrypt pinned to exactly 4.0.1 in requirements.txt. Compatibility patch applied in main.py. Integration test verifies that password hash/verify cycle works correctly on application startup. Migration to a maintained alternative (e.g. passlib successor or argon2-cffi) scheduled for v1.1. | Security-relevant |
| SOUP-05 | **uvicorn** | 0.x (latest stable) | PyPI (https://pypi.org/project/uvicorn/) | ASGI server used to serve the FastAPI application. Receives HTTP requests from the frontend and forwards them to the FastAPI application layer. Used both in development and production deployment. | PyPI release history and GitHub issue tracker (encode/uvicorn) reviewed. | **Known environment issue:** uvicorn's `--reload` flag (development auto-reload) uses the `watchfiles` library, which exhibits a crash on Windows systems where the project directory is located on a OneDrive-synced path (due to filesystem event handling conflicts with OneDrive's sync process). This issue has been observed in the CogAssess development environment. **Status:** Mitigated by running uvicorn without the `--reload` flag. In production deployment, auto-reload is not used. This is a non-safety, developer-environment-only issue. | ASGI server crash causes complete API unavailability. Contributes to Hazard H-004 (system unavailable). Does not produce silent incorrect results. | Production deployment does not use `--reload`. Development documentation notes the OneDrive path restriction. uvicorn version tracked in requirements.txt. | Non-safety (availability only; no silent failure pathway) |
| SOUP-06 | **google-cloud-speech (GCP Chirp)** | Latest stable (GCP managed) | Google Cloud Platform — Speech-to-Text API (https://cloud.google.com/speech-to-text) | Google Cloud Speech-to-Text (Chirp model) is used in Stage 2 of the CogAssess analysis pipeline to transcribe the patient's audio recording into text. The transcript is the primary input to the linguistic (spaCy) and semantic (sentence-transformers) scoring stages. Without a valid transcript, downstream scoring cannot proceed. | GCP Speech-to-Text release notes, GCP Known Issues page, and GCP Service Level Agreement reviewed. | **Network dependency:** The GCP STT API requires outbound internet connectivity. Network failure, GCP service outage, or API quota exhaustion will cause the STT call to return an empty or error response. This is the primary cause pathway for Hazard H-003 (silent failure / empty transcript). **English-language model:** The Chirp model is optimised for English. Performance may degrade for non-English speakers. This contributes to Hazard H-009. | Empty or malformed transcript returned. If not handled, downstream scoring stages would receive empty input and may return zero scores silently, contributing to Hazard H-003 (false normal score). | Empty transcript detection enforced at STT output (SRS-SAF-006, SRS-FUN-050): empty or whitespace-only transcript raises an explicit error state rather than proceeding to scoring. Error displayed to clinician in UI. L1 warning for non-English speakers (H-009 control, SRS-FUN-014). | Safety-relevant (H-003, H-009) |
| SOUP-07 | **librosa** | 0.10.x | PyPI (https://pypi.org/project/librosa/) | Acoustic feature extraction library. Used in Stage 3 of the pipeline to compute acoustic biomarker features from the patient's audio recording, including: Mel-Frequency Cepstral Coefficients (MFCCs), fundamental frequency (pitch) statistics, speech rate estimation, and pause ratio calculation. These features contribute to the acoustic dimension of the CogAssess biomarker score. | PyPI changelog and GitHub issue tracker (librosa/librosa) reviewed. No open CVEs for librosa. | No safety-relevant issues identified in librosa 0.10.x for the CogAssess use case. Prior versions had issues with specific edge cases in onset detection; 0.10.x is stable for the MFCC and pitch extraction functions used by CogAssess. Librosa may return NaN or zero values for very short or silent audio segments. | Incorrect or NaN acoustic feature values returned, contributing to an inaccurate biomarker score. Contributes to Hazard H-001 (incorrect score → erroneous clinical decision) and Hazard H-010 (noisy environment). | Numeric output range validation applied to all librosa feature outputs before pipeline aggregation; NaN and zero values are flagged and do not silently propagate as normal scores. Version pinned in requirements.txt. | Safety-relevant (H-001, H-010) |
| SOUP-08 | **spaCy** | 3.7.x | PyPI (https://pypi.org/project/spacy/) | Natural language processing library. Used in Stage 4 of the pipeline for linguistic feature extraction, including: part-of-speech (POS) tagging, dependency parsing, sentence segmentation, and lexical diversity metrics. The linguistic features contribute to the linguistic dimension of the CogAssess biomarker score. English-language model `en_core_web_sm` or `en_core_web_md` used. | PyPI changelog and GitHub issue tracker (explosion/spaCy) reviewed. No CVEs for spaCy 3.7.x. | No safety-relevant issues identified in spaCy 3.7.x for the CogAssess use case. The English NLP models are well-validated for standard English text. Performance degrades for non-standard English (non-native speakers, dialectal variation), which is addressed by the L1 warning (H-009). | Incorrect POS tagging or dependency parse reduces the accuracy of linguistic feature scores. Contributes to Hazard H-001 (incorrect score). POS tagging failures do not cause application crashes; they produce degraded but non-null output. | spaCy model version pinned in requirements.txt. L1 language warning displayed for non-English L1 speakers (SRS-FUN-014). Output scores are one of five pipeline components; no single component score is displayed in isolation without context. | Safety-relevant (H-001, H-009) |
| SOUP-09 | **sentence-transformers** | 3.x | PyPI / HuggingFace (https://www.sbert.net/) | Semantic similarity scoring library. Used in Stage 5 of the pipeline to compute the semantic coherence score: sentence embeddings are generated for the patient's transcript, and cosine similarity is calculated between the transcript and a reference prompt embedding. The semantic similarity score contributes to the semantic dimension of the CogAssess biomarker score. | PyPI changelog, GitHub issue tracker (UKPLab/sentence-transformers), and HuggingFace model card for the deployed model reviewed. | No safety-relevant issues identified in sentence-transformers 3.x for the CogAssess use case. The library is stable and widely used in production NLP systems. The semantic score is one of five pipeline dimensions; a single incorrect semantic score does not solely determine the overall biomarker output. | Incorrect semantic similarity score returned. Contributes to Hazard H-001. The impact is moderated by the fact that the semantic score is one of multiple pipeline components. | Model version pinned at integration. Output range validation applied (cosine similarity is bounded [−1, 1]; values outside expected range flagged). Version recorded in requirements.txt. | Safety-relevant (H-001) |
| SOUP-10 | **transformers / HuggingFace emotion classifier (j-hartmann/emotion-english-distilroberta-base)** | transformers 4.x; model: j-hartmann/emotion-english-distilroberta-base (HuggingFace) | HuggingFace Hub (https://huggingface.co/j-hartmann/emotion-english-distilroberta-base) | Emotion detection component. Used in Stage 5 of the pipeline to classify the emotional valence and discrete emotion category (e.g. joy, sadness, fear, anger, neutral) of the patient's transcript. Emotion classification contributes to the affective dimension of the CogAssess biomarker score and supplements the semantic coherence score. | HuggingFace model card reviewed. transformers library changelog and GitHub issue tracker (huggingface/transformers) reviewed. | **English-only model:** The `j-hartmann/emotion-english-distilroberta-base` model is trained on English-language data only. For non-English L1 speakers or patients with strong non-native English accents, emotion classification accuracy may be materially reduced. This contributes to Hazard H-009 (non-English L1 speaker scores misinterpreted). **Model version:** The model is pinned to a specific HuggingFace commit hash at integration to prevent silent model updates. | Incorrect emotion classification score returned, contributing to Hazard H-001. Non-English L1 degradation contributes to Hazard H-009. | Model version pinned to a specific HuggingFace commit/revision at integration time; not auto-updated. L1 language warning displayed for non-English L1 speakers (SRS-FUN-014). Amber warning explicitly notes that emotion classification is English-language only. Output confidence scores reviewed; low-confidence outputs flagged. | Safety-relevant (H-001, H-009) |
| SOUP-11 | **React** | 18.x | npm (https://www.npmjs.com/package/react) | Core frontend UI framework. Provides the component model, state management, and rendering engine for the CogAssess single-page application. All clinician-facing UI screens (login, patient intake, recording, report view) are React components. | GitHub release notes (facebook/react) and npm advisory database reviewed. No CVEs for React 18.x affecting CogAssess use case. | No safety-relevant issues identified in React 18.x for the CogAssess intended use. React 18's concurrent rendering features are not used in CogAssess v1.0; the standard rendering model is used throughout. | Frontend UI becomes non-functional or renders incorrectly. Clinician cannot submit recordings or view results. Impact is service disruption (H-004); no pathway to silent incorrect scoring. | Version tracked in package.json. React version does not affect backend scoring logic; UI failure is visible to the clinician. | Non-safety |
| SOUP-12 | **React Router** | v6.x | npm (https://www.npmjs.com/package/react-router-dom) | Client-side routing library for the CogAssess single-page application. Manages navigation between pages (login, dashboard, patient intake, task recording, report). | GitHub release notes (remix-run/react-router) and npm advisory database reviewed. No CVEs identified for React Router v6.x. | No known issues relevant to CogAssess intended use. Incorrect routing could cause a clinician to navigate to the wrong page, but the backend enforces record-level access controls so incorrect routing cannot expose other patients' data. | Clinician navigates to wrong page or routing fails. Does not create a pathway to incorrect scoring. Minor usability issue. | Version tracked in package.json. Backend access controls independent of frontend routing. | Non-safety |
| SOUP-13 | **Vite** | 5.x | npm (https://www.npmjs.com/package/vite) | Frontend build tool. Used to bundle and compile the React SPA during the build process. Vite is a build-time dependency only; it is not present in the deployed runtime application. The compiled static assets (HTML, JS, CSS) are served independently of Vite. | GitHub release notes (vitejs/vite) and npm advisory database reviewed. | No known issues relevant to CogAssess intended use. Vite build tool vulnerabilities (e.g. CVE-2025-30208 path traversal in development server) do not affect the deployed production application as Vite's development server is not used in production. | Build failure prevents generation of the deployable frontend artefact. No runtime safety impact; failure is visible at build time. | Vite is not present in the deployed runtime. Build-time only dependency. Version tracked in package.json. | Non-safety (build-time only) |
| SOUP-14 | **pandoc** | 3.x | System package (https://pandoc.org/) | Document conversion tool. Used to convert CogAssess compliance documentation (Markdown source) to DOCX format for regulatory submission. pandoc is a documentation-pipeline tool only; it is not invoked at runtime by the CogAssess application and is not present in the deployed system. | pandoc release notes and CVE database reviewed. No CVEs relevant to CogAssess use. | No known issues relevant to CogAssess intended use. pandoc conversion errors affect documentation formatting only; they have no impact on the clinical software system. | Documentation conversion fails; DOCX output is incorrect or unavailable. No runtime safety impact. | Not present in deployed runtime. Documentation pipeline only. Version noted for reproducibility. | Non-safety (documentation pipeline only) |

---

## 6. SOUP Update Policy

### 6.1 Annual Review

All SOUP components shall be reviewed at least annually. The annual review shall include:

1. Re-checking the CVE database and package changelogs for each SOUP component for newly disclosed vulnerabilities or anomalies.
2. Assessing whether any new issues are relevant to the CogAssess intended use.
3. Updating this document to reflect the current anomaly review date.
4. Determining whether any SOUP component should be updated, replaced, or subject to additional risk controls.

### 6.2 Version Pinning

All safety-relevant and security-relevant SOUP components shall have their versions explicitly pinned in `requirements.txt` (backend) and `package.json` / `package-lock.json` (frontend). Unpinned or floating version specifications (e.g. `>=X.Y`) are not permitted for safety-relevant components. This prevents uncontrolled silent updates that could introduce new anomalies or breaking changes.

### 6.3 Re-evaluation on Major Version Changes

When a SOUP component is updated to a new major version (e.g. from FastAPI 0.x to 1.x, or from sentence-transformers 3.x to 4.x), a full re-evaluation of that component shall be performed using the methodology in Section 3. The new version's anomaly list shall be reviewed, and any new failure modes or known issues shall be assessed and documented. This re-evaluation shall be completed before the updated version is incorporated into a released version of CogAssess.

Minor and patch version updates (e.g. 0.115.1 → 0.115.2) may be incorporated following a targeted anomaly list review focused on the specific changes in the minor/patch release, without requiring a full re-evaluation, provided:

- The changelog does not indicate changes to the component's safety-relevant or security-relevant functions.
- No new CVEs have been disclosed for the updated version.

### 6.4 Triggered Review

In addition to the scheduled annual review, a SOUP re-evaluation shall be triggered by any of the following events:

- A new CVE is disclosed for a SOUP component used by CogAssess.
- A SOUP component is updated in the production deployment (any version increment).
- A new failure mode is identified in the CogAssess system that may be attributable to a SOUP component.
- A SOUP component vendor announces end-of-life or cessation of maintenance.

### 6.5 Specific Planned Actions (v1.1)

The following SOUP-related improvements are planned for CogAssess v1.1:

| Action | Component | Rationale |
|---|---|---|
| Migrate JWT library from python-jose to PyJWT | SOUP-03 (python-jose) | python-jose is less actively maintained than PyJWT; CVE-2024-33663 mitigated in current version but migration reduces long-term risk. |
| Migrate password hashing from passlib/bcrypt to argon2-cffi | SOUP-04 (passlib) | passlib 1.7.4 is the final release (unmaintained); argon2-cffi is actively maintained and uses the recommended Argon2id algorithm. |

---

## 7. Conclusion

Fourteen SOUP components have been identified, evaluated, and documented in accordance with IEC 62304:2006+A1:2015 §8.1.2. Of these:

- **9 components** are classified as safety-relevant or security-relevant (SOUP-01 through SOUP-10).
- **4 components** are classified as non-safety (SOUP-11 through SOUP-14).

Two known issues with potential safety or security relevance were identified:

1. **CVE-2024-33663 (python-jose, SOUP-03):** Algorithm confusion vulnerability — mitigated by explicitly specifying `algorithms=["HS256"]` in all JWT decode calls.
2. **passlib/bcrypt incompatibility (SOUP-04):** bcrypt 4.x breaking change — mitigated by pinning bcrypt==4.0.1 and applying a compatibility patch in main.py.

Both issues have been mitigated in CogAssess v1.0 at the implementation level. No unmitigated safety-relevant or security-relevant anomalies are present in the released system.

All residual risks associated with SOUP component failure are reflected in the hazard analysis in CA-RMF-001. The overall SOUP risk profile of CogAssess v1.0 is assessed as acceptable.

---

## 8. References

| Reference | Title |
|---|---|
| IEC 62304:2006+A1:2015 | Medical device software — Software life cycle processes (§8.1.2 SOUP requirements) |
| ISO 14971:2019 | Application of risk management to medical devices |
| CA-RMF-001 | CogAssess Risk Management File |
| CA-SRS-001 | CogAssess Software Requirements Specification |
| CA-SAD-001 | CogAssess Software Architecture Description |
| CA-SDP-001 | CogAssess Software Development Plan |
| NVD | NIST National Vulnerability Database — https://nvd.nist.gov/ |
| PyPI | Python Package Index — https://pypi.org/ |
| HuggingFace Hub | https://huggingface.co/ |
| GCP Speech-to-Text | https://cloud.google.com/speech-to-text/docs/release-notes |

---

*End of CA-SOUP-001 v1.0*
