# Software Validation Plan

**Document ID:** CA-VP-001  
**Product:** CogAssess — Speech Biomarker Assessment Platform  
**Version:** 1.0  
**Date:** 2026-06-06  
**Status:** Draft  
**Prepared by:** St John Lynch & Co. Ltd / MemoryTell Ltd  
**Standards:** IEC 82304-1:2016 §6 | IEC 62304:2006+AMD1:2015 §5.7 | IEC 62366-1:2015

---

## Document Control

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1 | 2026-06-06 | Development Team | Initial draft |
| 1.0 | 2026-06-06 | Development Team | First complete release |

---

## Table of Contents

1. Purpose and Scope  
2. Regulatory Framework  
3. Distinction Between Verification and Validation  
4. Intended Use and User Population  
5. Validation Activities  
6. Acceptance Criteria  
7. Roles and Responsibilities  
8. Validation Environment  
9. Validation Schedule  
10. References  

---

## 1. Purpose and Scope

This Software Validation Plan (VP) defines the validation activities, acceptance criteria, environment, and responsibilities for CogAssess version 0.5.0-beta. It is produced in accordance with IEC 82304-1:2016 §6 (Software validation), which requires manufacturers of health software to demonstrate that the software meets its specified intended use when operated in the intended environment by the intended users.

### 1.1 Scope

This plan covers all validation activities for CogAssess up to and including the first clinical investigation (concurrent validity study). It encompasses:

- System-level functional validation in the intended use environment
- Usability evaluation with representative users
- Clinical performance validation (concurrent validity)
- Security validation (API-layer and dynamic penetration testing)

The validation plan does not cover:

- Regulatory approval activities (these are addressed in CA-IB-001)
- Manufacturing quality management (not applicable — software-only product)
- Post-market surveillance (covered in CA-SRR-001 §9 and DEPLOYMENT.md §8)

### 1.2 Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| CA-SRS-001 | Defines the requirements that validation must confirm are met |
| CA-SVP-001 | Defines the software verification plan (complementary to validation) |
| CA-RTM-001 | Maps requirements to test cases and validation activities |
| CA-RMF-001 | Risk management file — validation must demonstrate residual risks are acceptable |
| CA-IB-001 | Investigator's Brochure — clinical investigation protocol |
| CA-VR-001 | Validation Report — records the results of activities defined in this plan |
| CA-SRR-001 | Software Release Record — release is conditional on VP activities being complete |

---

## 2. Regulatory Framework

CogAssess is regulated as a medical device under EU MDR 2017/745 (Article 2(1)) on the basis that it is software intended for clinical decision support in cognitive assessment. It is classified as:

- **IEC 62304 Class B** — software failure can contribute to a hazardous situation but is not life-threatening
- **IEC 82304-1** — standalone health software product
- **EU MDR Risk Class IIa** — based on intended use and the Classification Rules in Annex VIII, Rule 11 (software intended for diagnosis or treatment)

IEC 82304-1:2016 §6 requires the manufacturer to:

> "Plan, perform, and document validation activities to demonstrate that the health software product meets the specified intended use when used in the intended environment by the intended users."

This plan fulfils that obligation.

---

## 3. Distinction Between Verification and Validation

These terms are used precisely throughout the CogAssess documentation suite:

| Term | Question answered | Governed by | Document |
|------|------------------|-------------|---------|
| **Verification** | "Did we build it right?" — Does the software conform to its specified requirements? | IEC 62304 §5.6–§5.7 | CA-SVP-001 |
| **Validation** | "Did we build the right thing?" — Does the software meet its intended use in the real world? | IEC 82304-1 §6 | This document (CA-VP-001) |

Verification (the automated test suite, code review, and static analysis in CA-SVP-001) is a necessary but insufficient condition for release. Validation confirms that the verified system actually works for its intended clinical purpose, with real users, in the real environment.

---

## 4. Intended Use and User Population

### 4.1 Intended Use

