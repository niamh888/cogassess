# Software Verification Plan

**Document ID:** CA-SVP-001  
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
2. Verification Approach  
3. Verification Levels  
4. Test Environment Requirements  
5. Acceptance Criteria  
6. Test Cases — AUTH Group  
7. Test Cases — PAT Group  
8. Test Cases — ASS Group  
9. Test Cases — REC Group  
10. Test Cases — PIP Group  
11. Test Cases — REP Group  
12. Test Cases — FIND Group  
13. Test Cases — SUM Group  
14. Test Cases — SAF Group  
15. Test Cases — SEC Group  
16. Test Results Summary Table  

---

## 1. Introduction

### 1.1 Purpose

This Software Verification Plan (SVP) defines the approach, environment, test cases, and acceptance criteria for the verification of the CogAssess software system. It is produced in accordance with IEC 62304:2006+AMD1:2015 §5.6 (Software Integration and Integration Testing) and §5.7 (Software System Testing) for a Class B medical device software system.

The purpose of verification is to confirm that the implemented software meets the requirements stated in CA-SRS-001. Verification asks: "Did we build it right?" It is distinct from clinical validation, which asks: "Did we build the right thing?" and is addressed separately.

### 1.2 Scope

This plan covers all verification activities for CogAssess v0.5.0-beta and subsequent versions within the 0.x development series. It encompasses:

- Authentication and access control (AUTH)
- Patient registration and management (PAT)
- Assessment creation and management (ASS)
- Recording workflow (REC)
- Speech analysis pipeline (PIP)
- Clinical report (REP)
- Clinical findings (FIND)
- Patient summary (SUM)
- Safety requirements (SAF)
- Security requirements (SEC)

Clinical validation (demonstrating clinical utility in patient populations) is outside the scope of this document.

### 1.3 Relationship to Other Documents

This SVP references requirements defined in CA-SRS-001. Every test case carries one or more SRS requirement IDs to maintain traceability. Test results, once recorded, are stored in the SVP Test Results Record (a companion spreadsheet or table appended to this document at time of execution), which is referenced in the Software Release Record CA-SRR-001.

---

## 2. Verification Approach

### 2.1 Overall Strategy

Verification of CogAssess is conducted at three levels (unit, integration, system), described in Section 3. The overall verification strategy is:

1. **Requirements-driven:** Every Mandatory requirement in CA-SRS-001 must have at least one test case in this plan.
2. **Safety-first:** All safety requirements (SRS-SAF-xxx) must be tested before any release; SAF test cases may not be deferred.
3. **Traceability:** Every test case references the SRS requirement(s) it verifies; results are cross-referenced in the traceability matrix.
4. **Repeatability:** Tests are documented with sufficient detail to be repeated by any competent developer or QA reviewer, not just the original author.
5. **Independence:** System-level and safety-related tests must be reviewed by the QA Reviewer before the gate review.

### 2.2 Verification Methods

Tests employ the following verification methods:

| Method | Description |
|--------|-------------|
| **Manual** | Tester executes steps manually via the browser UI or API client (e.g. curl, Postman, HTTPie) and records result |
| **Automated** | Test is executed by a test framework (pytest for backend; planned Jest/React Testing Library for frontend); output is a pass/fail record |
| **Inspection** | Tester inspects source code, configuration, or database content directly to verify a condition |
| **Analysis** | Tester decodes or analyses an artefact (e.g. a JWT token, a DOM tree) to verify a property |

Where a test can be automated, automation is preferred. Manual tests remain in the plan as the verification method until automation is implemented.

### 2.3 Regression Policy

Following any defect fix or code change:

- All test cases that cover the affected requirement(s) must be re-executed.
- All SAF and SEC group test cases must be re-executed on every release regardless of change scope.
- The Development Lead may waive re-execution of unaffected test cases for patch releases, provided the waiver is documented in the gate review record.

---

## 3. Verification Levels

### 3.1 Unit Verification

Unit verification confirms that individual software items (modules, functions, classes) behave correctly in isolation. SOUP components are not unit tested by this plan; their verification is addressed in CA-SOUP-001.

| Attribute | Detail |
|-----------|--------|
| Scope | Individual Python functions/classes; individual React components |
| Tool | pytest (backend), Jest + React Testing Library (frontend, planned) |
| Coverage target | 80% line coverage for all non-SOUP backend modules (target; not yet enforced by CI) |
| Who executes | Developer (authored); QA Reviewer (spot-check) |
| When | After implementation of each feature; before PR merge |

### 3.2 Integration Verification

Integration verification confirms that software items work correctly together and that internal interfaces between items are implemented correctly.

| Attribute | Detail |
|-----------|--------|
| Scope | API endpoint interactions; pipeline stage sequencing; database read/write cycles |
| Tool | pytest with test database; manual API testing via Postman/curl |
| Key integration points | Auth module ↔ API layer; API layer ↔ Database layer; API layer ↔ Pipeline; Pipeline stages (ffmpeg → STT → librosa → spaCy → transformers → aggregator) |
| Who executes | Developer |
| When | After each software item is integrated; before system testing |

### 3.3 System Verification

System verification confirms end-to-end behaviour of the complete integrated system against the requirements in CA-SRS-001.

| Attribute | Detail |
|-----------|--------|
| Scope | Full system from browser UI to database and external services |
| Tool | Manual execution per test cases in Sections 6–15 |
| Environment | Controlled verification environment (see Section 4) |
| Who executes | Developer executes; QA Reviewer reviews results |
| When | Before each gate review |

---

## 4. Test Environment Requirements

### 4.1 Backend Environment

| Item | Requirement |
|------|-------------|
| Operating system | Windows 11 (production parity) or Ubuntu 22.04 LTS |
| Python version | 3.10 or higher (within 3.10–3.13 range) |
| Dependencies | All packages installed from pinned `requirements.txt` via `pip install -r requirements.txt` |
| Database | Fresh SQLite test database (`cogassess_test.db`); not the production database |
| Environment variables | `.env` file with `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `GOOGLE_APPLICATION_CREDENTIALS` set to test values |
| Backend server | `uvicorn main:app --reload` running on `http://localhost:8000` |

### 4.2 Frontend Environment

| Item | Requirement |
|------|-------------|
| Node.js version | 18 LTS |
| Dependencies | `npm ci` from committed `package-lock.json` |
| Build | Development build via `npm run dev` (Vite); target `http://localhost:5173` |
| Browser | Google Chrome (latest stable) as primary; Firefox (latest stable) as secondary |

