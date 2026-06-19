# Software Validation Report

**Document ID:** CA-VR-001  
**Product:** CogAssess — Speech Biomarker Assessment Platform  
**Version:** 1.0  
**Date:** 2026-06-06  
**Status:** Partially complete — sections marked [PENDING] to be completed before clinical release  
**Prepared by:** St John Lynch & Co. Ltd / MemoryTell Ltd  
**Standards:** IEC 82304-1:2016 §6 | IEC 62304:2006+AMD1:2015 §5.7 | IEC 62366-1:2015

---

## Document Control

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1 | 2026-06-06 | Development Team | Initial draft — automated validation sections completed |

---

## Validation Sign-Off

*To be completed before first-patient-in.*

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Development Lead | | | |
| Quality Reviewer | | | |
| Principal Investigator | | | |

---

## 1. Introduction

This Software Validation Report (VR) records the results of all validation activities defined in CA-VP-001 (Software Validation Plan). It is produced in accordance with IEC 82304-1:2016 §6, which requires manufacturers of health software to document evidence that the software meets its intended use in the intended use environment.

This document should be read in conjunction with:
- CA-VP-001 — Software Validation Plan (defines the activities)
- CA-SVP-001 — Software Verification Plan (automated and manual tests)
- CA-RTM-001 — Requirements Traceability Matrix
- CA-SEC-001 §10 — Penetration Test Record

---

## 2. VA-001: System-Level Functional Validation

**Status: [PENDING]**

*To be completed during the formal pre-deployment system test session. Results to be recorded in CA-STR-001.*

| Field | Value |
|-------|-------|
| Tester | [Name — not the developer] |
| Test environment | [OS, browser, server type] |
| Date | [Date of session] |
| GCP project | [Project ID] |
| Database | [PostgreSQL version and host] |
| HTTPS | [Certificate issuer / domain] |

### 2.1 Summary of Results

| Result | Count |
|--------|-------|
| Total Mandatory requirements with browser/GCP steps | 41 |
| Passed | [to be completed] |
| Failed — Critical | [to be completed] |
| Failed — Major | [to be completed] |
| Failed — Minor (accepted) | [to be completed] |

### 2.2 Acceptance Criteria Met?

| Criterion | Met? | Notes |
|-----------|------|-------|
| All Mandatory requirements produce expected outcome | [Y/N] | |
| No Critical or Major defects open | [Y/N] | |
| Minor defects documented and risk-accepted | [Y/N] | |

### 2.3 Open Defects

*Record any defects identified during VA-001 here. Each defect must be resolved or formally accepted before release.*

| Defect ID | Description | Severity | Resolution | Status |
|-----------|-------------|----------|------------|--------|
| | | | | |

---

## 3. VA-002: Security Validation

### 3.1 Sub-activity A — API-Layer Penetration Test (TC-OWA-001 to TC-OWA-010)

**Status: COMPLETE — 2026-06-06**

| Field | Value |
|-------|-------|
| Test date | 2026-06-06 |
| Tool | pytest (tests/test_owasp.py) |
| Reference | OWASP API Security Top 10 (2023 edition) |
| Tester | St John Lynch & Co. Ltd development team |
| Test run log | logs/test_log_20260606-113847.md |

**Findings identified before final test run:**

Three BOLA (Broken Object Level Authorization) vulnerabilities were identified during test development and remediated before the final test execution:

| Finding | Endpoint affected | Severity | Remediation | Status |
|---------|------------------|----------|-------------|--------|
| BOLA-001 | GET /assessments — no clinician_id filter | High | Added `.filter(clinician_id == clinician.id)` in list_assessments() | Closed |
| BOLA-002 | GET /assessments/{key} — no ownership check | High | Added clinician_id check to get_assessment() | Closed |
| BOLA-003 | GET /assessments/{key}/findings/history — no ownership check | High | Added clinician_id check to get_findings_history() | Closed |

**Final test results:**