CogAssess is intended to assist qualified clinicians in the cognitive assessment of adult patients (aged 18+) by providing quantitative speech biomarker indicators derived from short recorded speech samples. Outputs are intended solely to supplement, not replace, clinical judgement.

CogAssess is **not** intended to:
- Diagnose any medical condition
- Be used without clinician supervision
- Replace established neuropsychological assessment batteries
- Be interpreted directly by patients

### 4.2 Intended Users

| User type | Characteristics | Access level |
|-----------|----------------|-------------|
| Clinician | Healthcare professional (neurologist, neuropsychologist, GP, geriatrician) trained in cognitive assessment; basic IT literacy; no software engineering knowledge required | Full access — all clinical functions |
| Patient | Adult (18+); may have cognitive impairment; uses only the recording interface | Restricted — recording screen only |

### 4.3 Intended Use Environment

| Environment | Description |
|-------------|-------------|
| Clinical setting | Memory clinic, neurology outpatient, GP practice, or equivalent |
| Device | Laptop or desktop computer; Chrome, Firefox, or Safari (current version) |
| Network | Clinician workstation on a secure clinical network or VPN |
| Audio | Internal laptop microphone or external USB microphone in a reasonably quiet room |

---

## 5. Validation Activities

The validation programme consists of five activities, executed sequentially. Activities 1 and 2 are completed before the clinical investigation begins. Activities 3, 4, and 5 are part of the clinical investigation.

### VA-001: System-Level Functional Validation

**Purpose:** Confirm that CogAssess meets all Mandatory requirements in CA-SRS-001 in a deployed environment equivalent to the intended use environment.

**Method:** A structured manual test session against the browser-dependent and GCP-dependent test cases listed in CA-RTM-001 as "NOT TESTED" or "MANUAL". The session is conducted on production-equivalent hardware by a trained tester who is not the developer. Test steps and observations are recorded in a System Test Record (CA-STR-001).

**Acceptance criteria:**
- All Mandatory requirements with browser-based or GCP-based verification steps produce the expected outcome.
- No Critical or Major defects remain open.
- Minor defects are documented, risk-assessed, and accepted or deferred with written justification.

**Timing:** Before first-patient-in (FPI) at any clinical site.

**Evidence:** CA-STR-001 (System Test Record), countersigned by quality reviewer.

---

### VA-002: Security Validation

**Purpose:** Confirm that no exploitable vulnerabilities exist in the deployed production system.

**Sub-activity A — API-layer penetration test (TC-OWA-001 to TC-OWA-010):**  
Status: **Completed 2026-06-06. All 10 test cases PASS.** Results recorded in CA-SEC-001 §10.2.  
Three BOLA vulnerabilities identified during test development and remediated before re-test:
- `GET /assessments` — no clinician filter (fixed)
- `GET /assessments/{key}` — no ownership check (fixed)
- `GET /assessments/{key}/findings/history` — no ownership check (fixed)

**Sub-activity B — OWASP ZAP dynamic scan:**  
Status: **Pending.** To be executed against the production server after deployment.  
Command: see CA-SEC-001 §10.3.  
Acceptance criteria: No CRITICAL or HIGH findings; MEDIUM findings reviewed and either remediated or risk-accepted with written justification.

**Sub-activity C — Bandit static analysis:**  
Status: **Completed 2026-06-06. 3 Low/false-positive findings, 0 Medium/High/Critical.** Results recorded in CA-SEC-001 §10.1.

**Timing:** Sub-activity A and C complete. Sub-activity B: before first-patient-in.

**Evidence:** CA-SEC-001 §10 (Penetration Test Record).

---

### VA-003: Usability Evaluation

**Purpose:** Confirm that CogAssess can be used safely and effectively by the intended clinician user population without specialised training beyond a standard onboarding session.

**Method:** Formative and summative usability evaluation per IEC 62366-1:2015. A minimum of 5 representative clinicians (neurologists, neuropsychologists, or GPs with memory assessment experience) complete a structured task scenario covering:

1. Log in and navigate to the dashboard
2. Register a new patient with a pseudonymised reference
3. Create an assessment with a specified task battery
4. Hand the device to a simulated patient and complete the recording workflow
5. Review the clinical report
6. Record clinical findings and review the patient summary

Observations are recorded by an independent facilitator. A System Usability Scale (SUS) questionnaire is administered after the session.

**Acceptance criteria:**
- Task completion rate ≥ 90% for all 6 task scenarios.
- No use-related hazards involving misinterpretation of scores as a diagnosis.
- No use errors resulting in patient data being exposed to the patient-facing screen.
- SUS score ≥ 70 (grade C or above — "Good" usability).
- Any use errors identified are reviewed against CA-RMF-001 hazards.

**Timing:** Before first-patient-in; may overlap with VA-001.

**Evidence:** Usability Evaluation Record (CA-UER-001) — separate document.

---

### VA-004: Clinical Performance Validation (Concurrent Validity Study)

**Purpose:** Confirm that the speech biomarker scores produced by CogAssess are clinically meaningful and correlate with established cognitive assessment tools in the target patient population.

This is the primary validation activity for CogAssess as a clinical decision support tool. It is the subject of the clinical investigation described in full in CA-IB-001.

**Method:** Prospective concurrent validity study at a minimum of one clinical research site.

- **Patient population:** Adults referred for cognitive assessment, aged 50+, English L1 or bilingual English
- **Primary outcome measure:** Correlation of CogAssess composite domain scores with standard neuropsychological assessments (MoCA, MMSE, or equivalent)
- **Secondary outcome measure:** Sensitivity and specificity for identifying patients with cognitive impairment versus normal ageing at a site-specific threshold
- **Sample size:** Minimum 30 participants for initial feasibility study (see CA-IB-001 §5)

**Acceptance criteria (feasibility):**
- CogAssess scoring pipeline completes successfully for ≥ 95% of submitted recordings.
- At least one domain score shows Pearson r ≥ 0.50 with the concurrent standard measure.
- No safety events attributable to CogAssess misuse (clinician acts on CogAssess output alone, without their own assessment).
- No system failures that result in loss of patient data.

**Timing:** Clinical investigation per CA-IB-001; to be completed before regulatory submission.

**Evidence:** Clinical Investigation Report (CA-CIR-001) — to be produced after completion of the study.

---

### VA-005: Post-Deployment Monitoring

**Purpose:** Confirm ongoing safety and performance once CogAssess is deployed to a clinical site.

**Method:**
- Daily automated CVE scanning (see DEPLOYMENT.md §8.3)
- Anomaly log review at each test run (logs/anomaly_log.md)
- Quarterly review of any clinical site feedback and near-miss reports
- Annual SOUP re-evaluation (CA-SOUP-001 §4)

**Acceptance criteria:**
- No HIGH/CRITICAL CVEs introduced without documented remediation within the timelines specified in DEPLOYMENT.md §8.3.4.
- No open defects rated Critical or High without a documented mitigation plan.

**Timing:** Ongoing from first clinical deployment.

**Evidence:** Anomaly log, CVE scan logs, annual SOUP review records.

---

## 6. Acceptance Criteria — Overall Release Gate

CogAssess shall not be released for use in a clinical investigation until all of the following conditions are met:

| Gate | Criterion | Evidence |
|------|-----------|---------|
| G-01 | All 43 SVP test cases executed; Failed = 0 | Test log (logs/test_log_*.md) |
| G-02 | System-level manual test session complete; no Critical/Major defects open | CA-STR-001 |
| G-03 | OWASP ZAP dynamic scan: no Critical/High findings open | CA-SEC-001 §10.3 addendum |
| G-04 | Usability evaluation complete; SUS ≥ 70; no safety-relevant use errors | CA-UER-001 |
| G-05 | All residual risks in CA-RMF-001 rated Acceptable (A or A†) | CA-RMF-001 §8 |
| G-06 | Ethics committee approval obtained | CA-IB-001 cover page |
| G-07 | Sponsor sign-off on CA-SRR-001 §8 | CA-SRR-001 |
| G-08 | Production deployment checklist complete | DEPLOYMENT.md §9 |

