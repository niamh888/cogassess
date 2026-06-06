# Risk Management File

| Field | Value |
|---|---|
| Document ID | CA-RMF-001 |
| Title | Risk Management File — CogAssess Speech Biomarker Assessment Platform |
| Version | 1.0 |
| Date | 2026-06-05 |
| Author | MemoryTell Ltd / St John Lynch & Co. Ltd |
| Status | Released |
| IEC 62304 Software Safety Class | Class B |
| Companion Documents | CA-SRS-001, CA-SAD-001, CA-SDP-001, CA-SVP-001 |
| Standard | ISO 14971:2019 — Application of risk management to medical devices |

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Risk Management Plan](#2-risk-management-plan)
3. [Risk Acceptability Matrix](#3-risk-acceptability-matrix)
4. [Severity Classification](#4-severity-classification)
5. [Probability Classification](#5-probability-classification)
6. [Hazard Analysis](#6-hazard-analysis)
7. [Overall Residual Risk Evaluation](#7-overall-residual-risk-evaluation)
8. [Benefit-Risk Determination](#8-benefit-risk-determination)
9. [Risk Management Report Summary](#9-risk-management-report-summary)
10. [References](#10-references)

---

## 1. Purpose and Scope

### 1.1 Purpose

This document constitutes the Risk Management File (RMF) for CogAssess, a web-based speech biomarker assessment platform intended for use by qualified clinicians as a decision-support tool in the preliminary evaluation of cognitive function. It has been prepared in accordance with ISO 14971:2019 — *Application of risk management to medical devices* — and IEC 62304:2006+A1:2015 — *Medical device software — Software life cycle processes*.

The RMF establishes the risk management plan, risk acceptability criteria, hazard analysis, risk control measures, and residual risk evaluation for CogAssess version 1.0. It is a living document and shall be reviewed and updated at each major software release, following any incident report, or at least annually.

### 1.2 Scope

This file covers all risks arising from the intended use and reasonably foreseeable misuse of the CogAssess software system, including:

- The FastAPI Python backend and all five stages of the speech analysis pipeline (audio conversion, speech-to-text transcription via Google Cloud Speech-to-Text, acoustic feature extraction via librosa, linguistic analysis via spaCy, and semantic/emotion scoring via sentence-transformers and HuggingFace).
- The React 18 single-page application frontend.
- The SQLite database storing patient session and assessment records.
- Third-party Software of Unknown Provenance (SOUP) components as enumerated in CA-SOUP-001.
- Integration with Google Cloud Platform (GCP) for speech transcription.

### 1.3 Intended Use

CogAssess is intended for use by registered healthcare professionals (clinicians, speech-language pathologists, neuropsychologists) to conduct standardised speech-based assessments. The system generates speech biomarker scores across acoustic, linguistic, and semantic dimensions. All output is advisory only; scores must be interpreted by a qualified clinician in the context of a full clinical assessment. CogAssess is not intended for unsupervised patient self-administration and does not generate a diagnosis.

### 1.4 Intended Users

- Registered clinicians (primary users)
- Clinical administrators (system configuration and patient record management)

CogAssess is not intended for direct use by patients. Patients participate in recorded speech tasks under clinician supervision; they do not interact with the scoring interface and do not receive numerical scores directly from the system.

---

## 2. Risk Management Plan

### 2.1 Risk Policy

MemoryTell Ltd / St John Lynch & Co. Ltd adopts the following risk management policy for CogAssess:

- Risk management activities shall be conducted throughout the entire software development lifecycle in accordance with ISO 14971:2019.
- All identified hazards shall be analysed, and risk control measures shall be implemented to reduce risk to an acceptable level or, where residual risk remains, to demonstrate that benefits outweigh residual risks.
- All risks shall be reduced as far as possible. Where residual risk remains after all practicable control measures have been applied, a documented benefit-risk justification shall confirm that the clinical benefits of the device outweigh the residual risks (ISO 14971:2019 §4.4).
- No known unacceptable residual risk shall be present in a released version of CogAssess without explicit documented justification and senior management sign-off.
- Risk management activities shall be documented, reviewed, and approved by a designated risk manager prior to release.

### 2.2 Risk Management Team

| Role | Responsibility |
|---|---|
| Risk Manager | Owns this document; reviews hazard analysis; approves residual risk |
| Lead Developer | Implements and documents risk control measures in software |
| Clinical Consultant | Provides clinical context for severity ratings and harm pathways |
| QA Officer | Verifies that risk controls are implemented and tested |

### 2.3 Risk Acceptability Criteria

Risk acceptability is determined by the Risk Priority Number (RPN), calculated as:

**RPN = Severity (S) × Probability (P)**

| RPN Range | Category | Decision |
|---|---|---|
| < 4 | Acceptable | No further risk reduction required |
| 4 – 8 | Acceptable — justification required | All practicable risk controls must first be applied. The residual risk may then be accepted only with documented justification that (a) further reduction is not practicable and (b) clinical benefits outweigh the residual risk |
| > 8 | Unacceptable | Risk controls must be applied; device may not be released until RPN is reduced to ≤ 8 |

### 2.4 Residual Risk Acceptability

A residual risk is acceptable if, after the application of all practicable risk control measures:

1. The residual RPN falls within the Acceptable (<4) zone; or
2. The residual RPN falls within the 4–8 zone, and it has been demonstrated that (a) further risk reduction is not practicable without negating the clinical benefit of the device, and (b) the clinical benefits of the device outweigh the residual risk; and
3. The overall benefit-risk determination (Section 8) is positive.

---

## 3. Risk Acceptability Matrix

The following matrix defines risk categories by the combination of Severity (S, 1–4) and Probability (P, 1–5). Cell values show RPN = S × P and the corresponding acceptability category (A = Acceptable, A† = Acceptable with documented justification required, U = Unacceptable).

| | **P1** | **P2** | **P3** | **P4** | **P5** |
|---|---|---|---|---|---|
| **S4** | 4 A† | 8 A† | 12 U | 16 U | 20 U |
| **S3** | 3 A | 6 A† | 9 U | 12 U | 15 U |
| **S2** | 2 A | 4 A† | 6 A† | 8 A† | 10 U |
| **S1** | 1 A | 2 A | 3 A | 4 A† | 5 A† |

---

## 4. Severity Classification

| Severity Level | Label | Definition |
|---|---|---|
| S1 | Negligible | No patient harm; minor inconvenience or service disruption only. Clinical workflow is interrupted but no clinical consequences result. |
| S2 | Minor | Reversible harm or discomfort. Psychological distress, temporary anxiety, or minor data privacy concern. No lasting clinical impact when identified and corrected. |
| S3 | Serious | Irreversible harm or significant clinical consequence. Includes missed diagnosis leading to delayed treatment, significant privacy breach, or incorrect clinical record with lasting clinical impact. |
| S4 | Critical | Death, severe permanent disability, or catastrophic privacy/regulatory breach. |

---

## 5. Probability Classification

| Probability Level | Label | Estimated Frequency | Description |
|---|---|---|---|
| P1 | Negligible | < 0.01% | Extremely unlikely; theoretical hazard only. Expected to occur less than once in 10,000 sessions. |
| P2 | Remote | 0.01 – 0.1% | Unlikely under normal use conditions. Expected to occur less than once in 1,000 sessions. |
| P3 | Occasional | 0.1 – 1% | Possible under normal use; could occur several times per year in a moderate-volume deployment. |
| P4 | Probable | 1 – 10% | Likely to occur under normal use; would be expected in a high-volume deployment without controls. |
| P5 | Frequent | > 10% | Expected to occur regularly under normal use. |

---

## 6. Hazard Analysis

The following table presents the full hazard analysis for CogAssess v1.0. For each hazard, risk is assessed before and after the application of risk control measures.

**Column Key:** S = Severity, P = Probability, RPN = Risk Priority Number (S × P), SRS Ref = requirements traceability reference in CA-SRS-001.

| Hazard ID | Hazard Description | Harm | Hazardous Situation | Cause | S (before) | P (before) | RPN (before) | Risk Control Measures | S (after) | P (after) | RPN (after) | Acceptability | SRS Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H-001 | Incorrect speech biomarker score returned by the assessment pipeline | Erroneous clinical decision; missed or delayed diagnosis (e.g. missed dementia) | Clinician acts on an inaccurate score as if it were a definitive diagnostic result | STT transcription error introduced by poor audio quality or GCP model limitations; algorithmic failure in acoustic, linguistic, or semantic scoring modules producing an out-of-range or silently incorrect result | 3 | 4 | 12 | (1) System output is labelled as advisory only; UI prominently states scores require clinician interpretation (SRS-SAF-001). (2) Clinicians are prohibited by workflow design from communicating numerical scores directly to patients. (3) All score outputs are range-validated before display; out-of-range values trigger an error state rather than display. (4) Clinician training materials specify that CogAssess scores must be considered alongside full clinical assessment. | 3 | 2 | 6 | Acceptable | SRS-SAF-001 |
| H-002 | Patient data breach — SQLite database accessed by unauthorised party | Privacy violation; regulatory breach under GDPR / Data Protection Act 2018; reputational harm to organisation and patient | An unauthorised user gains access to stored patient assessment records | Missing or misconfigured JWT authentication on an API endpoint; brute-force or token theft attack; misconfigured server permissions on the SQLite database file | 3 | 2 | 6 | (1) JWT authentication enforced on all protected API endpoints (SRS-SEC-001, SRS-SEC-002). (2) Patient records use pseudonymised references (CA-YYYY-NNNN format); no patient names or NHS/PPS numbers stored in the CogAssess database (SRS-SEC-003). (3) Database file stored outside the web root with OS-level access controls. (4) All authentication failures logged for audit. | 3 | 1 | 3 | Acceptable | SRS-SEC-001, SRS-SEC-002 |
| H-003 | Silent pipeline failure — empty transcript returned by STT module but system returns zero scores as if a real measurement occurred | False normal score; clinician believes assessment was completed; disease state missed | GCP STT returns an empty string due to audio format error, network failure, or an inaudible recording; the pipeline treats this as valid input and produces zero scores | Network failure to GCP; unsupported audio codec; silent or inaudible recording submitted; GCP API quota exceeded returning empty response | 3 | 3 | 9 | (1) Explicit empty transcript check implemented at the STT output stage; an empty or whitespace-only transcript raises an error state rather than returning zero scores to the clinician (SRS-SAF-006, SRS-FUN-050). (2) Error state is displayed to the clinician in the UI, prompting retry or manual review. (3) Zero-score results are blocked from being saved to the database as completed assessments. | 3 | 1 | 3 | Acceptable | SRS-SAF-006, SRS-FUN-050 |
| H-004 | System unavailable during a patient assessment session | Assessment not completed; disruption to clinical service; appointment wasted | Clinician is mid-assessment when the server becomes unreachable or the application throws an unhandled error | Server crash; dependency failure (GCP outage); infrastructure issue; unhandled exception in the backend | 1 | 3 | 3 | (1) A user-friendly error page is displayed when the server is unreachable, informing the clinician of the interruption. (2) A manual fallback procedure (paper-based task administration) is documented in the CogAssess Clinical User Guide and referenced in clinician training. (3) Assessment state is preserved in the database where possible; completed stages are not lost on server restart. | 1 | 2 | 2 | Acceptable | — |
| H-005 | Assessment results associated with the wrong patient record | Incorrect clinical record; wrong treatment pathway; clinical governance failure | Clinician submits or reviews a completed assessment against the wrong patient | Session management error; clinician selects wrong patient from list; browser session shared between clinicians; UI ambiguity in patient selection workflow | 3 | 2 | 6 | (1) Human-readable assessment reference code (CA-YYYY-NNNN format) displayed prominently throughout the assessment workflow, enabling clinician verification (SRS-FUN-022). (2) Patient name and reference are shown at each stage of the assessment; clinician must confirm patient identity before proceeding to recording. (3) Only one active assessment per authenticated session is permitted; concurrent multi-patient sessions are not supported. (4) Assessment confirmation step required before final submission. | 3 | 1 | 3 | Acceptable | SRS-FUN-022 |
| H-006 | Numerical biomarker scores displayed to or accessible by the patient | Psychological distress; patient misinterpretation of scores as a diagnosis; anxiety or harm from seeing abnormal scores without clinical context | A patient views the numerical scoring output during or after the assessment | Patient gains access to the clinician-facing report page; screen sharing during a teleclinics session; clinician inadvertently shares their screen | 2 | 3 | 6 | (1) Recording and summary pages presented to the patient during the task do not display any numerical scores (SRS-SAF-002, SRS-FUN-081). (2) The patient-facing summary is a clinician-written free-text field only; no automated scores are included in patient-facing outputs. (3) Numerical scoring is accessible only from the authenticated clinician report view, which requires login. (4) Clinician training addresses screen management in teleclinics settings. | 2 | 1 | 2 | Acceptable | SRS-SAF-002, SRS-FUN-081 |
| H-007 | Audio recording submitted to Google Cloud Platform contains patient-identifiable information in metadata or filename | Personally identifiable information (PII) transferred to a third party (GCP) without explicit consent or appropriate safeguards | Audio sent to GCP STT API includes patient name, PPS number, or other identifiers in request metadata or file naming | Developer error in API call construction; patient ID accidentally passed as a metadata parameter to the GCP Speech-to-Text API | 2 | 2 | 4 | (1) Audio submitted to GCP STT contains no patient_ref, patient name, or any identifying metadata; the API call is constructed with a generic session token only (SRS-SEC-006). (2) Pseudonymisation by design: the internal patient reference (CA-YYYY-NNNN) is not derived from or linked to real-world identifiers in the API call. (3) Code review checklist item specifically verifies GCP call construction before each release. | 2 | 1 | 2 | Acceptable | SRS-SEC-006 |
| H-008 | Temporary audio file not deleted from the server filesystem after pipeline processing | Residual PII (voice recording) retained on server; privacy breach if server is accessed | Audio file persists on server filesystem after pipeline completes or after an error during processing | Exception thrown during pipeline processing causes the cleanup step to be bypassed; developer oversight in error handling | 2 | 2 | 4 | (1) Temporary audio file deletion is implemented in a `finally` block that executes regardless of whether the pipeline succeeds or raises an exception (SRS-SEC-005). (2) Automated test verifies that no temporary audio files remain after both successful and failed pipeline runs. (3) Server-side file retention audit included in operational security checklist. | 2 | 1 | 2 | Acceptable | SRS-SEC-005 |
| H-009 | Speech biomarker scores for a non-English first-language (L1) speaker interpreted without language context | Inflated false-positive cognitive flags in non-English L1 speakers; inappropriate clinical pathway triggered | Clinician interprets reduced linguistic complexity or semantic coherence scores as indicative of cognitive impairment without accounting for L1 linguistic differences | The NLP and semantic scoring models (spaCy, sentence-transformers, HuggingFace emotion classifier) are English-language models; reduced scores may reflect language proficiency rather than cognitive impairment | 2 | 3 | 6 | (1) Patient L1 language field captured at intake as a required field (SRS-FUN-014). (2) An amber warning is automatically displayed on the clinician report whenever the recorded L1 language is not English, advising the clinician to exercise caution in score interpretation. (3) Clinician training materials explicitly address interpretation of scores for non-English L1 speakers. | 2 | 2 | 4 | Acceptable | SRS-FUN-014 |
| H-010 | Noisy or acoustically suboptimal recording environment produces artefactually abnormal acoustic biomarker scores | Clinician misinterprets environmental noise artefact as a genuine acoustic feature of the patient's speech; inappropriate clinical concern raised | Assessment conducted in a noisy environment (e.g. open ward, busy clinic room); background noise degrades MFCC, pitch, and pause ratio calculations | Acoustic feature extraction (librosa) is sensitive to background noise; MFCC and pause detection algorithms may produce abnormal outputs in high-noise conditions | 2 | 3 | 6 | (1) Recording environment quality field captured at intake (quiet room, moderate background noise, noisy environment); this is displayed as a contextual confounding variable on the clinician report (SRS-FUN-015). (2) Clinician guidance recommends assessment in a quiet room with the door closed. (3) Environment field is a required intake field, ensuring clinicians actively consider recording conditions before proceeding. | 2 | 2 | 4 | Acceptable | SRS-FUN-015 |

---

## 7. Overall Residual Risk Evaluation

### 7.1 Residual Risk Summary

The following table summarises the residual RPN for all ten identified hazards after the application of risk control measures.

| Hazard ID | Description (summary) | Residual RPN | Category |
|---|---|---|---|
| H-001 | Incorrect biomarker score → erroneous clinical decision | 6 | Acceptable |
| H-002 | Patient data breach | 3 | Acceptable |
| H-003 | Silent failure / empty transcript treated as zero score | 3 | Acceptable |
| H-004 | System unavailable during assessment | 2 | Acceptable |
| H-005 | Assessment linked to wrong patient | 3 | Acceptable |
| H-006 | Numerical scores displayed to patient | 2 | Acceptable |
| H-007 | PII sent to GCP in audio metadata | 2 | Acceptable |
| H-008 | Temporary audio file not deleted | 2 | Acceptable |
| H-009 | Non-English L1 speaker scores misinterpreted | 4 | Acceptable |
| H-010 | Noisy environment degrades acoustic scores | 4 | Acceptable |

### 7.2 Residual Risk Acceptability Justification

Three hazards have a residual RPN in the 4–8 range after the application of risk control measures. In accordance with ISO 14971:2019 Section 4.4, the following documents that (a) all practicable risk controls have been applied, (b) further reduction is not practicable without negating clinical benefit, and (c) the clinical benefits of the device outweigh each residual risk.

**H-001 (RPN = 6 after controls):** The residual probability cannot be reduced to P1 without removing the core functionality of the device. The fundamental limitation is that all speech biomarker systems carry inherent measurement uncertainty; this is not unique to CogAssess and is characteristic of the technology class. The risk has been reduced to its lowest practicable level by ensuring that (a) output is advisory only, (b) a qualified clinician is always in the decision loop, and (c) range validation prevents silent out-of-range scores from being displayed. Further reduction (e.g. requiring a second clinician sign-off on every assessment) would impose a disproportionate operational burden that would negate the clinical utility of the device. The residual risk is Acceptable on the basis that the clinical benefit of structured, reproducible speech biomarker assessment materially outweighs the residual probability of a measurement error influencing a clinical decision.

**H-009 (RPN = 4 after controls):** The residual probability cannot be reduced to P1 without replacing the English-language AI models with multilingual equivalents, which is outside the scope of CogAssess v1.0. The residual risk is Acceptable on the basis that (a) L1 language is a required intake field, (b) an automated amber warning is displayed on every report for non-English L1 speakers, (c) clinician training explicitly addresses this limitation, and (d) the device is intended for English-language clinical settings; use in predominantly non-English-speaking populations is outside the current intended use.

**H-010 (RPN = 4 after controls):** The recording environment cannot be fully controlled by the software. The residual risk is Acceptable on the basis that (a) environment quality is captured at intake as a required field, (b) it is displayed as a confounding variable on the clinician report, and (c) clinical guidance recommends quiet room assessment. Further reduction would require hardware integration (e.g. noise-cancelling microphones) outside the scope of the software device.

### 7.3 Conclusion

No identified hazard has a residual RPN in the Unacceptable zone (>8). All residual risks are Acceptable — seven hazards have residual RPN < 4 requiring no further justification, and three hazards (H-001, H-009, H-010) have residual RPN in the 4–8 range with documented justification per Section 7.2. The overall residual risk profile of CogAssess v1.0 is assessed as acceptable subject to the benefit-risk determination in Section 8.

---

## 8. Benefit-Risk Determination

### 8.1 Clinical Benefit of CogAssess

CogAssess provides quantified, reproducible speech biomarker data to support clinicians in the preliminary evaluation of cognitive function. The clinical benefits include:

1. **Earlier indication of cognitive change:** Standardised speech task analysis can identify subtle changes in acoustic, linguistic, and semantic speech features that may precede overt clinical symptoms. CogAssess provides a structured, objective supplement to clinician observation.
2. **Reproducibility and standardisation:** Manual clinical assessment of speech is subject to inter-rater variability. CogAssess provides consistent computational scoring across assessors and time points.
3. **Efficiency:** The platform reduces the time required to administer and score standard speech tasks compared to manual transcription and analysis.
4. **Documentation:** The platform generates a structured, time-stamped clinical record of the speech assessment, supporting audit and continuity of care.
5. **Access:** Web-based deployment enables use in a range of clinical settings, including community memory clinics where access to specialist neuropsychometry may be limited.

### 8.2 Comparison with No Tool

In the absence of CogAssess or a comparable tool, clinicians rely on subjective clinical impression and informal observation of speech during consultation. This baseline carries its own risks, including:

- Greater inter-rater variability in assessment.
- No structured documentation of speech characteristics over time.
- Delayed identification of subtle, early-stage cognitive change.

### 8.3 Determination

The clinical benefit of CogAssess — earlier and more reproducible identification of speech biomarker changes associated with cognitive impairment — materially outweighs the residual risks identified in Section 6. All residual risks have been reduced to the lowest practicable level and assessed as Acceptable. Three hazards (H-001, H-009, H-010) have residual RPN in the 4–8 range; each is inherent to the technology class and is managed by design controls that keep a qualified clinician in the decision loop at all times. Documented justification for each is provided in Section 7.2.

**The overall benefit-risk determination for CogAssess v1.0 is POSITIVE. The device may be released.**

---

## 9. Risk Management Report Summary

| Item | Detail |
|---|---|
| Device | CogAssess Speech Biomarker Assessment Platform |
| Version | 1.0 |
| IEC 62304 Class | Class B |
| Risk Management Standard | ISO 14971:2019 |
| Total hazards identified | 10 (H-001 to H-010) |
| Hazards with unacceptable initial RPN (>8) | 2 (H-001 RPN=12, H-003 RPN=9) |
| Hazards with initial RPN 4–8 (Acceptable — justification required) | 6 (H-002, H-005, H-006, H-007, H-009, H-010) |
| Hazards with acceptable initial RPN (<4) | 2 (H-004, H-008) |
| Residual hazards in Unacceptable zone | 0 |
| Residual hazards with RPN 4–8 (Acceptable, justified) | 3 (H-001, H-009, H-010) |
| Residual hazards in Acceptable zone | 7 |
| Maximum residual RPN | 6 (H-001) |
| Residual risk acceptability justification documented | Yes — Section 7.2 |
| Benefit-risk determination | Positive — Section 8.3 |
| Release recommendation | Approved subject to verification of risk controls per CA-SVP-001 |

### 9.1 Risk Control Verification

All risk control measures identified in Section 6 shall be verified as implemented and effective prior to release. Verification shall be conducted as part of the software verification and validation activities documented in CA-SVP-001. Specifically:

- Software risk controls (range validation, empty transcript check, JWT enforcement, temp file deletion, advisory-only labelling, L1 warning, environment field) shall each be traceable to a test case in the CA-SVP-001 test protocol.
- Procedural risk controls (clinician training, fallback procedure documentation) shall be evidenced by training records and the CogAssess Clinical User Guide.

### 9.2 Residual Risk Communication

The following residual risks shall be communicated to users in the CogAssess Clinical User Guide and in-application guidance:

- Scores are advisory only and must not be used as the sole basis for a clinical decision (H-001).
- The system is validated for English-language use; caution is required for non-English L1 speakers (H-009).
- Assessment should be conducted in a quiet room; recording environment is noted on the report (H-010).

---

## 10. References

| Reference | Title |
|---|---|
| ISO 14971:2019 | Application of risk management to medical devices |
| IEC 62304:2006+A1:2015 | Medical device software — Software life cycle processes |
| IEC/TR 24971:2020 | Medical devices — Guidance on the application of ISO 14971 |
| CA-SRS-001 | CogAssess Software Requirements Specification |
| CA-SAD-001 | CogAssess Software Architecture Description |
| CA-SDP-001 | CogAssess Software Development Plan |
| CA-SVP-001 | CogAssess Software Verification Plan |
| CA-SOUP-001 | CogAssess SOUP Evaluation Records |

---

*End of CA-RMF-001 v1.0*