### 4.3 Test Data

| Dataset | Description |
|---------|-------------|
| Test clinician account | Username: `test_clinician`; password: `TestPass1!`; created fresh for each test session |
| Test patient records | At least 3 synthetic patients: one adult (DOB giving age 45–65), one older adult (DOB giving age 70+), one with L1 set to French |
| Test audio files | Minimum two WAV files: one containing clearly intelligible English speech (≥10 words); one empty/silent WAV |
| Synthetic JWT | A JWT signed with the correct key but with `exp` set to a past timestamp (for TC-AUTH-002) |

No real patient data or identifiable information may be used in the test environment.

### 4.4 External Service

For tests involving the speech analysis pipeline, the Google Cloud STT (Chirp) API must be accessible and the `GOOGLE_APPLICATION_CREDENTIALS` environment variable must point to a valid GCP service account key file. If GCP access is unavailable, pipeline tests (TC-PIP-xxx) may be executed against a mock/stub STT service, provided this is documented in the test results record.

---

## 5. Acceptance Criteria

### 5.1 Individual Test Case Pass Criteria

A test case passes when all conditions stated in its Pass Criteria section are met. A test case fails if any single condition is not met.

### 5.2 Release Acceptance Criteria

The following aggregate criteria must be met before any release increment may be approved at gate review:

| Criterion | Threshold |
|-----------|-----------|
| All Mandatory SRS requirements have at least one test case | 100% |
| All test cases executed in the current increment | 100% |
| All SAF group test cases passed | 100% — no exceptions |
| All SEC group test cases passed | 100% — no exceptions |
| All AUTH group test cases passed | 100% — no exceptions |
| Overall test case pass rate (all groups) | ≥ 95% |
| Remaining failures | Documented as open defects; severity assessed; none Critical or Major |

### 5.3 Incomplete Test Execution

If a test case cannot be executed (e.g. external service unavailable, test environment issue), it must be recorded as "Blocked" with the reason. Blocked tests do not count as passes. A release may not proceed with any Blocked SAF or SEC test cases.

---

## 6. Test Cases — AUTH Group

Authentication requirements verify that the system correctly enforces access control using JWT-based authentication.

---

### TC-AUTH-001: Clinician Login Required

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-AUTH-001 |
| **Requirement(s)** | SRS-FUN-001 |
| **Description** | Verify that unauthenticated requests to the `/assessments` endpoint return HTTP 401 Unauthorized, confirming that the endpoint is protected and cannot be accessed without a valid JWT. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. CogAssess backend is running on `http://localhost:8000`.
2. No JWT token is held in the test client.

**Test Steps:**

1. Using an API client (curl, Postman, or HTTPie), send a GET request to `http://localhost:8000/assessments` with **no** `Authorization` header.
2. Record the HTTP response status code.
3. Record the response body.
4. Repeat the request with an `Authorization` header containing an empty string.
5. Record the HTTP response status code for step 4.

**Expected Result:**

- Steps 1–3: HTTP 401 Unauthorized is returned. The response body contains an error detail such as `{"detail": "Not authenticated"}` or equivalent.
- Steps 4–5: HTTP 401 Unauthorized is returned.

**Pass Criteria:**

- Both unauthenticated requests return HTTP status 401.
- Neither request returns HTTP 200 or any assessment data.

---

### TC-AUTH-002: JWT 8-Hour Expiry

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-AUTH-002 |
| **Requirement(s)** | SRS-FUN-002 |
| **Description** | Verify that (a) tokens are issued with an 8-hour expiry, and (b) an expired token is rejected with HTTP 401. |
| **Verification Method** | Inspection + Manual |

**Preconditions:**

1. CogAssess backend is running.
2. Test clinician account exists in the test database.
3. A synthetic expired JWT is available (signed with the correct `SECRET_KEY`, with `exp` claim set to a timestamp in the past — e.g. current time minus 9 hours).

**Test Steps:**

**Part A — Verify 8-hour expiry on issued token:**

1. Send a POST request to `http://localhost:8000/token` with form data `username=test_clinician&password=TestPass1!`.
2. Record the full response including the `access_token` value.
3. Base64-decode the middle segment (payload) of the returned JWT (split on `.`).
4. Locate the `exp` claim in the decoded payload.
5. Locate the `iat` (issued-at) claim in the decoded payload.
6. Calculate the difference: `exp - iat`.

**Part B — Verify expired token is rejected:**

1. Send a GET request to `http://localhost:8000/assessments` with the `Authorization` header set to `Bearer <expired_jwt>` (the synthetic expired token from preconditions).
2. Record the HTTP response status code.

**Expected Result:**

- Part A: `exp - iat` equals 28800 seconds (8 × 3600). The decoded payload contains both `exp` and `iat` claims with numeric (Unix timestamp) values.
- Part B: HTTP 401 Unauthorized is returned. The response body indicates token expiry (e.g. `{"detail": "Token has expired"}` or equivalent from python-jose).

**Pass Criteria:**

- `exp - iat` is exactly 28800 seconds (or within ±5 seconds if clock skew during test execution).
- Expired token request returns HTTP 401.
- No assessment data is returned with an expired token.

---

### TC-AUTH-003: Invalid Credential Handling

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-AUTH-003 |
| **Requirement(s)** | SRS-FUN-003 |
| **Description** | Verify that login attempts with incorrect credentials are rejected with HTTP 401 in all combinations: wrong username only, wrong password only, and both wrong. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. CogAssess backend is running.
2. Test clinician account exists: `test_clinician` / `TestPass1!`.
3. The username `wrong_user` does not exist in the database.

**Test Steps:**

1. Send POST to `/token` with `username=wrong_user&password=TestPass1!` (wrong username, correct password format).
2. Record the HTTP status code and response body.
3. Send POST to `/token` with `username=test_clinician&password=WrongPassword99!` (correct username, wrong password).
4. Record the HTTP status code and response body.
5. Send POST to `/token` with `username=wrong_user&password=WrongPassword99!` (both wrong).
6. Record the HTTP status code and response body.
7. Verify that in no case is an `access_token` present in any response.

**Expected Result:**

All three requests return HTTP 401 Unauthorized. No `access_token` is present in any response body.

**Pass Criteria:**

- All three combinations return HTTP 401.
- No access token is issued for any invalid credential combination.
- Response body for each failure contains an appropriate error message (e.g. `{"detail": "Incorrect username or password"}`).

---

## 7. Test Cases — PAT Group

