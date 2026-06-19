# Requirements Traceability Matrix

**Document ID:** CA-RTM-001  
**Product:** CogAssess — Speech Biomarker Assessment Platform  
**Version:** 1.0  
**Date:** 2026-06-06  
**Status:** Draft  
**Prepared by:** St John Lynch & Co. Ltd / MemoryTell Ltd  
**IEC 62304 Safety Class:** Class B  
**Standard:** IEC 62304:2006+AMD1:2015 §5.7.5 — IEC 82304-1:2016 §6

---

## Purpose

This Requirements Traceability Matrix (RTM) provides a complete mapping from every requirement in CA-SRS-001 to its corresponding test case(s) in CA-SVP-001, together with the verification method and current status. It serves as the primary evidence that all Mandatory requirements have been addressed by a verification activity.

**Status key:**

| Status | Meaning |
|--------|---------|
| PASS | Automated test exists and is currently passing in CI |
| SKIPPED | Automated test written but skipped — requires live environment (GCP, browser) |
| MANUAL | Verified by manual observation or code review; no automated test |
| NOT TESTED | No test case yet defined; gap to be addressed before clinical release |

**Verification method key:**

| Method | Meaning |
|--------|---------|
| Auto | pytest automated test in the `tests/` directory |
| Browser | Requires a running browser and human observer |
| GCP | Requires live Google Cloud Chirp STT connection |
| Code review | Verified by reading source code or documentation |

---

## 1. Functional Requirements — Authentication (SRS-FUN-001 to SRS-FUN-006)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-FUN-001 | Login required before patient data access | M | TC-AUTH-001, TC-OWA-010 | Auto | PASS |
| SRS-FUN-002 | JWT expires after ≤ 8 hours | M | TC-AUTH-002 | Auto | PASS |
| SRS-FUN-003 | Invalid credentials return 401; no username/password disclosure | M | TC-AUTH-003 | Auto | PASS |
| SRS-FUN-004 | Logout invalidates current session token | M | — | — | NOT TESTED |
| SRS-FUN-005 | Unauthenticated users redirected to login (frontend) | M | TC-AUTH-001 | Auto | PASS |
| SRS-FUN-006 | New clinician accounts created by authenticated admin only | M | TC-OWA-010 | Auto | PASS |

---

## 2. Functional Requirements — Patient Registration (SRS-FUN-010 to SRS-FUN-015)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-FUN-010 | Patient registered by pseudonymised ref; no name stored | M | TC-PAT-001 | Auto | PASS |
| SRS-FUN-011 | DOB recorded; age band auto-derived | M | TC-PAT-002 | Auto | SKIPPED |
| SRS-FUN-012 | Age band recorded (Under 18 … 85+) | M | TC-PAT-002 | Auto | SKIPPED |
| SRS-FUN-013 | Patient L1 language recorded | M | TC-PAT-003 | Auto | PASS |
| SRS-FUN-014 | Non-English L1 triggers amber warning | M | TC-PAT-003 | Auto | PASS |
| SRS-FUN-015 | Duplicate patient_ref rejected cleanly (400) | M | — | — | NOT TESTED |

---

## 3. Functional Requirements — Assessment Creation (SRS-FUN-020 to SRS-FUN-029)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-FUN-020 | New assessment linked to patient | M | TC-ASS-001 | Auto | PASS |
| SRS-FUN-021 | UUID assessment key generated at creation | M | TC-ASS-001 | Auto | PASS |
| SRS-FUN-022 | Human-readable ref CA-YYYY-NNNN generated | M | TC-ASS-002 | Auto | PASS |
| SRS-FUN-023 | Date, type, referral source, reason recorded | M | TC-ASS-001 | Auto | PASS |
| SRS-FUN-024 | Recording environment recorded | M | — | Code review | NOT TESTED |
| SRS-FUN-025 | Interruptions recorded with free-text notes | M | — | Code review | NOT TESTED |
| SRS-FUN-026 | Clinical condition preset selects task battery | M | TC-ASS-003 | Auto | PASS |
| SRS-FUN-027 | Clinician can enable/disable individual tasks | M | — | Browser | NOT TESTED |
| SRS-FUN-028 | Zero-task assessment creation is rejected | M | — | — | NOT TESTED |
| SRS-FUN-029 | Domain, duration, measures shown per task (Desirable) | D | — | Browser | NOT TESTED |

