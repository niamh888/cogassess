# Investigator's Brochure

## CogAssess Speech Biomarker Assessment Platform

| | |
|---|---|
| **Document reference** | CA-IB-001 |
| **Version** | 1.0 |
| **Date** | 06 June 2026 |
| **Status** | CONFIDENTIAL — For Investigator Use Only |
| **Sponsor** | MemoryTell Ltd |
| **Developed by** | St John Lynch & Co. Ltd |
| **Regulatory basis** | EU MDR 2017/745, Article 62; Annex XV |
| **GCP standard** | ICH E6 (R2) Good Clinical Practice |

---

> **Confidentiality statement:** This Investigator's Brochure contains confidential information belonging to MemoryTell Ltd. It is provided solely for the purpose of conducting the clinical investigation described herein. Recipients must not disclose, copy, or distribute its contents without prior written consent from the Sponsor.

---

## Table of Contents

1. Summary
2. Introduction
3. Device Description
4. Non-Clinical Data
5. Clinical Background and Literature Review
6. Summary of Known and Potential Risks
7. Guidance for Investigators
8. References
9. Appendices

---

## 1. Summary

**Device name:** CogAssess Speech Biomarker Assessment Platform
**Device type:** Software as a Medical Device (SaMD) — Rule 11, EU MDR 2017/745
**Intended purpose:** To support clinicians in the structured collection and analysis of speech biomarkers associated with Mild Cognitive Impairment (MCI) and early-stage dementia, as an adjunct to standard clinical assessment.
**Intended user:** Qualified clinicians (neurologists, neuropsychologists, geriatricians, speech and language therapists) in a clinical setting.
**Intended patient population:** Adults aged 50 or over presenting with subjective cognitive complaints or clinician-identified risk of MCI or early-stage dementia.

CogAssess records short speech samples (60–90 seconds per task) from patients using a standard web browser and microphone. A five-stage automated analysis pipeline extracts acoustic, linguistic, semantic, and emotional biomarkers from the speech, producing domain scores across four clinically relevant dimensions: motor speech, semantic memory, episodic memory, and emotional processing. Results are presented to the clinician as a scored report with a population reference distribution. A clinician-authored patient summary is generated for communication with the patient.

CogAssess does **not** produce a diagnosis. Outputs are speech biomarker indicators intended to supplement, not replace, the clinical judgement of a qualified healthcare professional.

---

## 2. Introduction

### 2.1 Background

Dementia affects approximately 55 million people worldwide, with Mild Cognitive Impairment (MCI) representing a critical transitional state between normal ageing and dementia in which early intervention may be most effective (Petersen, 2016). Current standard diagnostic pathways rely on neuropsychological testing (e.g. MMSE, MoCA), clinical interview, neuroimaging, and biofluid biomarkers. These approaches are resource-intensive, require specialist expertise, and are often unavailable at the point of first clinical contact.

Speech has emerged as a sensitive, non-invasive biomarker for cognitive change. Specific and measurable changes in speech — including reductions in lexical diversity, increased disfluency, altered pause patterns, reduced semantic coherence, and flattened emotional range — have been documented in MCI and dementia populations across multiple languages and assessment paradigms (Fraser et al., 2016; König et al., 2015; Luz et al., 2021; Balagopalan et al., 2021).

Advances in automatic speech recognition, natural language processing, and machine learning have made it feasible to extract these biomarkers from short, standardised speech samples in a clinical setting. However, most research-grade tools are not designed for clinical workflow integration, lack appropriate data governance, and have not undergone software lifecycle management to the standard required for medical device use.

### 2.2 Rationale for CogAssess

CogAssess has been developed to address the gap between research evidence for speech biomarkers and clinical usability. It is designed as a workflow-integrated, clinician-facing tool that:

- Captures standardised speech samples using commodity hardware (browser and microphone)
- Applies a transparent, auditable multi-stage analysis pipeline
- Presents results in a clinically interpretable format
- Maintains patient data governance consistent with GDPR and clinical data standards
- Has been developed under an IEC 62304 Class B software development lifecycle

The present clinical investigation is the first structured study of CogAssess in a clinical population. Its primary purpose is to evaluate feasibility, usability, and the preliminary relationship between CogAssess biomarker scores and established cognitive assessment instruments.

### 2.3 Development Stage