| TC | OWASP Risk | Description | Result |
|----|------------|-------------|--------|
| TC-OWA-001 | API1 — BOLA | Clinician B cannot see Clinician A's assessments | PASS |
| TC-OWA-002 | API1 — BOLA | Clinician B cannot access Clinician A's assessment detail | PASS |
| TC-OWA-003 | API2 — Broken Auth | JWT alg:none token rejected (CVE-2024-33663 mitigation) | PASS |
| TC-OWA-004 | API2 — Broken Auth | JWT payload tampering rejected | PASS |
| TC-OWA-005 | API2 — Broken Auth | JWT wrong signature rejected | PASS |
| TC-OWA-006 | API3 — Data Exposure | Error responses do not leak internals | PASS |
| TC-OWA-007 | API3 — Mass Assignment | Extra fields silently rejected | PASS |
| TC-OWA-008 | API8 — Injection | SQL injection payloads do not cause 5xx | PASS |
| TC-OWA-009 | API4 — Resource Consumption | Oversized payload does not cause 5xx | PASS |
| TC-OWA-010 | API2 — Broken Auth | All 10 protected endpoints return 401 unauthenticated | PASS |

**Conclusion:** 10/10 PASS. No open findings.

### 3.2 Sub-activity B — OWASP ZAP Dynamic Scan

**Status: [PENDING]**

*To be executed after deployment to production-equivalent server. See CA-VP-001 §5 (VA-002) and CA-SEC-001 §10.3 for the ZAP command.*

| Field | Value |
|-------|-------|
| Scan date | [to be completed] |
| Target URL | [production domain] |
| ZAP version | [to be completed] |
| Scan type | Active API scan (OpenAPI spec) |
| Report file | [CA-PEN-ZAP-001.html — to be attached] |

| Severity | Count | Open | Remediated |
|----------|-------|------|------------|
| Critical | | | |
| High | | | |
| Medium | | | |
| Low | | | |
| Informational | | | |

**Acceptance criteria met?**

| Criterion | Met? |
|-----------|------|
| No Critical findings open | [Y/N] |
| No High findings open | [Y/N] |
| Medium findings reviewed and accepted or remediated | [Y/N] |

### 3.3 Sub-activity C — Bandit Static Analysis

**Status: COMPLETE — 2026-06-06**

| Field | Value |
|-------|-------|
| Scan date | 2026-06-06 |
| Tool | Bandit v1.9.4 |
| Files scanned | main.py, auth.py, database.py, models.py, schemas.py |
| Total lines of code | 1,004 |

| Severity | Count | Assessment |
|----------|-------|------------|
| High | 0 | — |
| Medium | 0 | — |
| Low | 3 | All false positives — see CA-SEC-001 §10.1 |

**Conclusion:** No actionable findings.

---

## 4. VA-003: Usability Evaluation

**Status: [PENDING]**

*To be completed by a trained evaluator with representative clinician participants before first-patient-in.*

| Field | Value |
|-------|-------|
| Evaluation date | [to be completed] |
| Evaluator | [Name] |
| Number of participants | [minimum 5] |
| Participant roles | [e.g., 2 neurologists, 2 neuropsychologists, 1 GP] |
| Site | [institution] |
| CogAssess version | 0.5.0-beta |

### 4.1 Task Completion Results

| Task | Scenario | Completion rate | Critical errors | Notes |
|------|----------|-----------------|-----------------|-------|
| 1 | Login and navigate to dashboard | | | |
| 2 | Register new patient | | | |
| 3 | Create assessment with task battery | | | |
| 4 | Complete recording workflow | | | |
| 5 | Review clinical report | | | |
| 6 | Record findings and review patient summary | | | |

### 4.2 System Usability Scale (SUS)

| Participant | SUS Score |
|-------------|-----------|
| P1 | |
| P2 | |
| P3 | |
| P4 | |
| P5 | |
| **Mean** | |

SUS interpretation: ≥ 70 = acceptable (Grade C); ≥ 80 = good (Grade B); ≥ 90 = excellent (Grade A).

### 4.3 Use-Related Hazards Identified

*Record any observed misuse, near-miss, or safety-relevant use error.*

| Hazard ID | Observation | RMF hazard ref | Severity | Resolution |
|-----------|-------------|---------------|----------|------------|
| | | | | |