---

## 4. Functional Requirements — Audio Recording (SRS-FUN-030 to SRS-FUN-039)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-FUN-030 | Microphone permission requested before recording | M | TC-REC-001 | Browser | MANUAL |
| SRS-FUN-031 | Recording interface shows task only — no scores | M | TC-REC-002 | Browser | MANUAL |
| SRS-FUN-032 | Task instruction displayed at accessible font size | M | — | Browser | NOT TESTED |
| SRS-FUN-033 | Countdown timer displayed during recording | M | — | Browser | NOT TESTED |
| SRS-FUN-034 | Recording auto-stops at allotted duration | M | — | Browser | NOT TESTED |
| SRS-FUN-035 | Patient/clinician can stop recording early | M | — | Browser | NOT TESTED |
| SRS-FUN-036 | Clinician interstitial screen for preparatory tasks | M | — | Browser | NOT TESTED |
| SRS-FUN-037 | Reading stimulus displayed prominently | M | — | Browser | NOT TESTED |
| SRS-FUN-038 | Task progress indicator displayed | M | — | Browser | NOT TESTED |
| SRS-FUN-039 | Processing indicator shown during analysis | M | — | Browser | NOT TESTED |

---

## 5. Functional Requirements — Speech Analysis Pipeline (SRS-FUN-040 to SRS-FUN-050)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-FUN-040 | Audio transcribed by STT before analysis | M | TC-PIP-001 | GCP | MANUAL |
| SRS-FUN-041 | Acoustic features extracted (rate, HNR, F0, pauses) | M | TC-PIP-002 | Auto | PASS |
| SRS-FUN-042 | Lexical/syntactic analysis performed (TTR, pronouns, fillers) | M | TC-PIP-002 | Auto | PASS |
| SRS-FUN-043 | Semantic similarity computed | M | TC-PIP-002 | Auto | PASS |
| SRS-FUN-044 | Emotion classified across ≥ 7 categories | M | TC-PIP-002 | Auto | PASS |
| SRS-FUN-045 | Composite score 0–100 computed per task | M | TC-PIP-002 | Auto | PASS |
| SRS-FUN-046 | Domain sub-scores computed (motor, semantic, episodic, emotional) | M | TC-PIP-002 | Auto | PASS |
| SRS-FUN-047 | Clinical flags generated per severity (Note/Watch/Refer) | M | TC-PIP-003 | GCP | MANUAL |
| SRS-FUN-048 | Each flag includes plain-language explanation | M | — | Browser | NOT TESTED |
| SRS-FUN-049 | Full pipeline output (transcript, scores, flags) stored in DB | M | TC-PIP-002 | Auto | PASS |
| SRS-FUN-050 | Empty/null transcript produces error state — no silent scoring | M | TC-PIP-004, TC-SAF-003 | Auto | PASS |

---

## 6. Functional Requirements — Assessment Progress (SRS-FUN-055 to SRS-FUN-057)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-FUN-055 | Interrupted assessment resumed from correct task | M | — | — | NOT TESTED |
| SRS-FUN-056 | Assessment marked complete only when all tasks submitted | M | — | Code review | NOT TESTED |
| SRS-FUN-057 | Completed assessment redirects to report (not recording) | M | — | Browser | NOT TESTED |

---