CogAssess is at version 0.5.0-beta. It has completed:

- Full IEC 62304 Class B software development lifecycle documentation
- Internal software verification against 30 defined test cases (CA-SVP-001)
- ISO 14971 risk management (CA-RMF-001)
- SOUP (Software of Unknown Provenance) evaluation for 14 third-party components (CA-SOUP-001)

CogAssess has **not** yet completed:

- Clinical validation of scoring algorithms against a reference standard
- Analytical validation of biomarker scores against established cognitive instruments in a representative clinical population
- CE marking under EU MDR 2017/745

This investigation is part of the clinical evaluation process required for CE marking.

---

## 3. Device Description

### 3.1 Overview

CogAssess is a browser-based web application with a FastAPI Python backend. It operates as a client-server system: the frontend (React) runs in the investigator's or patient's browser; the backend runs on a secure server and processes all audio data.

| Component | Technology | Role |
|---|---|---|
| Frontend | React 18 / JavaScript | Patient recording interface; clinician dashboard and report |
| Backend API | Python 3.13 / FastAPI | Authentication, workflow, pipeline orchestration |
| Database | SQLite (pilot); PostgreSQL (production) | Patient and assessment data storage |
| Speech pipeline | See Section 3.3 | Audio analysis |

### 3.2 Intended Use Statement

CogAssess is intended to be used by qualified clinicians to capture and analyse structured speech samples from adult patients (aged 50+) who are being assessed for possible MCI or early-stage dementia. The device generates speech biomarker domain scores as decision-support information to supplement the clinician's own assessment. CogAssess outputs are not diagnostic and must not be communicated directly to patients as a diagnosis or prognosis.

### 3.3 Speech Analysis Pipeline

CogAssess processes each recorded speech sample through five sequential stages. Three stages use deterministic signal processing or rule-based algorithms; two use locked pre-trained AI/ML models.

#### Stage 1 — Speech-to-Text (Google Cloud Chirp)

| Attribute | Detail |
|---|---|
| Type | **AI inference — external cloud service** |
| Provider | Google LLC |
| Model | Chirp (large-vocabulary ASR neural network) |
| Algorithm status | Locked — model weights are fixed and not retrained by CogAssess |
| Output | Verbatim transcript, word-level confidence scores, words per minute |

The transcript forms the input to all subsequent analysis stages. If the transcript contains fewer than five recognised words, the pipeline is terminated and a 422 error is returned to the clinician. No scores are produced for silent or unintelligible recordings.

#### Stage 2 — Acoustic Feature Extraction (librosa)

| Attribute | Detail |
|---|---|
| Type | **Deterministic — digital signal processing** |
| Library | librosa 0.10.x (open source) |
| Algorithm status | Not AI — mathematical transforms applied to audio waveform |
| Output | Speech rate, pause count, mean pause duration, pitch mean/SD, harmonic-to-noise ratio (HNR), articulation rate |

All acoustic features are computed deterministically from the audio waveform using established signal processing techniques. Given identical input audio, output is identical on every run.

#### Stage 3 — Morphological and Linguistic Analysis (spaCy)

| Attribute | Detail |
|---|---|
| Type | **Rule-based NLP with statistical components** |
| Library | spaCy 3.x with en_core_web_sm model |
| Algorithm status | Largely rule-based; POS tagging uses a statistical model (locked) |
| Output | Noun/verb ratio, first/third person pronoun ratio, type-token ratio, disfluency count, word count, unique word count |

Morphological features are extracted from the transcript using part-of-speech tagging and pattern matching. The en_core_web_sm model weights are fixed at the evaluated version.

#### Stage 4 — Semantic Analysis (sentence-transformers)

| Attribute | Detail |
|---|---|
| Type | **AI inference — locked pre-trained transformer model** |
| Model | all-mpnet-base-v2 (Microsoft / sentence-transformers) |
| Algorithm status | **Locked** — model weights are fixed. CogAssess does not retrain or fine-tune this model. |
| Output | Semantic variability, high-frequency word ratio, semantic granularity score, topic coherence |

The all-mpnet-base-v2 model encodes sentences as dense vectors. Semantic variability is computed as variance in pairwise cosine similarity across sentence embeddings. This stage is sensitive to lexical richness and thematic consistency of speech, known correlates of semantic memory function.