Patient management requirements verify that the system handles patient records in a manner consistent with pseudonymisation and clinical data governance requirements.

---

### TC-PAT-001: Pseudonymised Patient Registration

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-PAT-001 |
| **Requirement(s)** | SRS-FUN-010 |
| **Description** | Verify that the patient registration endpoint does not accept or store a patient name field, and that a `patient_ref` pseudonymous identifier is accepted and stored correctly. |
| **Verification Method** | Inspection + Manual |

**Preconditions:**

1. CogAssess backend is running.
2. Authenticated JWT token available for test clinician.

**Test Steps:**

1. Inspect the Pydantic schema for patient creation (in `schemas.py`): confirm there is no `name`, `first_name`, or `last_name` field.
2. Send a POST request to `/patients` with a valid patient payload including `patient_ref: "PT-TEST-001"` and other required fields. Include an `Authorization: Bearer <token>` header.
3. Record the HTTP response status code and response body.
4. Send a POST request to `/patients` with a payload that includes an additional `name: "John Smith"` field.
5. Record the HTTP response status code and whether the name was stored.
6. Inspect the database record for the patient created in step 2: confirm that `patient_ref` is stored as provided.

**Expected Result:**

- Step 1: No name-related field exists in the patient schema.
- Step 2: HTTP 201 Created (or 200 OK). Patient record created with `patient_ref = "PT-TEST-001"`.
- Step 4: Either HTTP 422 Unprocessable Entity (if additional fields are forbidden) or the `name` field is silently ignored and not stored. In no case is a patient name persisted to the database.
- Step 6: Database record contains `patient_ref = "PT-TEST-001"` and no name field.

**Pass Criteria:**

- Schema inspection confirms absence of name field.
- `patient_ref` is stored correctly.
- No name is stored in the database under any column.

---

### TC-PAT-002: Auto Age Band from Date of Birth

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-PAT-002 |
| **Requirement(s)** | SRS-FUN-011 |
| **Description** | Verify that when a date of birth is provided at patient registration, the system automatically populates the `age_band` field with the correct band. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. CogAssess backend is running with authenticated token.
2. The age banding logic is known (e.g. 18–44, 45–64, 65–74, 75+).

**Test Steps:**

1. Register a patient with `date_of_birth` calculated to give age 52 at the test date (2026-06-05). Example: `1974-01-01`.
2. Record the `age_band` value returned in the response.
3. Register a second patient with `date_of_birth` calculated to give age 72. Example: `1954-01-01`.
4. Record the `age_band` value returned in the response.
5. Register a third patient with `date_of_birth` calculated to give age 30. Example: `1996-01-01`.
6. Record the `age_band` value returned in the response.
7. For each patient, retrieve the record via GET `/patients/<id>` and confirm `age_band` is stored correctly.

**Expected Result:**

- Patient aged 52: `age_band` = `"45-64"` (or equivalent band label).
- Patient aged 72: `age_band` = `"65-74"` (or equivalent band label).
- Patient aged 30: `age_band` = `"18-44"` (or equivalent band label).

**Pass Criteria:**

- `age_band` is automatically populated for all three patients.
- The band values are correct for the given dates of birth.
- The clinician did not manually specify `age_band` in any request.

---

### TC-PAT-003: Non-English L1 Warning

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-PAT-003 |
| **Requirement(s)** | SRS-FUN-014 |
| **Description** | Verify that when a patient's first language (L1) is set to a language other than English, an amber warning is displayed on the clinical report page. |
| **Verification Method** | Manual |

**Preconditions:**

1. CogAssess full stack (backend + frontend) is running.
2. Test clinician is logged in.
3. A completed assessment exists for a patient whose `l1_language` is set to `"French"`.

**Test Steps:**

1. Navigate to the clinical report page for the assessment linked to the French-L1 patient.
2. Inspect the report page for the presence of a warning indicator.
3. Confirm that the warning is visually distinct (amber/yellow colour or equivalent warning styling).
4. Read and record the warning text.
5. Repeat steps 1–4 for an assessment linked to a patient with `l1_language = "English"`.

**Expected Result:**

- French-L1 patient report: An amber warning is visible, stating words to the effect that the patient's first language is not English and that speech analysis results may not reflect population norms for English speakers.
- English-L1 patient report: No such warning is shown.

**Pass Criteria:**

- Amber warning is present on the non-English L1 report.
- Warning is absent on the English L1 report.
- Warning text clearly communicates the clinical implication (not merely a colour change).

---

## 8. Test Cases — ASS Group

Assessment management requirements verify correct creation, identification, and configuration of assessment sessions.

---

### TC-ASS-001: Assessment Creation with UUID Key

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-ASS-001 |
| **Requirement(s)** | SRS-FUN-020 |
| **Description** | Verify that when an assessment is created, the system generates and returns a UUID as the assessment key. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. Backend running, authenticated token available.
2. At least one patient record exists in the test database.

**Test Steps:**

1. Send a POST request to `/assessments` with a valid assessment payload referencing an existing patient ID.
2. Record the full response body.
3. Locate the `assessment_key` (or equivalent UUID field) in the response.
4. Validate the format of the returned value against UUID v4 pattern: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.
5. Create a second assessment and confirm a different UUID is generated.

**Expected Result:**

- Response contains a field (e.g. `assessment_key`) whose value is a valid UUID v4 string.
- The second assessment returns a different UUID.

**Pass Criteria:**

- UUID is present in response.
- UUID matches the UUID v4 pattern.
- Two independently created assessments have different UUIDs.

---

### TC-ASS-002: Human-Readable Assessment Reference

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-ASS-002 |
| **Requirement(s)** | SRS-FUN-022 |
| **Description** | Verify that each assessment is assigned a human-readable reference in the format `CA-YYYY-NNNN`. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. Backend running, authenticated token available.
2. Test date: 2026-06-05 (current date at time of writing).

**Test Steps:**

1. Create a new assessment via POST `/assessments`.
2. Record the `assessment_ref` field from the response.
3. Verify the format matches `CA-YYYY-NNNN` where YYYY is the current year (2026) and NNNN is a zero-padded 4-digit sequential number.
4. Create a second assessment and record its `assessment_ref`.
5. Verify the NNNN portion of the second ref is exactly 1 higher than the first.

**Expected Result:**

- First assessment: `assessment_ref` matches pattern `CA-2026-\d{4}`.
- Second assessment: sequential number incremented by 1.

**Pass Criteria:**

- Both refs match the `CA-YYYY-NNNN` pattern.
- Year component equals the year of creation.
- Sequential numbers are consecutive.