## 7. Functional Requirements — Clinical Reporting (SRS-FUN-060 to SRS-FUN-067)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-FUN-060 | Clinical report accessible to authenticated clinicians only | M | TC-REP-001 | Auto | PASS |
| SRS-FUN-061 | Report shows per-task scores, composite, risk level, flags | M | — | Browser | NOT TESTED |
| SRS-FUN-062 | Cumulative summary panel with domain scores and flags | M | — | Browser | NOT TESTED |
| SRS-FUN-063 | Population comparison chart displayed | M | TC-REP-002 | Browser | MANUAL |
| SRS-FUN-064 | Session conditions panel with L1/environment/interruption warnings | M | — | Browser | NOT TESTED |
| SRS-FUN-065 | Expandable transcript view (Desirable) | D | — | Browser | NOT TESTED |
| SRS-FUN-066 | Prominent clinician-only notice on report | M | TC-REP-003, TC-SAF-001 | Browser | MANUAL |
| SRS-FUN-067 | Report shows assessment ref, patient ref, date, clinician, type | M | — | Browser | NOT TESTED |

---

## 8. Functional Requirements — Clinical Findings (SRS-FUN-070 to SRS-FUN-075)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-FUN-070 | Clinical findings form — outcome, follow-up, notes, summary | M | TC-FIND-001 | Auto | PASS |
| SRS-FUN-071 | Clinical outcome options present (minimum 6 defined) | M | — | Browser | NOT TESTED |
| SRS-FUN-072 | Follow-up date prompted when monitoring outcome selected | M | — | Browser | NOT TESTED |
| SRS-FUN-073 | Internal notes absent from patient-facing summary | M | TC-FIND-002 | Auto | PASS |
| SRS-FUN-074 | Timestamp recorded when findings saved | M | TC-FIND-001 | Auto | PASS |
| SRS-FUN-075 | Previously saved findings can be updated (amendment flow) | M | TC-FIND-002, TC-SAF-001 | Auto | PASS |

---

## 9. Functional Requirements — Patient Summary (SRS-FUN-080 to SRS-FUN-083)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-FUN-080 | Patient summary: ref, date, clinician, outcome, follow-up, text | M | TC-SUM-001 | Browser | MANUAL |
| SRS-FUN-081 | Patient summary does not show numerical scores or flags | M | TC-SUM-002 | Browser | MANUAL |
| SRS-FUN-082 | Patient summary is printable (CSS no-print on nav) | M | TC-SUM-003 | Browser | MANUAL |
| SRS-FUN-083 | Patient summary shows plain-language disclaimer | M | — | Browser | NOT TESTED |

---

## 10. Functional Requirements — Dashboard (SRS-FUN-090 to SRS-FUN-092)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-FUN-090 | Dashboard lists clinician's assessments with ref, patient, date, status | M | — | Browser | NOT TESTED |
| SRS-FUN-091 | Dashboard in reverse-chronological order | M | — | Browser | NOT TESTED |
| SRS-FUN-092 | Dashboard links to clinical report for each completed assessment | M | — | Browser | NOT TESTED |

---

## 11. External Interface Requirements (SRS-INT)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-INT-001 | Operable in standard browser; no plugins required | M | — | Browser | NOT TESTED |
| SRS-INT-002 | WCAG 2.1 Level AA accessibility | M | — | Manual audit | NOT TESTED |
| SRS-INT-003 | Patient-facing interface: minimal cognitive load, large text | M | — | Browser | NOT TESTED |
| SRS-INT-004 | Skip to main content link for keyboard/screen-reader | M | — | Browser | NOT TESTED |
| SRS-INT-005 | Usable on screens ≥ 375px (Desirable) | D | — | Browser | NOT TESTED |
| SRS-INT-010 | Microphone via browser MediaRecorder API — no direct hardware | M | TC-REC-001 | Browser | MANUAL |
| SRS-INT-011 | Microphone permission denied — clear error shown | M | — | Browser | NOT TESTED |
| SRS-INT-020 | Interface with GCP Chirp STT via Python client library | M | TC-SOUP-001, TC-SOUP-002 | Auto | PASS |
| SRS-INT-021 | Audio pre-converted to 16kHz mono WAV before STT submission | M | — | Code review | NOT TESTED |
| SRS-INT-022 | librosa used for acoustic feature extraction | M | TC-SOUP-001, TC-SOUP-002 | Auto | PASS |
| SRS-INT-023 | spaCy used for syntactic/morphological analysis | M | TC-SOUP-001, TC-SOUP-002 | Auto | PASS |
| SRS-INT-024 | sentence-transformers (all-mpnet-base-v2) for semantic scoring | M | TC-SOUP-001, TC-SOUP-002 | Auto | PASS |
| SRS-INT-025 | j-hartmann emotion model via HuggingFace transformers | M | TC-SOUP-001, TC-SOUP-002 | Auto | PASS |
| SRS-INT-030 | Frontend–backend communication via HTTP over local network | M | — | Code review | NOT TESTED |
| SRS-INT-031 | All patient-data endpoints require valid JWT Bearer token | M | TC-OWA-010 | Auto | PASS |
| SRS-INT-032 | CORS headers restrict to configured frontend origin | M | — | Code review | NOT TESTED |