#### Stage 5 — Emotion Classification (j-hartmann/emotion-english-distilroberta-base)

| Attribute | Detail |
|---|---|
| Type | **AI inference — locked pre-trained transformer model** |
| Model | emotion-english-distilroberta-base (Jochen Hartmann) |
| Algorithm status | **Locked** — model weights are fixed. CogAssess does not retrain or fine-tune this model. |
| Output | Probability distribution across 7 emotion classes (joy, sadness, anger, fear, disgust, surprise, neutral); dominant emotion; valence |

This model is a fine-tuned DistilRoBERTa classifier trained on a large corpus of English text with emotion labels. It classifies the emotional tone of the transcript. Emotional processing changes, including affective flattening and reduced emotional range, have been reported in MCI and early dementia populations (Kessels et al., 2014).

### 3.4 Scoring

Domain scores are computed from a weighted combination of pipeline outputs. All domain scores are normalised to a 0–100 scale where higher values indicate better-preserved function. A composite score is derived from a weighted average of the four domain scores.

| Domain | Primary pipeline inputs |
|---|---|
| Motor speech (0–100) | Speech rate, pause count, HNR, articulation rate |
| Semantic memory (0–100) | Semantic variability, topic coherence, high-frequency word ratio |
| Episodic memory (0–100) | First-person ratio, type-token ratio, disfluency count |
| Emotional processing (0–100) | Dominant emotion, valence, emotional range |

> **Important limitation:** The scoring weights in CogAssess v0.5.0-beta are clinician-informed and theoretically derived. They have not been empirically calibrated against a clinical reference standard. The present investigation is intended, in part, to generate the data necessary for such calibration. Investigators must present scores to patients as indicative only.

### 3.5 Population Reference Distribution

Domain and composite scores are referenced against a normal distribution parameterised as μ = 70, σ = 15. This parameterisation is theoretically derived and has not been validated against population norms. Three zones are defined:

| Zone | Score range | Clinical interpretation |
|---|---|---|
| Low risk | ≥ 70 | Within typical range |
| Moderate | 45–69 | Below typical; warrants monitoring |
| Elevated | < 45 | Substantially below typical; warrants further assessment |

Zone thresholds will be revised following empirical analysis of data collected in this investigation.

### 3.6 Data Storage and Security

- All patient data is stored under a pseudonymous reference code; no patient name is stored in the system
- Audio files are processed in memory and deleted immediately after pipeline completion
- JWT authentication with 8-hour session expiry; passwords stored as bcrypt hashes
- Database encrypted at rest (production deployment)
- All data in transit encrypted via HTTPS/TLS 1.2+

### 3.7 Contraindications

CogAssess is contraindicated in:

- Patients who are unable to provide informed consent
- Patients with severe hearing impairment that prevents comprehension of task instructions
- Patients with pre-existing motor speech disorders (e.g. dysarthria, apraxia of speech) of non-cognitive aetiology, unless the primary research question relates to those conditions
- Patients whose primary language is not English (current version; multilingual support is in development)
- Patients aged under 18 years

---

## 4. Non-Clinical Data

### 4.1 Software Lifecycle Documentation

CogAssess has been developed under an IEC 62304:2006+AMD1:2015 Class B software lifecycle. The following documents are available to investigators upon request:

| Document | Reference | Description |
|---|---|---|
| Software Requirements Specification | CA-SRS-001 | ~80 functional, safety, and security requirements |
| Software Architecture Description | CA-SAD-001 | Five software items, pipeline architecture, data flows |
| Software Development Plan | CA-SDP-001 | Lifecycle model, coding standards, release criteria |
| Software Verification Plan & Report | CA-SVP-001 | 30 test cases; 16 automated, 14 pending browser/GCP prerequisites |
| Risk Management File | CA-RMF-001 | ISO 14971 hazard analysis — 10 hazards, all residual risks acceptable or ALARP |
| SOUP Evaluation Records | CA-SOUP-001 | 14 third-party components evaluated including CVE review |
| Security Architecture & Threat Model | CA-SEC-001 | STRIDE analysis, transport security, data minimisation |

### 4.2 Software Verification Summary

Automated testing covers 16 of 30 defined SVP test cases. Key verified behaviours include:

- Unauthenticated requests return HTTP 401
- JWT tokens expire after 8 hours
- Patient records do not store identifying names
- Assessment references follow a traceable CA-YYYY-NNNN format
- Empty transcripts (<5 words) are rejected before scoring (no silent-pass false scores)
- Clinical findings are immutably audit-logged; amendments require a documented reason
- Passwords are stored as bcrypt hashes; JWT uses HS256

### 4.3 Known Software Limitations

- Scoring algorithms are not clinically validated (see Section 3.4)
- Population reference distribution is theoretically derived (see Section 3.5)
- System is not yet validated for languages other than English
- SQLite database is used in the pilot; migration to PostgreSQL is required for multi-site production deployment
- Penetration testing has not yet been completed

---

## 5. Clinical Background and Literature Review

### 5.1 Speech Biomarkers in MCI and Dementia

A substantial body of peer-reviewed literature supports the use of automatically extracted speech features as sensitive indicators of cognitive change in MCI and early dementia:

**Lexical and semantic features:**
Fraser et al. (2016) demonstrated that NLP features extracted from speech transcripts, including information units, repetitions, and semantic similarity, distinguished Alzheimer's disease patients from controls with 81.9% accuracy using a logistic regression classifier applied to the DementiaBank dataset. Semantic similarity measures derived from word embeddings — analogous to the semantic variability score in CogAssess — were among the most discriminative features.

**Acoustic features:**
König et al. (2015) showed that acoustic features including speech rate, pause duration, and voice quality measures (including HNR) significantly differentiated MCI from cognitively normal controls. Increased pause frequency and longer pause duration are consistent findings across studies.

**Disfluency and morphology:**
Increased disfluency counts, reduced type-token ratio (lexical diversity), and shifts in pronoun use (increased first-person pronoun usage, reduced reference to others) have been reported as early indicators of MCI in multiple cohorts (Petti et al., 2020).

**Emotional processing:**
Affective flattening and reduced emotional responsiveness are recognised features of early Alzheimer's disease and frontotemporal dementia (Kessels et al., 2014). Automated emotion classification from speech transcripts is a developing methodology; evidence for its clinical validity in cognitive assessment remains preliminary.