### 4.4 Acceptance Criteria Met?

| Criterion | Met? | Notes |
|-----------|------|-------|
| Task completion rate ≥ 90% for all 6 tasks | [Y/N] | |
| No safety-relevant use errors (score misinterpreted as diagnosis) | [Y/N] | |
| SUS ≥ 70 | [Y/N] | |
| All use errors reviewed against CA-RMF-001 | [Y/N] | |

---

## 5. VA-004: Clinical Performance Validation (Concurrent Validity Study)

**Status: [PENDING — to be completed after clinical investigation]**

*Full results to be recorded in CA-CIR-001 (Clinical Investigation Report). A summary is to be extracted here after completion.*

| Field | Value |
|-------|-------|
| Study protocol | CA-IB-001 |
| Principal Investigator | [Name] |
| Site | [Institution] |
| Ethics approval reference | [to be completed] |
| Study period | [Start date] – [End date] |
| Enrolled participants | [N] |
| Completed assessments | [N] |

### 5.1 Primary Outcome — Concurrent Validity

| Domain | Correlation with [standard measure] | p-value | Meets criterion (r ≥ 0.50)? |
|--------|-------------------------------------|---------|------------------------------|
| Motor speech | | | |
| Semantic memory | | | |
| Episodic memory | | | |
| Emotional processing | | | |
| Composite | | | |

### 5.2 System Performance

| Metric | Result | Criterion | Met? |
|--------|--------|-----------|------|
| Pipeline completion rate (successful recordings) | | ≥ 95% | |
| Data loss events | | 0 | |
| Safety events attributable to CogAssess | | 0 | |

### 5.3 Acceptance Criteria Met?

| Criterion | Met? | Notes |
|-----------|------|-------|
| ≥ 95% pipeline completion rate | [Y/N] | |
| ≥ 1 domain shows r ≥ 0.50 with concurrent standard | [Y/N] | |
| Zero safety events attributable to CogAssess | [Y/N] | |
| Zero system failures resulting in data loss | [Y/N] | |

---

## 6. Automated Verification Results (from CA-SVP-001)

*These are the automated test results from the most recent run of python run_tests.py, included here for completeness.*

**Test run reference:** TR-20260606-113847  
**Date:** 2026-06-06  
**Command:** `python run_tests.py`

| Metric | Value |
|--------|-------|
| Total test cases collected | 56 |
| Passed | 42 |
| Failed | 0 |
| Skipped | 14 |
| Outcome | **PASS** |

The 14 skipped test cases require a live browser or GCP connection and are addressed by VA-001 (system-level functional validation).

---

## 7. Overall Validation Summary

| Activity | Status | Criterion met? |
|----------|--------|----------------|
| VA-001: System-level functional validation | PENDING | — |
| VA-002A: API penetration test | COMPLETE | YES |
| VA-002B: OWASP ZAP dynamic scan | PENDING | — |
| VA-002C: Bandit static analysis | COMPLETE | YES |
| VA-003: Usability evaluation | PENDING | — |
| VA-004: Clinical performance validation | PENDING | — |
| VA-005: Post-deployment monitoring | ONGOING from FPI | — |

### Release Gate Checklist

| Gate | Criterion | Status |
|------|-----------|--------|
| G-01 | All 44 SVP test cases: Failed = 0 | PASS (2026-06-06) |
| G-02 | System-level manual test complete; no Critical/Major defects | PENDING |
| G-03 | OWASP ZAP: no Critical/High open | PENDING |
| G-04 | Usability: SUS ≥ 70; no safety use errors | PENDING |
| G-05 | All RMF residual risks rated Acceptable | PASS — see CA-RMF-001 §8 |
| G-06 | Ethics committee approval | PENDING |
| G-07 | Sponsor sign-off on CA-SRR-001 §8 | PENDING |
| G-08 | Production deployment checklist | PENDING |

**Current release readiness: NOT READY FOR CLINICAL USE** — 5 of 8 gate criteria pending.

---

*CA-VR-001 v1.0 — MemoryTell Ltd / St John Lynch & Co. Ltd © 2026*