---

## 12. Performance Requirements (SRS-PRF)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-PRF-001 | Pipeline returns result within 60 seconds under normal conditions | M | — | Manual timing | NOT TESTED |
| SRS-PRF-002 | Dashboard loads within 3 seconds (Desirable) | D | — | Browser | NOT TESTED |
| SRS-PRF-003 | Recording interface ready within 2 seconds | M | — | Browser | NOT TESTED |
| SRS-PRF-004 | Handles ≥ 10 simultaneous assessments without >50% degradation (Desirable) | D | — | Load test | NOT TESTED |

---

## 13. Safety Requirements (SRS-SAF)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-SAF-001 | Non-dismissible clinician-only notice on every report | M | TC-SAF-001, TC-REP-003 | Auto/Browser | PASS |
| SRS-SAF-002 | No scores/flags on patient-facing screen at any point | M | TC-SAF-002, TC-REC-002 | Auto/Browser | PASS |
| SRS-SAF-003 | Completed task result not overwritten without re-submission | M | — | Code review | NOT TESTED |
| SRS-SAF-004 | Amber warning on report when patient L1 is not English | M | — | Browser | NOT TESTED |
| SRS-SAF-005 | Amber/red warning on report for suboptimal recording conditions | M | — | Browser | NOT TESTED |
| SRS-SAF-006 | Empty transcript → error state; no invalid scores produced | M | TC-PIP-004, TC-SAF-003 | Auto | PASS |
| SRS-SAF-007 | Flag severity thresholds consistently applied | M | — | Clinical validation | NOT TESTED |
| SRS-SAF-008 | Assessment records stored immutably on completion | M | — | Code review | NOT TESTED |
| SRS-SAF-009 | Under-18 modal warning displayed and enforced at intake | M | TC-SAF-004 | Manual / Browser | NOT TESTED |

---

## 14. Security Requirements (SRS-SEC)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-SEC-001 | Passwords hashed with bcrypt; plaintext never stored or logged | M | TC-SEC-001 | Auto | PASS |
| SRS-SEC-002 | JWT signed with HS256; secret ≥ 32 bytes; not in version control | M | TC-SEC-002, TC-OWA-003, TC-OWA-004, TC-OWA-005 | Auto | PASS |
| SRS-SEC-003 | All protected endpoints return 401 if token absent/malformed/expired | M | TC-OWA-010 | Auto | PASS |
| SRS-SEC-004 | Clinician can only access their own assessment data | M | TC-OWA-001, TC-OWA-002 | Auto | PASS |
| SRS-SEC-005 | Temp audio files deleted after pipeline — success or failure | M | TC-SEC-003 | Auto | SKIPPED |
| SRS-SEC-006 | No patient identifiers transmitted to GCP STT | M | TC-SEC-004 | Code review | MANUAL |
| SRS-SEC-007 | SQLite DB in application working directory; filesystem controls org's responsibility | M | — | Deployment guide | NOT TESTED |
| SRS-SEC-008 | Error responses do not leak stack traces, DB paths, or ORM internals | M | TC-OWA-006 | Auto | PASS |
| SRS-SEC-009 | Parameterised queries; Pydantic validation; no 5xx on bad input | M | TC-OWA-007, TC-OWA-008, TC-OWA-009 | Auto | PASS |