---

### TC-ASS-003: Condition Preset Selection

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-ASS-003 |
| **Requirement(s)** | SRS-FUN-026 |
| **Description** | Verify that selecting the "Early dementia" condition preset automatically populates the assessment with the correct set of speech tasks defined for that preset. |
| **Verification Method** | Manual |

**Preconditions:**

1. Full stack running, clinician logged in.
2. The "Early dementia" preset is defined in the system with a documented list of expected tasks.

**Test Steps:**

1. Begin creating a new assessment via the UI.
2. From the condition preset selector, choose "Early dementia".
3. Record the list of tasks that are automatically selected/displayed.
4. Compare the selected tasks against the expected task list for the "Early dementia" preset (as defined in CA-SRS-001 or the preset configuration file).
5. Verify that no additional tasks are selected beyond those in the preset.
6. Verify that all tasks in the preset are selected.

**Expected Result:**

- The tasks automatically selected by the "Early dementia" preset exactly match the documented preset task list.

**Pass Criteria:**

- All expected tasks for the "Early dementia" preset are selected.
- No unexpected tasks are selected.
- The selection was automatic (not requiring individual task selection by the tester).

---

## 9. Test Cases — REC Group

Recording requirements verify the recording workflow from the patient's perspective, including browser permission handling and the absence of clinical scores on patient-facing screens.

---

### TC-REC-001: Microphone Permission Request

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-REC-001 |
| **Requirement(s)** | SRS-FUN-030 |
| **Description** | Verify that when the patient recording screen is loaded, the browser is prompted to request microphone access permission. |
| **Verification Method** | Manual |

**Preconditions:**

1. Full stack running, clinician logged in.
2. A test assessment exists with at least one task pending.
3. Browser microphone permissions have been reset to "Ask" (not previously granted or denied).

**Test Steps:**

1. Navigate to the recording screen for the first task of the test assessment.
2. Observe the browser's behaviour upon page load or upon clicking the "Start Recording" button (as implemented).
3. Record whether a browser permission prompt appears requesting microphone access.
4. Record the prompt text and permission origin shown in the prompt.

**Expected Result:**

The browser displays a permission dialog requesting access to the microphone. The origin shown is the CogAssess application origin (e.g. `localhost:5173`).

**Pass Criteria:**

- Browser microphone permission prompt is displayed.
- Prompt is shown before any audio recording begins.

---

### TC-REC-002: No Scores on Patient Recording Screen

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-REC-002 |
| **Requirement(s)** | SRS-FUN-031, SRS-SAF-002 |
| **Description** | Verify that the patient-facing recording screen does not display any numerical biomarker scores, composite scores, or clinical flag values at any stage during or after recording. |
| **Verification Method** | Manual + Inspection |

**Preconditions:**

1. Full stack running, clinician logged in.
2. A completed assessment exists (pipeline has run and scores are stored in the database).
3. Clinician navigates to the recording screen for a task within that completed assessment.

**Test Steps:**

1. Navigate to the patient recording screen for any completed task.
2. Inspect the visible page content for any numerical score values (e.g. 0–100 range values, percentages, z-scores).
3. Open browser developer tools and inspect the DOM for any hidden elements containing score values.
4. Inspect the Network tab: confirm no API response to the recording screen contains score fields.
5. Repeat for the task list page visible to the patient during a session.

**Expected Result:**

- No numerical scores are visible anywhere on the patient-facing recording screen.
- No numerical scores are present in hidden DOM elements.
- The API response to the recording screen does not include score fields.

**Pass Criteria:**

- Zero numerical score values present on screen (visible or hidden).
- API response to patient recording endpoint contains no score data.

---

## 10. Test Cases — PIP Group

Pipeline requirements verify the correctness, robustness, and error handling of the five-stage speech analysis pipeline.

---

### TC-PIP-001: STT Transcription Returns Non-Empty Transcript

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-PIP-001 |
| **Requirement(s)** | SRS-FUN-040 |
| **Description** | Verify that submitting a valid audio file containing intelligible English speech to the pipeline results in a non-empty transcript being returned from the Google Cloud STT (Chirp) stage. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. Backend running with valid `GOOGLE_APPLICATION_CREDENTIALS`.
2. Test audio file available: a WAV or FLAC file of at least 5 seconds duration containing clearly intelligible English speech (minimum 10 words).
3. Authenticated JWT available.

**Test Steps:**

1. Submit the test audio file to the pipeline trigger endpoint (e.g. POST `/assessments/<id>/tasks/<task_id>/audio`) with appropriate multipart form data.
2. Poll or await the pipeline completion response (or retrieve results via GET after completion).
3. Locate the `transcript` field in the pipeline result.
4. Record the transcript content.
5. Verify the transcript is a non-empty string.
6. Optionally: compare the transcript against the known speech content of the audio file and assess accuracy.

**Expected Result:**

The pipeline returns a result containing a `transcript` field with a non-empty string value. The string contains recognisable words from the spoken content.

**Pass Criteria:**

- `transcript` field is present in the result.
- `transcript` is a non-empty string (length > 0).
- No error or exception is raised during the STT stage for valid audio input.

---

### TC-PIP-002: Composite Score Computation

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-PIP-002 |
| **Requirement(s)** | SRS-FUN-045 |
| **Description** | Verify that the pipeline's score aggregator produces a composite score that is a numeric value in the range 0–100. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. Pipeline has been run on a valid audio file (see TC-PIP-001 preconditions).
2. All pipeline stages completed successfully.

**Test Steps:**

1. Retrieve the completed pipeline result for the test assessment task.
2. Locate the `composite_score` (or equivalent field) in the result.
3. Verify the value is numeric (integer or float).
4. Verify the value is ≥ 0.
5. Verify the value is ≤ 100.
6. Repeat with a second audio sample of different content and verify the score also falls within 0–100.

**Expected Result:**

The `composite_score` field contains a numeric value between 0 and 100 (inclusive).

**Pass Criteria:**

- `composite_score` is present in the result.
- `composite_score` is numeric.
- `composite_score` satisfies: `0 ≤ composite_score ≤ 100`.

---

### TC-PIP-003: Clinical Flag Generation

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-PIP-003 |
| **Requirement(s)** | SRS-FUN-047 |
| **Description** | Verify that the pipeline generates clinical flags and that each flag includes a `severity` attribute with a value of `note`, `watch`, or `refer`. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. Pipeline has been run on a valid audio file producing a complete result.