**ADReSS and benchmark challenges:**
The ADReSS (Alzheimer's Dementia Recognition through Spontaneous Speech) challenge (Luz et al., 2021) established standardised benchmarks for automatic dementia recognition from speech, with top systems achieving AUC > 0.85 on the Cookie Theft picture description task — the same task format used in CogAssess task 1 (routine narrative).

### 5.2 Clinical Assessment Instruments

The following established instruments will be used as reference standards in the clinical investigation:

| Instrument | Purpose | Administration |
|---|---|---|
| Montreal Cognitive Assessment (MoCA) | Global cognitive screening (score 0–30; <26 = impairment) | Clinician-administered, ~10 min |
| Mini-Mental State Examination (MMSE) | Global cognitive screening (score 0–30; <24 = impairment) | Clinician-administered, ~10 min |
| Addenbrooke's Cognitive Examination III (ACE-III) | Detailed multi-domain cognitive assessment | Clinician-administered, ~20 min |
| Clinical Dementia Rating (CDR) | Global staging of dementia severity | Clinician interview with patient and informant |

CogAssess domain scores will be correlated with sub-scores of these instruments (specifically MoCA memory, language, and visuospatial sub-scores) to assess concurrent validity.

### 5.3 Unmet Clinical Need

Waiting times for neuropsychological assessment in most healthcare systems are measured in months. A tool that can rapidly characterise speech biomarkers at the point of first clinical contact — in a GP surgery, memory clinic, or outpatient neurology setting — could enable earlier stratification, more targeted use of specialist resource, and longitudinal monitoring without specialist attendance. CogAssess is designed to address this need.

---

## 6. Summary of Known and Potential Risks

The following hazards have been identified in CA-RMF-001. All residual risks have been assessed as Acceptable or ALARP following the application of risk control measures.

| Hazard | Risk Control Measures | Residual Risk |
|---|---|---|
| **H-001:** Incorrect biomarker score leads to erroneous clinical decision | Scores labelled as indicators only; clinical disclaimer on all outputs; clinician maintains diagnostic authority | ALARP |
| **H-002:** Patient data breach | Pseudonymisation; bcrypt password hashing; JWT auth; HTTPS; temp file deletion; no patient name stored | Acceptable |
| **H-003:** Silent recording produces false high scores | <5-word transcript guard terminates pipeline; 422 error returned; clinician prompted to re-record | Acceptable |
| **H-004:** System unavailable during assessment | Fallback to standard clinical assessment; no patient safety risk from software unavailability | Acceptable |
| **H-005:** Assessment linked to wrong patient | Clinician confirms patient reference at intake; assessment reference displayed throughout | Acceptable |
| **H-006:** Numerical scores displayed directly to patient | Patient summary page shows no numerical scores; bell curve uses plain-language zone labels only | Acceptable |
| **H-007:** Non-English speaker assessed with English-only pipeline | L1 language recorded at intake; non-English L1 flagged on clinical report | Acceptable |
| **H-008:** Findings tampered with after clinical sign-off | Immutable audit log; amendments require documented reason; full history available to clinician | Acceptable |
| **H-009:** Scoring algorithms not validated for target population | Clinical notice displayed on all reports; study protocol requires concurrent standard assessment | ALARP |
| **H-010:** Poor recording environment introduces confounding artefact | Environment quality recorded at intake; displayed on report as confounding variable; clinical guidance recommends quiet room | ALARP |

### 6.1 AI-Specific Risk Considerations

Two pipeline stages use locked pre-trained AI/ML models (sentence-transformers all-mpnet-base-v2 and j-hartmann emotion-english-distilroberta-base). The following AI-specific risks apply:

**Model bias and demographic distribution shift:** Both models were trained on general English-language text corpora. Their performance may differ across demographic groups (age, gender, socioeconomic background, regional accent, educational level). The clinical investigation should record demographic variables to enable subgroup analysis.

**Out-of-distribution inputs:** Patients with unusual speech patterns (severe dysarthria, strong regional accent, code-switching) may produce inputs outside the distribution of the models' training data. Investigators should document cases where CogAssess pipeline processing appears anomalous.

**Algorithm locking:** Both AI models are locked — weights are fixed at the evaluated version and are not updated or retrained during clinical use. Any future model update will require a new SOUP evaluation and software verification cycle before release.

---

## 7. Guidance for Investigators

### 7.1 Investigator Qualifications

The principal investigator should be a clinician qualified and experienced in cognitive assessment (neurologist, neuropsychologist, geriatrician, or senior speech and language therapist). The investigator must be familiar with MCI and early dementia diagnostic criteria (ICD-11, DSM-5).

### 7.2 Eligibility Criteria

**Inclusion criteria:**
- Age ≥ 50 years
- Presenting with subjective cognitive complaint, or referred for cognitive assessment by a clinician
- Sufficient English language proficiency to understand and respond to task instructions
- Able and willing to provide informed consent
- Able to produce at least 30 seconds of continuous speech per task

**Exclusion criteria:**
- Primary language other than English
- Severe hearing impairment (unable to follow verbal instructions without amplification aids)
- Pre-existing motor speech disorder of non-cognitive aetiology (dysarthria, apraxia, laryngeal pathology)
- Current episode of acute psychiatric illness
- Active substance misuse affecting speech
- Severe dementia (MMSE < 10) — likely unable to complete tasks
- Participant in a pharmacological trial that may affect cognition

### 7.3 Assessment Environment

- Quiet clinical room with minimal background noise
- Standard computer or tablet with working microphone and internet connection
- Participant seated comfortably, facing the screen
- Investigator present but not prompting or leading the patient during recording

### 7.4 Procedure

1. **Enrolment** — obtain informed consent, assign pseudonymous patient reference, record demographics and eligibility
2. **Standard assessment** — administer MoCA and ACE-III per standard protocol; record scores
3. **CogAssess session** — log in as clinician, create new assessment, select MCI/Early dementia preset, hand device to patient for recording tasks
4. **Task delivery** — patient completes each speech task; audio is processed automatically after each recording
5. **Report review** — investigator reviews CogAssess domain scores and clinical flags
6. **Findings** — investigator records clinical findings, outcome, and follow-up plan within CogAssess
7. **Data export** — record CogAssess domain scores and composite score against case record form
8. **Follow-up** — repeat CogAssess assessment at 3-month interval (if applicable)

### 7.5 Adverse Event Reporting

CogAssess is a non-invasive software tool. No device-related adverse events are anticipated. However, investigators should report to the Sponsor:

- Any case where CogAssess outputs are believed to have contributed to a clinically inappropriate decision
- Any data breach or suspected unauthorised access to patient data
- Any software malfunction that results in loss of assessment data
- Any case where a patient is distressed by the assessment process

Reports should be submitted to the Sponsor within 24 hours for serious events and within 7 days for non-serious events, using the Adverse Event Report Form (Appendix B).

### 7.6 Data Collection

Investigators should record the following on the Case Record Form (Appendix A) for each participant:

- Participant pseudonymous reference (must match CogAssess patient reference)
- Age band, gender, educational level, L1 language
- MoCA total score and sub-scores
- ACE-III total score and domain scores
- CDR global score (if applicable)
- CogAssess domain scores: motor speech, semantic memory, episodic memory, emotional processing
- CogAssess composite score
- Number of tasks completed
- Any recording quality issues noted
- Investigator clinical impression (agrees / partially agrees / disagrees with CogAssess zone)

### 7.7 Confidentiality

- Patient data must be stored under the pseudonymous reference only — no linking file should be stored in CogAssess
- The linking file (pseudonymous reference ↔ patient identity) must be stored separately, securely, and accessible only to the principal investigator
- Data transfer to the Sponsor must use encrypted channels only
- Patient data must not be transmitted outside the EEA without additional data transfer safeguards

---

## 8. References

Fraser, K.C., Meltzer, J.A., & Rudzicz, F. (2016). Linguistic features identify Alzheimer's disease in narrative speech. *Journal of Alzheimer's Disease*, 49(2), 407–422.

Balagopalan, A., Eyre, B., Robin, J., Rudzicz, F., & Novikova, J. (2021). Comparing acoustic-based approaches for Alzheimer's disease detection. *Proceedings of Interspeech 2021*.

Kessels, R.P., Gerritsen, L., Montagne, B., Ackl, N., Danek, A., & Dirksen, C. (2014). Recognition of facial expressions of different emotional intensities in patients with frontotemporal lobar degeneration. *Behavioural Neurology*, 2014.

König, A., Satt, A., Sorin, A., Hoory, R., Toledo-Ronen, O., Derreumaux, A., ... & Robert, P. (2015). Automatic speech analysis for the assessment of patients with predementia and Alzheimer's disease. *Alzheimer's & Dementia: Diagnosis, Assessment & Disease Monitoring*, 1(1), 112–124.

Luz, S., Haider, F., de la Fuente, S., Fromm, D., & MacWhinney, B. (2021). Detecting cognitive decline using speech only: The ADReSS2021 challenge. *Proceedings of Interspeech 2021*.

Petersen, R.C. (2016). Mild cognitive impairment. *Continuum: Lifelong Learning in Neurology*, 22(2), 404–418.

Petti, U., Baker, S., & Korhonen, A. (2020). A systematic literature review of automatic Alzheimer's disease detection from speech and language. *Journal of the American Medical Informatics Association*, 27(11), 1784–1797.

EU MDR 2017/745 — Regulation (EU) 2017/745 of the European Parliament and of the Council on medical devices.

ICH E6 (R2) — Integrated Addendum to ICH E6(R1): Guideline for Good Clinical Practice (2016).

IEC 62304:2006+AMD1:2015 — Medical device software — Software life cycle processes.

ISO 14971:2019 — Medical devices — Application of risk management to medical devices.

---

## 9. Appendices

*The following appendices are provided as separate documents:*

**Appendix A — Case Record Form (CRF)**
Data collection form for each participant; captures demographics, standard assessment scores, CogAssess scores, and investigator clinical impression.

**Appendix B — Adverse Event Report Form**
Standard form for reporting device-related adverse events or incidents to the Sponsor.

**Appendix C — Patient Information Leaflet and Informed Consent Form**
Plain-language description of the study for participants; consent form compliant with EU MDR Annex XV and GDPR Article 9.

**Appendix D — CogAssess Clinician Quick Reference Guide**
Step-by-step instructions for system login, patient registration, assessment creation, and task delivery; intended for clinical staff with limited prior exposure to CogAssess.

---

*Document prepared by St John Lynch & Co. Ltd on behalf of MemoryTell Ltd.*
*© 2026 MemoryTell Ltd. All rights reserved.*
*CA-IB-001 v1.0 — Confidential*