---

## 15. AI/ML Algorithm Requirements (SRS-AI)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-AI-001 | AI model weights locked; no online learning during clinical use | M | TC-SOUP-001, TC-SOUP-002 | Auto | PASS |
| SRS-AI-002 | Model update requires SOUP re-evaluation and change control | M | — | Process review | NOT TESTED |

---

## 16. SOUP Requirements (SRS-SOUP)

| Req ID | Requirement (short) | Priority | SVP Test Case | Method | Status |
|--------|---------------------|----------|---------------|--------|--------|
| SRS-SOUP-001 | All safety-relevant SOUP packages have exact == version pins | M | TC-SOUP-001 | Auto | PASS |
| SRS-SOUP-002 | Safety-relevant SOUP packages installed in deployment environment | M | TC-SOUP-002 | Auto | PASS |
| SRS-SOUP-003 | No HIGH or CRITICAL CVEs in installed SOUP packages | M | TC-SOUP-003 | Auto | PASS |

---

## 17. Coverage Summary

| Category | Mandatory Req. | Automated PASS | Manual/PASS | Skipped | NOT TESTED |
|----------|---------------|---------------|-------------|---------|------------|
| FUN — Authentication (001–006) | 6 | 4 | 0 | 0 | 1 |
| FUN — Patient Reg. (010–015) | 6 | 3 | 0 | 1 | 1 |
| FUN — Assessment (020–028) | 9 | 5 | 0 | 0 | 3 |
| FUN — Recording (030–039) | 10 | 0 | 2 | 0 | 8 |
| FUN — Pipeline (040–050) | 11 | 7 | 2 | 0 | 1 |
| FUN — Progress (055–057) | 3 | 0 | 0 | 0 | 3 |
| FUN — Reporting (060–067) | 7 | 1 | 2 | 0 | 4 |
| FUN — Findings (070–075) | 6 | 4 | 0 | 0 | 1 |
| FUN — Summary (080–083) | 4 | 0 | 3 | 0 | 1 |
| FUN — Dashboard (090–092) | 3 | 0 | 0 | 0 | 3 |
| INT — Interfaces | 15 | 7 | 2 | 0 | 6 |
| PRF — Performance | 2 | 0 | 0 | 0 | 2 |
| SAF — Safety | 8 | 3 | 0 | 0 | 5 |
| SEC — Security | 9 | 8 | 1 | 1 | 0 |
| AI — Algorithm locking | 2 | 1 | 0 | 0 | 1 |
| SOUP | 3 | 3 | 0 | 0 | 0 |
| **Total (Mandatory)** | **104** | **46** | **12** | **2** | **41** |

> **Note:** Desirable (D) requirements (SRS-FUN-029, SRS-FUN-065, SRS-INT-005, SRS-PRF-002, SRS-PRF-004) are excluded from this count as they are aspirational for v1.0.

---

## 18. Outstanding Gaps — Pre-Release Actions

The 41 "NOT TESTED" mandatory requirements represent planned verification activities that have not yet been executed. The following groupings indicate the nature of the gap:

| Gap category | Req. count | Planned resolution |
|---|---|---|
| Browser-dependent (require live browser test session) | ~25 | System-level manual test session on target hardware before first-patient-in |
| Performance (timing/load) | 2 | Load test script or manual timing against production server |
| Code review items (correctness verifiable by inspection) | ~6 | Formal code review checklist, sign-off in CA-SRR-001 |
| Clinical validation (flag thresholds, score validity) | 2 | Concurrent validity study per CA-IB-001 |
| Procedural/process (change control, SOP) | 2 | Document in SOP and reference in CA-SRR-001 |

A formal browser-based system test session is planned as the final pre-deployment verification step. Results will be recorded in a CA-STR-001 (System Test Record) and referenced in CA-SRR-001 §7 before any clinical site goes live.

---

*CA-RTM-001 v1.0 — MemoryTell Ltd / St John Lynch & Co. Ltd © 2026*