**Test Steps:**

1. Retrieve the pipeline result for the test assessment task.
2. Locate the `safety_flags` (or `clinical_flags`) field in the result.
3. Verify the field is a list (array).
4. For each flag in the list:
   a. Confirm the flag object contains a `severity` attribute.
   b. Confirm the `severity` value is one of: `"note"`, `"watch"`, `"refer"`.
   c. Confirm the flag contains a descriptive message or code field.
5. If the result contains zero flags, document this as a valid outcome for normal-range audio.
6. To force flag generation: run the pipeline on audio with deliberately poor quality or very short duration and verify at least one flag is generated.

**Expected Result:**

All flags in the result have `severity` values restricted to the set `{"note", "watch", "refer"}`. No flag has an undefined, null, or out-of-set severity value.

**Pass Criteria:**

- `safety_flags` field is present (may be empty list).
- All flag objects contain `severity` attribute.
- All `severity` values are within the permitted set.
- No flags have null or missing severity.

---

### TC-PIP-004: Empty Transcript Error Handling

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-PIP-004 |
| **Requirement(s)** | SRS-FUN-050, SRS-SAF-006 |
| **Description** | Verify that when the STT stage returns an empty or blank transcript (e.g. from a silent audio file), the pipeline enters an error state and does not return zero scores as a valid completed result. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. Backend running with valid GCP credentials (or mock STT configured to return empty string).
2. Test audio file available: a WAV file of at least 3 seconds of silence.

**Test Steps:**

1. Submit the silent audio file to the pipeline.
2. Await the pipeline result.
3. Inspect the result for `status` or equivalent field.
4. Verify the `status` is an error state (e.g. `"error"`, `"failed"`, `"empty_transcript"`).
5. Verify that `composite_score` is absent from the result, or is null, or is explicitly flagged as invalid.
6. Verify that a human-readable error message is present in the result explaining the cause.
7. Confirm that the error state is recorded in the database and is retrievable via GET.

**Expected Result:**

The pipeline returns an error state, not a completed result with a score of 0. The result includes an error message referencing the empty or unintelligible transcript. No composite score is stored or returned.

**Pass Criteria:**

- `status` field indicates an error (not success/complete).
- `composite_score` is null, absent, or explicitly marked invalid — not `0`.
- An error message is present in the result.
- Error is persisted to the database.

---

## 11. Test Cases — REP Group

Report requirements verify the clinical report's access control, content, and safety notices.

---

### TC-REP-001: Clinical Report Access Control

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-REP-001 |
| **Requirement(s)** | SRS-FUN-060 |
| **Description** | Verify that the clinical report endpoint (or report page) is not accessible without a valid authentication token. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. Backend running.
2. A completed assessment with a generated report exists.
3. The report endpoint URL is known (e.g. GET `/assessments/<id>/report`).

**Test Steps:**

1. Send a GET request to the report endpoint with no `Authorization` header.
2. Record the HTTP status code.
3. Send a GET request to the report endpoint with an `Authorization: Bearer <expired_token>` header.
4. Record the HTTP status code.
5. Send a GET request to the report endpoint with a valid `Authorization: Bearer <valid_token>` header.
6. Record the HTTP status code.

**Expected Result:**

- Steps 1–2: HTTP 401.
- Steps 3–4: HTTP 401.
- Steps 5–6: HTTP 200 with report content.

**Pass Criteria:**

- Unauthenticated request returns 401.
- Expired token request returns 401.
- Valid authenticated request returns 200 with report data.

---

### TC-REP-002: Population Comparison Chart Present

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-REP-002 |
| **Requirement(s)** | SRS-FUN-063 |
| **Description** | Verify that the clinical report page includes a population comparison chart (bell curve / normal distribution visualisation) showing the patient's score relative to population norms. |
| **Verification Method** | Manual |

**Preconditions:**

1. Full stack running, clinician logged in.
2. A completed assessment exists with a computed composite score.

**Test Steps:**

1. Navigate to the clinical report page for the completed assessment.
2. Inspect the page for the presence of a chart or graph.
3. Confirm the chart represents a distribution (bell curve or equivalent).
4. Confirm the patient's score is indicated on the chart (e.g. as a marker, vertical line, or highlighted region).
5. Inspect the chart label or legend to confirm it references population comparison.

**Expected Result:**

A bell curve or normal distribution chart is visible on the report page. The patient's score is indicated relative to the distribution. The chart is labelled to indicate population comparison.

**Pass Criteria:**

- Chart is present on the report page.
- Chart visually represents a distribution.
- Patient's score position is indicated on the chart.
- Chart is appropriately labelled.

---

### TC-REP-003: Clinician-Only Notice on Report

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-REP-003 |
| **Requirement(s)** | SRS-FUN-066, SRS-SAF-001 |
| **Description** | Verify that the clinical report page displays a prominent clinician-only disclaimer notice stating that the output is not a diagnosis and is intended for use by qualified clinicians only. |
| **Verification Method** | Manual + Inspection |

**Preconditions:**

1. Full stack running, clinician logged in.
2. A completed assessment with a report exists.

**Test Steps:**

1. Navigate to the clinical report page.
2. Scan the page for a disclaimer, notice, or warning section.
3. Record the full text of any such notice.
4. Verify the notice contains language to the effect of: "This output is not a clinical diagnosis", "For use by qualified clinicians only", or equivalent.
5. Inspect the visual presentation: confirm the notice is prominent (not buried in a footer or hidden).

**Expected Result:**

A clearly visible disclaimer is present on every clinical report page stating that the output is not a diagnosis and is intended for qualified clinicians only.

**Pass Criteria:**

- Disclaimer text is present on the report page.
- Disclaimer text includes a statement that the output is not a diagnosis.
- Disclaimer text includes a statement about clinician-only use.
- Disclaimer is visually prominent (above the fold or clearly styled as a warning/notice).

---

## 12. Test Cases — FIND Group

Clinical findings requirements verify the storage and access control of clinician-authored findings and notes.

---

### TC-FIND-001: Clinical Findings Form Storage

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-FIND-001 |
| **Requirement(s)** | SRS-FUN-070 |
| **Description** | Verify that a clinician can save clinical findings via the findings form and that the saved content is correctly stored in the database. |
| **Verification Method** | Manual |

**Preconditions:**

1. Full stack running, clinician logged in.
2. A completed assessment exists.

**Test Steps:**