---

## 7. Roles and Responsibilities

| Role | Validation responsibilities |
|------|-----------------------------|
| Development Lead (MemoryTell / St John Lynch & Co.) | Author and maintain validation plan; ensure VA-001 and VA-002 are executed; review VA-003 findings |
| Quality Reviewer | Counter-sign CA-STR-001; verify gate criteria G-01 to G-05 before issuing release |
| Principal Investigator (clinical site) | Execute VA-004 (clinical study); complete CA-CIR-001 |
| Clinician testers (VA-003) | Participate in usability evaluation; complete SUS questionnaire |
| Data Protection Officer | Review VA-004 data handling against GDPR obligations in CA-IB-001 Appendix C |

---

## 8. Validation Environment

System-level validation (VA-001) and security validation (VA-002B) shall be performed in an environment that is equivalent to the production deployment:

| Component | VA-001 / VA-002 requirement |
|-----------|----------------------------|
| Operating system | Linux (Ubuntu 22.04 LTS) or equivalent — matching the production server OS |
| Python version | 3.10–3.13 (same minor version as production) |
| Database | PostgreSQL (not SQLite — as per production pre-conditions in CA-SRR-001 §7.5) |
| HTTPS | Enabled via Certbot/Let's Encrypt or ACM (not plain HTTP) |
| ffmpeg | Same version as production |
| GCP Chirp STT | Live connection — same GCP project and API version as production |
| Frontend | React app built (`npm run build`) and served via nginx (not Vite dev server) |
| Network | Accessible from a client browser over HTTPS; no localhost loopback |

---

## 9. Validation Schedule

| Activity | Owner | Target date | Status |
|----------|-------|-------------|--------|
| VA-001: System-level functional validation | Dev Lead | Before FPI | Not started |
| VA-002A: API pen test (TC-OWA) | Dev Lead | **Complete** | **DONE 2026-06-06** |
| VA-002B: OWASP ZAP scan | Dev Lead | Before FPI | Not started |
| VA-002C: Bandit static analysis | Dev Lead | **Complete** | **DONE 2026-06-06** |
| VA-003: Usability evaluation | Dev Lead + site team | Before FPI | Not started |
| VA-004: Clinical study (concurrent validity) | Principal Investigator | Per CA-IB-001 | Not started |
| VA-005: Post-deployment monitoring | Dev Lead | Ongoing from FPI | Not started |

---

## 10. References

| Document / Standard | Description |
|---------------------|-------------|
| IEC 82304-1:2016 | Health software — Part 1: General requirements for product safety |
| IEC 62304:2006+AMD1:2015 | Medical device software — Software life cycle processes |
| IEC 62366-1:2015+AMD1:2020 | Medical devices — Usability engineering |
| ISO 14971:2019 | Medical devices — Application of risk management |
| EU MDR 2017/745 | EU Medical Device Regulation |
| OWASP API Security Top 10 (2023) | Web application security risk framework |
| CA-SRS-001 | CogAssess Software Requirements Specification |
| CA-SVP-001 | CogAssess Software Verification Plan |
| CA-RTM-001 | CogAssess Requirements Traceability Matrix |
| CA-RMF-001 | CogAssess Risk Management File |
| CA-IB-001 | CogAssess Investigator's Brochure |
| CA-SEC-001 | CogAssess Security Architecture and Threat Model |
| CA-SRR-001 | CogAssess Software Release Record |
| CA-VR-001 | CogAssess Software Validation Report |

---

*CA-VP-001 v1.0 — MemoryTell Ltd / St John Lynch & Co. Ltd © 2026*