1. Navigate to the clinical findings form for the completed assessment.
2. Enter a test findings value in the findings text area: `"Test clinical finding: patient showed hesitations on verbal fluency task."`.
3. Click Save (or equivalent action).
4. Verify the UI shows a success indicator (toast, confirmation, or status message).
5. Refresh the page and re-open the findings for the same assessment.
6. Verify the saved text is present and unchanged.
7. Via the API, send GET `/assessments/<id>/findings` (or equivalent) and verify the findings text matches what was entered.

**Expected Result:**

The findings text is saved successfully, persisted through a page refresh, and retrievable via the API. The stored text exactly matches what was entered.

**Pass Criteria:**

- Save action completes without error.
- Findings text survives page refresh.
- API returns the correct findings text.

---

### TC-FIND-002: Internal Notes Absent from Patient Summary Route

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-FIND-002 |
| **Requirement(s)** | SRS-FUN-073 |
| **Description** | Verify that internal clinician notes (entered via the clinical findings form) are not included in or accessible via the patient summary endpoint (`/summary` or equivalent). |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. Backend running, authenticated token available.
2. An assessment exists with clinician findings/internal notes saved (use findings from TC-FIND-001 or create independently).
3. The patient summary endpoint URL is known.

**Test Steps:**

1. Send GET `/assessments/<id>/summary` (or equivalent patient summary route) with valid authentication.
2. Record the full response body.
3. Search the response body for the internal notes text (e.g. `"Test clinical finding"`).
4. Inspect all fields in the response: confirm none contain clinician notes or internal annotations.

**Expected Result:**

The patient summary response contains no clinician notes, internal findings, or any text entered via the clinical findings form. The response contains only patient-appropriate summary fields.

**Pass Criteria:**

- Internal notes text is absent from the summary response body.
- No field in the summary response references clinician-authored notes.

---

## 13. Test Cases — SUM Group

Patient summary requirements verify the content and presentation of the patient-facing summary.

---

### TC-SUM-001: Patient Summary Required Field Presence

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-SUM-001 |
| **Requirement(s)** | SRS-FUN-080 |
| **Description** | Verify that the patient summary page or API response contains all required fields as defined in CA-SRS-001. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. Full stack running, authenticated token available.
2. A completed assessment exists with all pipeline stages completed.

**Test Steps:**

1. Send GET `/assessments/<id>/summary` with valid authentication.
2. Record the response body.
3. Verify each of the following fields is present in the response (as defined in SRS-FUN-080):
   - Assessment reference (`assessment_ref`)
   - Assessment date
   - Condition preset label
   - List of completed tasks
   - Overall assessment status (completed/partial)
   - Any patient-appropriate summary text generated by the system
4. For any required field that is absent, record it as a defect.

**Expected Result:**

All required fields defined in SRS-FUN-080 are present in the summary response. No required field is null or missing.

**Pass Criteria:**

- All required fields present and non-null.
- Assessment reference is in CA-YYYY-NNNN format.
- Assessment date is populated.

---

### TC-SUM-002: No Numerical Scores on Patient Summary

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-SUM-002 |
| **Requirement(s)** | SRS-FUN-081 |
| **Description** | Verify that the patient summary page and API response do not contain any numerical biomarker scores, composite scores, or clinical flag severity values. |
| **Verification Method** | Manual + Inspection |

**Preconditions:**

1. Full stack running.
2. A completed assessment with computed scores exists.

**Test Steps:**

1. Send GET `/assessments/<id>/summary` with valid authentication.
2. Inspect every field in the response: record any field whose value is numeric and falls in the 0–100 range characteristic of a score.
3. Navigate to the patient summary UI page.
4. Inspect the rendered page for any displayed numbers that could be interpreted as clinical scores.
5. Inspect the DOM via browser developer tools for hidden score values.

**Expected Result:**

No biomarker scores, composite scores, or severity-coded flag values appear in the patient summary response or on the patient summary page.

**Pass Criteria:**

- Summary API response contains no score fields.
- Summary UI page contains no numerical score values (visible or hidden).

---

### TC-SUM-003: Patient Summary Printable — No-Print CSS Class

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-SUM-003 |
| **Requirement(s)** | SRS-FUN-082 |
| **Description** | Verify that the navigation bar and other non-content UI elements on the patient summary page carry the `.no-print` CSS class, ensuring they are hidden when the page is printed. |
| **Verification Method** | Inspection |

**Preconditions:**

1. Frontend application running.
2. Patient summary page accessible.

**Test Steps:**

1. Navigate to the patient summary page.
2. Open browser developer tools and inspect the navigation bar element.
3. Confirm the `no-print` CSS class is applied to the nav element.
4. Inspect the global stylesheet (or component CSS): confirm `.no-print` is defined with `@media print { display: none; }` or equivalent.
5. Use the browser's Print Preview function to visually confirm the navigation bar is absent from the print preview.

**Expected Result:**

The navigation bar carries the `.no-print` CSS class. The class is defined in the stylesheet to hide the element in print media. The Print Preview confirms the nav is not visible.

**Pass Criteria:**

- `.no-print` class is present on the nav element in the DOM.
- `.no-print` CSS rule includes `display: none` in `@media print`.
- Navigation bar is absent from Print Preview.

---

## 14. Test Cases — SAF Group

Safety requirements are critical and must be executed on every release without exception.

---

### TC-SAF-001: Clinician-Only Notice Present on Report Page

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-SAF-001 |
| **Requirement(s)** | SRS-SAF-001 |
| **Description** | Verify that a clinician-only disclaimer notice is present on the clinical report page, satisfying the safety requirement that the report must clearly communicate it is not a diagnostic tool and is for qualified clinicians only. |
| **Verification Method** | Manual + Inspection |

**Preconditions:**

1. Full stack running, clinician logged in.
2. A completed assessment with a report exists.

**Test Steps:**

1. Navigate to the clinical report page.
2. Without scrolling, check whether the disclaimer notice is visible in the initial viewport (above the fold).
3. Record the full verbatim text of the disclaimer.
4. Verify the text contains **all** of the following elements:
   - A statement that the output is not a clinical diagnosis.
   - A statement restricting use to qualified clinicians.
5. Verify the disclaimer is visually styled as a notice or warning (not plain body text).
6. Inspect the React component source: confirm the disclaimer text is hardcoded and cannot be hidden by user settings.

**Expected Result:**

The disclaimer is prominently displayed above the clinical data. It contains both required statements. It cannot be dismissed or hidden.

**Pass Criteria:**

- Disclaimer is present on every clinical report page.
- Disclaimer contains both required statements (non-diagnosis + clinician-only).
- Disclaimer is visually distinct from normal body text.
- Disclaimer is not dismissible.

---

### TC-SAF-002: No Scores on Any Patient-Facing Screen

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-SAF-002 |
| **Requirement(s)** | SRS-SAF-002 |
| **Description** | Verify that no numerical biomarker scores appear anywhere on patient-facing screens (recording screen, task list, patient summary). This is a comprehensive safety check covering all patient-facing routes. |
| **Verification Method** | Manual + DOM Inspection |

**Preconditions:**

1. Full stack running.
2. A completed assessment with scores exists, so that scores are available in the database.
3. Clinician is logged in and has navigated a patient through a complete session.

**Test Steps:**

1. Navigate to each of the following pages in turn and inspect for numerical scores:
   - Patient session landing page (pre-task)
   - Individual task recording screen
   - Post-recording confirmation screen (if applicable)
   - Patient summary page
2. For each page, perform both visual inspection and DOM inspection via developer tools.
3. Inspect network requests on each page: confirm no API response to these pages contains score fields.
4. Record the exact page URL and outcome (scores present / no scores) for each page tested.

**Expected Result:**

No numerical scores are visible or present in the DOM or API responses on any patient-facing page.

**Pass Criteria:**

- Zero score values found on any patient-facing page (visible or in DOM).
- All patient-facing API responses lack score fields.
- Results documented for each page individually.

---

### TC-SAF-003: Empty Transcript Produces Error State Not Zero Scores

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-SAF-003 |
| **Requirement(s)** | SRS-SAF-006 |
| **Description** | Verify at the pipeline level that an empty transcript causes the pipeline to enter an explicit error state, specifically ensuring that a score of zero is not returned as if it were a valid result. This is the safety counterpart to TC-PIP-004. |
| **Verification Method** | Manual / Automated |

**Preconditions:**

1. Backend running.
2. Silent audio file available (as per TC-PIP-004 preconditions).
3. Authenticated JWT available.

**Test Steps:**

1. Submit the silent audio file to the pipeline.
2. Wait for pipeline completion.
3. Retrieve the pipeline result via the API.
4. Confirm `status` is an error value (e.g. `"error"`, `"empty_transcript_error"`).
5. Confirm `composite_score` is null, absent, or tagged as invalid — **not** the integer or float `0`.
6. Confirm `safety_flags` or error field contains a message identifying empty transcript as the cause.
7. Inspect the database record: confirm the error state is persisted and a score of `0` is not stored as a valid result.

**Expected Result:**

The pipeline explicitly signals an error. The composite score is not `0` or any other numeric value presented as a valid result. The error cause (empty transcript) is recorded.

**Pass Criteria:**

- `status` field indicates error, not success.
- `composite_score` is null or absent, not `0`.
- Error cause is documented in the result.
- Database record reflects the error state.

---

## 15. Test Cases — SEC Group

Security requirements verify that the system implements appropriate security controls for a clinical application handling pseudonymised patient data.

---

### TC-SEC-001: bcrypt Password Hashing

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-SEC-001 |
| **Requirement(s)** | SRS-SEC-001 |
| **Description** | Verify that clinician passwords are stored in the database as bcrypt hashes and not as plaintext strings. |
| **Verification Method** | Inspection |

**Preconditions:**

1. Test clinician account `test_clinician` with password `TestPass1!` exists in the test database.
2. Direct read access to the SQLite test database (via SQLite Browser or sqlite3 CLI).

**Test Steps:**

1. Open the test database using SQLite Browser or `sqlite3 cogassess_test.db`.
2. Execute: `SELECT username, hashed_password FROM users WHERE username = 'test_clinician';`
3. Record the value of the `hashed_password` column.
4. Verify the value begins with `$2b$` (bcrypt hash prefix) or `$2a$` (alternative bcrypt prefix).
5. Verify the value does not contain or equal the plaintext string `TestPass1!`.
6. Inspect `auth.py` or the user creation logic: confirm `passlib.context.CryptContext` with `schemes=["bcrypt"]` is used for hashing.

**Expected Result:**

The stored password value is a bcrypt hash (beginning with `$2b$` or `$2a$`), not the plaintext password. The source code uses passlib with bcrypt.

**Pass Criteria:**

- Stored value begins with `$2b$` or `$2a$`.
- Stored value does not equal plaintext password.
- Source code inspection confirms bcrypt scheme.

---

### TC-SEC-002: JWT HS256 Algorithm

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-SEC-002 |
| **Requirement(s)** | SRS-SEC-002 |
| **Description** | Verify that JWT tokens issued by CogAssess are signed using the HS256 algorithm, as declared in the token header. |
| **Verification Method** | Analysis |

**Preconditions:**

1. Backend running.
2. Test clinician account exists.

**Test Steps:**

1. Send POST `/token` with valid credentials and record the `access_token` from the response.
2. Split the token on `.` to obtain three segments: `header.payload.signature`.
3. Base64-decode the `header` segment (padding as necessary).
4. Parse the decoded JSON.
5. Record the value of the `alg` field in the header.
6. Inspect `auth.py` or `main.py`: confirm `ALGORITHM = "HS256"` (or equivalent constant).

**Expected Result:**

The decoded token header contains `"alg": "HS256"`. The source code confirms HS256 is configured.

**Pass Criteria:**

- Token header `alg` field equals `"HS256"`.
- Source code inspection confirms HS256 configuration.

---

### TC-SEC-003: Temporary Audio File Deletion

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-SEC-003 |
| **Requirement(s)** | SRS-SEC-005 |
| **Description** | Verify that temporary audio files created during pipeline processing are deleted from the filesystem after the pipeline completes, whether successfully or with an error. |
| **Verification Method** | Manual + Inspection |

**Preconditions:**

1. Backend running.
2. A valid audio file is available for upload.
3. Access to the server filesystem (or the local directory where temporary files are stored).

**Test Steps:**

**Part A — Successful pipeline run:**

1. Note the temporary file storage directory (inspect `main.py` or pipeline code for `tempfile` or upload path).
2. List the contents of the temp directory before upload.
3. Submit a valid audio file to the pipeline.
4. Immediately (within 2 seconds of response) list the contents of the temp directory.
5. Verify the audio file is no longer present.

**Part B — Error pipeline run:**

1. Submit a silent audio file (which produces an error state per TC-PIP-004).
2. Immediately after the pipeline returns (error or success), list the temp directory.
3. Verify the audio file is not present in the temp directory.

**Part C — Source code inspection:**

1. Inspect the pipeline code (e.g. `main.py`, pipeline module) for explicit file deletion logic (e.g. `os.remove()`, `Path.unlink()`, `finally:` block).
2. Confirm deletion occurs in a `finally:` block or equivalent that executes regardless of pipeline success or failure.

**Expected Result:**

The temporary audio file does not persist after pipeline completion in either success or error cases. Source code confirms deletion in a `finally:` block.

**Pass Criteria:**

- Audio file is absent from temp directory after successful pipeline run.
- Audio file is absent from temp directory after error pipeline run.
- Source code contains explicit deletion logic in a `finally:` or equivalent construct.

---

### TC-SEC-004: No Patient PII Transmitted to Google Cloud

| Field | Detail |
|-------|--------|
| **Test Case ID** | TC-SEC-004 |
| **Requirement(s)** | SRS-SEC-006 |
| **Description** | Verify that when audio is submitted to the Google Cloud STT service, the request does not include any patient identifier (patient_ref, date of birth, assessment reference, or any other PII). |
| **Verification Method** | Inspection + Manual (network analysis) |

**Preconditions:**

1. Backend running with GCP credentials.
2. The pipeline source code is accessible for inspection.

**Test Steps:**

**Part A — Source code inspection:**

1. Locate the STT API call in the pipeline code (the Google Cloud Speech-to-Text client invocation).
2. Inspect all parameters passed to the STT API call: the audio content, the recognition configuration, and any metadata.
3. Confirm that `patient_ref`, `patient_id`, date of birth, assessment reference, clinician name, and any other patient or clinician identifiers are **not** included in the API call.

**Part B — Runtime network inspection (optional but recommended):**

1. Enable network proxy logging (e.g. mitmproxy or backend request logging) to capture outbound HTTPS requests.
2. Trigger a pipeline run with a test patient whose `patient_ref = "PT-INSPECT-001"`.
3. Inspect the captured HTTPS request to the GCP STT endpoint.
4. Confirm the request body contains only: the audio data and the recognition configuration (language code, encoding, sample rate). No patient identifiers are present.

**Expected Result:**

The GCP STT API call contains only audio data and recognition configuration. No patient_ref, patient_id, date of birth, assessment key, assessment ref, or clinician information is present.

**Pass Criteria:**

- Source code inspection confirms no PII fields are passed to the STT client.
- (If Part B executed) Network capture confirms request body contains no patient identifiers.

---

## 16. Test Results Summary Table

The following table is to be completed at the time of test execution. Each row corresponds to one test case. The "Result" column is populated as: **PASS**, **FAIL**, or **BLOCKED**.

| Test Case ID | Requirement(s) | Description (short) | Executed By | Date Executed | Environment | Result | Defect ID (if FAIL) | Notes |
|--------------|----------------|---------------------|-------------|---------------|-------------|--------|---------------------|-------|
| TC-AUTH-001 | SRS-FUN-001 | Unauthenticated request returns 401 | | | | | | |
| TC-AUTH-002 | SRS-FUN-002 | JWT 8-hour expiry; expired token rejected | | | | | | |
| TC-AUTH-003 | SRS-FUN-003 | Invalid credentials return 401 (3 cases) | | | | | | |
| TC-PAT-001 | SRS-FUN-010 | No name field; patient_ref stored | | | | | | |
| TC-PAT-002 | SRS-FUN-011 | Age band auto-populated from DOB | | | | | | |
| TC-PAT-003 | SRS-FUN-014 | Non-English L1 amber warning shown | | | | | | |
| TC-ASS-001 | SRS-FUN-020 | Assessment creation with UUID key | | | | | | |
| TC-ASS-002 | SRS-FUN-022 | Human-readable ref CA-YYYY-NNNN | | | | | | |
| TC-ASS-003 | SRS-FUN-026 | Condition preset selects correct tasks | | | | | | |
| TC-REC-001 | SRS-FUN-030 | Microphone permission prompt shown | | | | | | |
| TC-REC-002 | SRS-FUN-031, SRS-SAF-002 | No scores on patient recording screen | | | | | | |
| TC-PIP-001 | SRS-FUN-040 | STT returns non-empty transcript | | | | | | |
| TC-PIP-002 | SRS-FUN-045 | Composite score in range 0–100 | | | | | | |
| TC-PIP-003 | SRS-FUN-047 | Flags have valid severity (note/watch/refer) | | | | | | |
| TC-PIP-004 | SRS-FUN-050, SRS-SAF-006 | Empty transcript produces error state | | | | | | |
| TC-REP-001 | SRS-FUN-060 | Report not accessible without auth | | | | | | |
| TC-REP-002 | SRS-FUN-063 | Population comparison chart present | | | | | | |
| TC-REP-003 | SRS-FUN-066, SRS-SAF-001 | Clinician-only notice on report | | | | | | |
| TC-FIND-001 | SRS-FUN-070 | Findings saved to database | | | | | | |
| TC-FIND-002 | SRS-FUN-073 | Internal notes absent from /summary | | | | | | |
| TC-SUM-001 | SRS-FUN-080 | Required fields present in summary | | | | | | |
| TC-SUM-002 | SRS-FUN-081 | No scores on patient summary | | | | | | |
| TC-SUM-003 | SRS-FUN-082 | .no-print CSS class on nav | | | | | | |
| TC-SAF-001 | SRS-SAF-001 | Clinician-only notice on report | | | | | | |
| TC-SAF-002 | SRS-SAF-002 | No scores on any patient-facing screen | | | | | | |
| TC-SAF-003 | SRS-SAF-006 | Empty transcript: error not zero score | | | | | | |
| TC-SEC-001 | SRS-SEC-001 | bcrypt hash stored, not plaintext | | | | | | |
| TC-SEC-002 | SRS-SEC-002 | JWT header algorithm is HS256 | | | | | | |
| TC-SEC-003 | SRS-SEC-005 | Temp audio file deleted after pipeline | | | | | | |
| TC-SEC-004 | SRS-SEC-006 | No PII in GCP STT request | | | | | | |

**Summary Statistics (to be completed after execution):**

| Metric | Value |
|--------|-------|
| Total test cases | 30 |
| Executed | |
| Passed | |
| Failed | |
| Blocked | |
| Pass rate (executed) | |
| Open defects raised | |
| Safety tests (SAF + SEC) all passed | Yes / No |
| Gate review recommendation | Pass / Conditional Pass / Fail |

---

*End of Document CA-SVP-001 v1.0*
