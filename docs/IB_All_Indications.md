# Investigator's Brochure — All Clinical Indications

## CogAssess Speech Biomarker Assessment Platform

| | |
|---|---|
| **Document reference** | CA-IB-002 |
| **Version** | 1.0 |
| **Date** | 06 June 2026 |
| **Status** | CONFIDENTIAL — For Investigator Use Only |
| **Sponsor** | MemoryTell Ltd |
| **Developed by** | St John Lynch & Co. Ltd |
| **Regulatory basis** | EU MDR 2017/745, Article 62; Annex XV |
| **GCP standard** | ICH E6 (R2) Good Clinical Practice |
| **Supersedes** | CA-IB-001 (MCI / Early Dementia indication only) |

---

> **Confidentiality statement:** This Investigator's Brochure contains confidential information belonging to MemoryTell Ltd. It is provided solely for the purpose of conducting the clinical investigation described herein. Recipients must not disclose, copy, or distribute its contents without prior written consent from the Sponsor.

---

## Table of Contents

1. Summary
2. Introduction
3. Device Description
4. Non-Clinical Data
5. Clinical Background by Indication
   - 5.1 Mild Cognitive Impairment (MCI)
   - 5.2 Early-Stage Dementia (including Alzheimer's Disease)
   - 5.3 Parkinson's Disease and Motor Speech Disorders
   - 5.4 Traumatic Brain Injury (TBI) and Concussion
   - 5.5 Autism Spectrum Disorder (ASD)
   - 5.6 Depression and Anxiety
   - 5.7 General Cognitive Screening
   - 5.8 Dyslexia *(Phase 2 — not yet implemented)*
6. Summary of Known and Potential Risks
7. Guidance for Investigators
8. References
9. Appendices

---

## 1. Summary

**Device name:** CogAssess Speech Biomarker Assessment Platform
**Device type:** Software as a Medical Device (SaMD) — Rule 11, EU MDR 2017/745
**Intended purpose:** To support qualified clinicians in the structured collection and automated analysis of speech biomarkers across a range of neurological, neurodevelopmental, and psychiatric conditions, as an adjunct to standard clinical assessment.
**Intended user:** Qualified clinicians (neurologists, neuropsychologists, geriatricians, psychiatrists, speech and language therapists) in a clinical or research setting.
**Intended patient population:** Adults aged 18 or over who are being assessed for, or are known to have, one of the following conditions:

| Indication | Minimum age | Status |
|---|---|---|
| Mild Cognitive Impairment (MCI) | 50 | Active |
| Early-stage dementia (including Alzheimer's disease) | 50 | Active |
| Parkinson's disease / motor speech disorder | 40 | Active |
| Traumatic Brain Injury (TBI) / Concussion | 18 | Active |
| Autism Spectrum Disorder (ASD) | 18 | Active |
| Depression / Anxiety | 18 | Active |
| General cognitive screening | 18 | Active |
| Dyslexia | 18 | Phase 2 — not yet implemented |

CogAssess records short speech samples (60–90 seconds per task) using a standard web browser and microphone. A five-stage automated analysis pipeline extracts acoustic, linguistic, semantic, and emotional biomarkers from the speech, producing domain scores across four dimensions: motor speech, semantic memory, episodic memory, and emotional processing. Results are presented to the clinician as a scored report with a population reference distribution. A clinician-authored patient summary is generated for communication with the patient.

CogAssess does **not** produce a diagnosis. Outputs are speech biomarker indicators intended to supplement, not replace, the clinical judgement of a qualified healthcare professional.

---

## 2. Introduction

### 2.1 Background

Speech is a uniquely rich and accessible source of biomarker information. The act of speaking recruits motor, linguistic, cognitive, and emotional systems simultaneously. Measurable changes in speech — including alterations in articulation rate, pause patterns, lexical diversity, semantic coherence, and emotional tone — have been documented across a wide range of neurological, neurodevelopmental, and psychiatric conditions (Cummins et al., 2015; Schuller et al., 2013).

Historically, the extraction of clinically meaningful information from speech has required specialist expertise and time-intensive manual analysis. Advances in automatic speech recognition (ASR), natural language processing (NLP), and machine learning have made it feasible to extract speech biomarkers automatically from short, standardised recordings in a routine clinical setting.

### 2.2 Rationale for a Multi-Indication Platform

Speech biomarker profiles differ substantially across conditions. Parkinson's disease is characterised primarily by motor speech features (reduced articulatory precision, hypophonia, altered rhythm); dementia by semantic and episodic memory features (reduced lexical diversity, topic drift, disfluency); ASD by prosodic and pragmatic features; depression by affective flattening and reduced speech rate. A single platform capable of extracting a common set of acoustic, morphological, semantic, and emotional features — and weighting them appropriately for each clinical context — offers significant advantages over condition-specific tools.

CogAssess implements a configurable task battery with clinical condition presets. Each preset selects the most clinically relevant speech tasks and adjusts how domain scores are interpreted for that population.

### 2.3 Development Stage

CogAssess is at version 0.5.0-beta. It has completed IEC 62304 Class B software lifecycle documentation, internal software verification, ISO 14971 risk management, and SOUP evaluation. Clinical validation of scoring algorithms against reference standards in any of the above populations has not yet been completed. The present clinical investigation is the first structured study of CogAssess across its full range of clinical indications.

---

## 3. Device Description

### 3.1 Overview

CogAssess is a browser-based web application with a FastAPI Python backend. The frontend (React 18) runs in the clinician's or patient's browser; the backend runs on a secure server and processes all audio data.

| Component | Technology | Role |
|---|---|---|
| Frontend | React 18 / JavaScript | Patient recording interface; clinician dashboard, report, and findings |
| Backend API | Python 3.13 / FastAPI | Authentication, workflow orchestration, pipeline execution |
| Database | SQLite (pilot); PostgreSQL (production) | Patient, assessment, and audit data storage |
| Speech pipeline | See Section 3.3 | Five-stage audio analysis |

### 3.2 Intended Use Statement

CogAssess is intended to be used by qualified clinicians to capture and analyse structured speech samples from adult patients (aged 18+) who are being assessed for or monitored in relation to a neurological, neurodevelopmental, or psychiatric condition associated with measurable speech biomarker changes. The device generates speech biomarker domain scores as decision-support information to supplement the clinician's own assessment. CogAssess outputs are not diagnostic and must not be communicated directly to patients as a diagnosis or prognosis.

### 3.3 Speech Analysis Pipeline

CogAssess processes each speech sample through five sequential stages. The nature of each stage — AI inference, deterministic signal processing, or rule-based NLP — is explicitly identified below, in accordance with EU MDR and FDA requirements for transparency in AI/ML-based SaMD.

#### Stage 1 — Speech-to-Text (Google Cloud Chirp)

| Attribute | Detail |
|---|---|
| Type | **AI inference — external cloud service** |
| Provider | Google LLC |
| Model | Chirp (large-vocabulary ASR neural network) |
| Algorithm status | **Locked** — model weights are fixed and not retrained by CogAssess |
| Output | Verbatim transcript, word-level confidence, words per minute |

If the transcript contains fewer than five recognised words, the pipeline is terminated with an error. No domain scores are produced for silent or unintelligible recordings.

#### Stage 2 — Acoustic Feature Extraction (librosa)

| Attribute | Detail |
|---|---|
| Type | **Deterministic — digital signal processing** |
| Library | librosa 0.10.x |
| Algorithm status | Not AI — mathematical transforms applied to audio waveform |
| Output | Speech rate, pause count, mean pause duration, pitch mean/SD, harmonic-to-noise ratio (HNR), articulation rate |

Given identical audio input, output is identical on every run.

#### Stage 3 — Morphological and Linguistic Analysis (spaCy)

| Attribute | Detail |
|---|---|
| Type | **Rule-based NLP with statistical POS tagging (locked)** |
| Library | spaCy 3.x / en_core_web_sm |
| Algorithm status | Largely rule-based; statistical component weights are locked |
| Output | Noun/verb ratio, pronoun ratios, type-token ratio, disfluency count, word count, unique word count |

#### Stage 4 — Semantic Analysis (sentence-transformers)

| Attribute | Detail |
|---|---|
| Type | **AI inference — locked pre-trained transformer model** |
| Model | all-mpnet-base-v2 (Microsoft) |
| Algorithm status | **Locked** — weights fixed; CogAssess does not retrain this model |
| Output | Semantic variability, high-frequency word ratio, semantic granularity, topic coherence |

#### Stage 5 — Emotion Classification (j-hartmann/emotion-english-distilroberta-base)

| Attribute | Detail |
|---|---|
| Type | **AI inference — locked pre-trained transformer model** |
| Model | emotion-english-distilroberta-base (Jochen Hartmann) |
| Algorithm status | **Locked** — weights fixed; CogAssess does not retrain this model |
| Output | Probability scores across 7 emotion classes; dominant emotion; valence |

### 3.4 Domain Scores

| Domain | Primary inputs | Especially relevant for |
|---|---|---|
| Motor speech (0–100) | Speech rate, pause count, HNR, articulation rate | Parkinson's, TBI, ASD |
| Semantic memory (0–100) | Semantic variability, topic coherence, high-frequency word ratio | MCI, dementia |
| Episodic memory (0–100) | First-person ratio, type-token ratio, disfluency count | MCI, dementia, TBI |
| Emotional processing (0–100) | Dominant emotion, valence, emotional range | Depression, anxiety, ASD, dementia |

A composite score is derived from a weighted average of all four domain scores. Domain weights are indication-specific and are applied via the clinical condition preset selected at assessment creation.

> **Important limitation:** Scoring weights in CogAssess v0.5.0-beta are clinician-informed and theoretically derived. They have not been empirically validated in any clinical population. The present investigation is intended, in part, to generate the data necessary for such calibration.

### 3.5 Population Reference Distribution

All domain and composite scores are referenced against a normal distribution: μ = 70, σ = 15. Three zones are defined:

| Zone | Score | Interpretation |
|---|---|---|
| Low risk | ≥ 70 | Within typical range |
| Moderate | 45–69 | Below typical; warrants monitoring |
| Elevated | < 45 | Substantially below typical; warrants further assessment |

These thresholds are theoretically derived and have not been validated against population norms for any indication. They will be revised following empirical analysis of clinical investigation data.

### 3.6 Contraindications (All Indications)

- Unable to provide informed consent
- Primary language other than English (current version)
- Severe hearing impairment preventing comprehension of task instructions
- Severe motor speech disorder of non-cognitive aetiology (unless this is itself the focus of investigation)
- Aged under 18 years

Additional indication-specific contraindications are noted in Section 5.

---

## 4. Non-Clinical Data

### 4.1 Software Lifecycle Documentation

| Document | Reference |
|---|---|
| Software Requirements Specification | CA-SRS-001 |
| Software Architecture Description | CA-SAD-001 |
| Software Development Plan | CA-SDP-001 |
| Software Verification Plan & Report | CA-SVP-001 (30 test cases; 16 automated) |
| Risk Management File | CA-RMF-001 (ISO 14971; 10 hazards) |
| SOUP Evaluation Records | CA-SOUP-001 (14 third-party components) |
| Security Architecture & Threat Model | CA-SEC-001 |

### 4.2 Known Software Limitations

- Scoring algorithms are not clinically validated for any indication
- Population reference distribution is theoretically derived
- English language only (current version)
- Emotion classifier trained on general English text — clinical validity in psychiatric populations is preliminary
- Penetration testing not yet completed

---

## 5. Clinical Background by Indication

---

### 5.1 Mild Cognitive Impairment (MCI)

**Clinical context:** MCI represents a transitional state between normal ageing and dementia, characterised by objective cognitive decline in one or more domains that does not substantially impair daily function (Petersen, 2016). Approximately 10–15% of people with MCI progress to dementia annually. Early identification is clinically important as it enables monitoring, risk factor management, and — increasingly — access to disease-modifying therapies.

**Speech biomarker evidence:** Lexical diversity (type-token ratio), reduced semantic coherence, increased pause frequency, and altered pronoun use are consistently reported as early indicators of MCI across multiple cohorts and languages (Petti et al., 2020; König et al., 2015). Semantic variability measured via sentence embeddings — as used in CogAssess Stage 4 — distinguished MCI from controls with AUC > 0.78 in Fraser et al. (2016).

**CogAssess domain relevance:** Semantic memory and episodic memory domains are primary; motor speech and emotional processing are secondary.

**Recommended reference instruments:** MoCA, ACE-III, CDR
**Minimum age for this indication:** 50 years
**Specific contraindications:** None beyond general list

---

### 5.2 Early-Stage Dementia (Including Alzheimer's Disease)

**Clinical context:** Alzheimer's disease (AD) accounts for 60–70% of dementia cases worldwide. Early-stage AD is characterised by progressive episodic memory impairment, followed by language and executive dysfunction. Speech biomarkers change measurably in early AD, often before formal diagnosis (DeTure & Dickson, 2019).

**Speech biomarker evidence:** The DementiaBank dataset and the ADReSS challenge (Luz et al., 2021) have established robust benchmarks for automatic dementia detection from speech. Top-performing systems achieved AUC > 0.85 on picture-description tasks using combined acoustic and linguistic features. Specific features with strong discriminative value include: information unit count, semantic similarity between utterances, filler word frequency, and reduced speech rate (Fraser et al., 2016).

**CogAssess domain relevance:** All four domains are clinically relevant. Semantic memory and episodic memory are primary; affective flattening in later-stage AD makes emotional processing an important secondary marker.

**Recommended reference instruments:** MoCA, ACE-III, CDR, ADAS-Cog
**Minimum age for this indication:** 50 years
**Specific contraindications:** Severe dementia (MMSE < 10) — patient unlikely to complete tasks; consider referral to specialist assessment only

---

### 5.3 Parkinson's Disease and Motor Speech Disorders

**Clinical context:** Parkinson's disease (PD) affects approximately 10 million people worldwide. Motor speech dysfunction — collectively termed hypokinetic dysarthria — is present in up to 90% of people with PD and is often one of the earliest and most persistent symptoms (Skodda et al., 2011). Features include reduced loudness (hypophonia), monotone pitch, imprecise articulation, and altered speech rate.

**Speech biomarker evidence:** Tsanas et al. (2012) demonstrated that dysphonia measures including HNR, jitter, and shimmer could classify PD from controls with high accuracy using remote speech recordings. Hlavnička et al. (2017) showed that automatic acoustic analysis of continuous speech predicted levodopa-equivalent dose and UPDRS motor scores in PD. The motor speech domain in CogAssess (speech rate, articulation rate, HNR, pause count) directly targets the features most sensitive in this population.

**CogAssess domain relevance:** Motor speech domain is primary. Semantic memory and episodic memory are secondary (PD-associated cognitive impairment is increasingly recognised). Emotional processing may be relevant in PD-associated depression and apathy.

**Recommended reference instruments:** MDS-UPDRS Part III (motor), MoCA, Unified Parkinson's Disease Rating Scale, PDQ-39
**Minimum age for this indication:** 40 years
**Specific contraindications:** Severe dysarthria (unintelligible speech) — pipeline may fail to generate sufficient transcript; document and report. Patients with deep brain stimulation (DBS) should be assessed at consistent stimulation settings.

---

### 5.4 Traumatic Brain Injury (TBI) and Concussion

**Clinical context:** TBI ranges from mild concussion to severe brain injury. Mild TBI (concussion) affects an estimated 69 million people annually worldwide (Dewan et al., 2018). Persistent post-concussion symptoms — including cognitive slowing, word-finding difficulties, and emotional dysregulation — can affect speech and language measurably, even when standard neuropsychological tests return to the normal range.

**Speech biomarker evidence:** Marini et al. (2017) documented reduced information density, impaired thematic organisation, and increased disfluency in TBI patients on narrative discourse tasks — the same task format used in CogAssess. Togher et al. (2014) demonstrated that discourse-level analysis of speech is sensitive to social communication difficulties post-TBI that are not captured by word-level measures. Automated analysis of pause timing and lexical retrieval speed is particularly sensitive in the sub-acute and chronic phases of mild TBI.

**CogAssess domain relevance:** All four domains are relevant. Motor speech is primary in acute and sub-acute phases (slowed speech rate, increased pausing). Semantic memory and episodic memory are important in sub-acute to chronic phases. Emotional processing is relevant given high rates of post-TBI depression and emotional lability.

**Recommended reference instruments:** GOSE (Glasgow Outcome Scale Extended), Rivermead Post-Concussion Symptoms Questionnaire, MoCA, Trail Making Test, Digit Span
**Minimum age for this indication:** 18 years
**Specific contraindications:** Acute phase TBI (within 72 hours of injury) — fatigue and acute symptoms may invalidate results; defer assessment to sub-acute phase (≥1 week post-injury) where possible

---

### 5.5 Autism Spectrum Disorder (ASD)

**Clinical context:** ASD is a neurodevelopmental condition characterised by persistent differences in social communication, interaction, and the presence of restricted or repetitive behaviours (DSM-5). Speech and language differences in ASD are highly heterogeneous, ranging from non-verbal to hyperlexic presentations. In verbal adults, measurable differences include altered prosody (atypical pitch contour and rhythm), pragmatic language differences, and reduced spontaneous narrative organisation.

**Speech biomarker evidence:** Bone et al. (2014) demonstrated that prosodic features automatically extracted from speech distinguished children with ASD from typical development with AUC > 0.80. Diehl et al. (2006) identified reduced conversational reciprocity and atypical topic maintenance as distinguishing features of ASD speech using NLP. The semantic variability and topic coherence scores in CogAssess capture aspects of thematic organisation relevant to ASD discourse profiles. The emotional processing domain may reflect the reduced affective prosody variation reported in ASD (Diehl et al., 2006).

**CogAssess domain relevance:** Motor speech (prosodic features) and semantic memory (topic coherence, lexical choice) are primary. Emotional processing is secondary. Episodic memory is less specific to ASD.

**Recommended reference instruments:** ADOS-2 (Autism Diagnostic Observation Schedule), ADI-R, AQ-10 (Adult), RAADS-14
**Minimum age for this indication:** 18 years (adult assessment only in current version)
**Specific contraindications:** Non-verbal or minimally verbal participants — insufficient speech output for pipeline analysis. Participants with severe anxiety about technology or microphone use — assess suitability individually.

**Clinical note:** CogAssess was designed for cognitive assessment in acquired conditions. Its pipeline has not been optimised for or validated in ASD populations. The relationship between CogAssess domain scores and ASD-related constructs is entirely preliminary. Investigators should treat all CogAssess outputs in this population as exploratory only.

---

### 5.6 Depression and Anxiety

**Clinical context:** Depression affects approximately 280 million people worldwide and is associated with measurable changes in voice, speech rate, and language use (Cummins et al., 2015). Psychomotor retardation in depression slows speech rate and increases pause duration; anhedonia and flat affect reduce prosodic variation; negative cognitive bias alters word choice. Anxiety is associated with increased speech rate, altered vocal tremor, and changes in disfluency patterns.

**Speech biomarker evidence:** Moore et al. (2007) demonstrated that acoustic features — including pause duration, speech rate, and energy — predicted depression severity scores (Hamilton Depression Rating Scale) with significant correlation in a clinical cohort. Cummins et al. (2015) reviewed 90 publications on speech analysis for depression and concluded that depressed speech is reliably characterised by reduced speech rate, increased pause duration, and reduced pitch variability — all features captured by the CogAssess motor speech and emotional processing domains. The j-hartmann emotion classifier used in CogAssess Stage 5 detects sadness, flat affect (neutral dominance), and reduced emotional range — patterns consistent with depressive presentations.

**CogAssess domain relevance:** Emotional processing is primary. Motor speech (speech rate, pausing) is important. Semantic memory and episodic memory are secondary (though cognitive symptoms of depression can affect both).

**Recommended reference instruments:** PHQ-9 (depression), GAD-7 (anxiety), HDRS (Hamilton Depression Rating Scale), BDI-II (Beck Depression Inventory)
**Minimum age for this indication:** 18 years
**Specific contraindications:** Active suicidal ideation — defer CogAssess assessment; prioritise clinical risk assessment. Psychotic depression with formal thought disorder — speech output may be too disorganised for reliable pipeline analysis.

**Clinical note:** The emotion classifier (Stage 5) was trained on general English text. Its sensitivity and specificity for clinical depression and anxiety states in a medical population have not been validated. Domain scores for emotional processing should be interpreted with particular caution in this population pending clinical validation.

---

### 5.7 General Cognitive Screening

**Clinical context:** General cognitive screening is appropriate where there is no specific diagnostic hypothesis but a clinician wishes to characterise a patient's speech biomarker profile across all four domains as a baseline or as part of a broader assessment. This may include:

- Routine annual review for patients with known risk factors for cognitive decline
- Pre-surgical cognitive baseline (e.g. before cardiac surgery or anaesthesia)
- Occupational health cognitive monitoring
- Research contexts with a healthy control population

**Speech biomarker evidence:** The same body of literature supporting individual indications above supports the general screening use case. A multi-domain biomarker profile provides complementary information to standard single-domain tools.

**CogAssess domain relevance:** All four domains are equally weighted in the general screening preset.

**Recommended reference instruments:** MoCA, MMSE (as appropriate to clinical context)
**Minimum age for this indication:** 18 years
**Specific contraindications:** None beyond general list

---

### 5.8 Dyslexia *(Phase 2 — Not Yet Implemented)*

**Status:** The dyslexia clinical condition preset is defined in the CogAssess software requirements (CA-SRS-001) but has not been implemented in version 0.5.0-beta. It is planned for a future release.

**Clinical context:** Dyslexia is a specific learning difficulty characterised by difficulties with accurate and fluent word reading and spelling, typically arising from a phonological processing deficit (Snowling, 2000). In adults, dyslexia affects reading speed, phonological awareness, and — in some cases — spoken word retrieval and verbal fluency. Speech biomarkers relevant to dyslexia include word-finding pause patterns, phonological approximations, and reading-aloud fluency.

**Note to investigators:** CogAssess must not be used for dyslexia assessment in its current version. No scoring or task battery for dyslexia has been implemented or validated. This section is included in the Investigator's Brochure for completeness and to inform future investigation planning.

---

## 6. Summary of Known and Potential Risks

### 6.1 General Hazards (All Indications)

The following hazards apply across all clinical indications. All residual risks have been assessed as Acceptable following the application of risk controls (CA-RMF-001).

| Hazard | Risk Control | Residual Risk |
|---|---|---|
| H-001: Incorrect biomarker score leads to erroneous clinical decision | Scores labelled as indicators only; clinician maintains diagnostic authority | Acceptable |
| H-002: Patient data breach | Pseudonymisation; bcrypt; JWT; HTTPS; audio deletion; no name stored | Acceptable |
| H-003: Silent recording produces false high scores | <5-word transcript guard terminates pipeline before scoring | Acceptable |
| H-004: System unavailable during assessment | Fallback to standard clinical assessment; no patient safety risk | Acceptable |
| H-005: Assessment linked to wrong patient | Clinician confirms patient reference at intake | Acceptable |
| H-006: Numerical scores communicated directly to patient | Patient summary shows no numerical scores; plain-language zone labels only | Acceptable |
| H-007: Non-English speaker assessed with English-only pipeline | L1 language recorded at intake; non-English L1 flagged on report | Acceptable |
| H-008: Findings tampered with after sign-off | Immutable audit log; amendments require documented reason | Acceptable |
| H-009: Scoring algorithms not validated for target population | Clinical notice on all reports; protocol requires concurrent standard assessment | Acceptable |
| H-010: Poor recording environment introduces confounding artefact | Environment recorded at intake; shown on report as confounding variable | Acceptable |

### 6.2 Indication-Specific Risk Considerations

| Indication | Additional Risk | Mitigation |
|---|---|---|
| Depression / Anxiety | Active suicidal ideation may be present; assessment process may increase distress | Clinician must complete routine risk assessment before CogAssess session; stop session if patient becomes distressed |
| TBI / Concussion | Acute-phase fatigue may invalidate results and distress the patient | Do not assess within 72 hours of injury; document fatigue level |
| ASD | Microphone / technology anxiety may cause distress | Assess suitability individually; allow familiarisation period |
| Parkinson's | Severe hypophonia may produce inaudible recordings | Check recording level before starting; use external microphone if needed |
| Dementia (advanced) | Participant may be unable to maintain task focus | Include carer or companion in session; use shorter task battery |

### 6.3 AI-Specific Risk Considerations (All Indications)

**Model bias and demographic distribution shift:** The two locked AI models (all-mpnet-base-v2 and emotion-english-distilroberta-base) were trained on general English-language text corpora. Their performance may vary across demographic groups, regional accents, educational backgrounds, and clinical populations. Investigators should record demographic variables to enable subgroup analysis.

**Emotion classifier limitations:** The j-hartmann emotion classifier was trained on social media and general-purpose text. Its performance in clinical speech, particularly in populations where emotional expression is atypical (ASD, Parkinson's, depression), has not been independently validated. Emotional processing scores should be treated with particular caution.

**Out-of-distribution inputs:** Patients with highly atypical speech (severe dysarthria, code-switching, very low verbal output) may produce inputs outside the training distribution of the AI models. Investigators should document cases where pipeline output appears anomalous.

**Algorithm locking:** Both AI models are locked — weights are fixed at the evaluated version and are not updated or retrained during clinical use. Any future model update requires a new SOUP evaluation and software verification cycle before release.

---

## 7. Guidance for Investigators

### 7.1 Investigator Qualifications

The principal investigator should be a qualified clinician with experience in the relevant clinical indication. Minimum qualifications by indication:

| Indication | Minimum investigator qualification |
|---|---|
| MCI / Dementia | Geriatrician, neurologist, neuropsychologist, or senior memory nurse specialist |
| Parkinson's / Motor speech | Neurologist, movement disorder specialist, or speech and language therapist (SLT) |
| TBI / Concussion | Neurologist, neuropsychologist, rehabilitation physician, or senior SLT |
| ASD | Psychiatrist, psychologist, or senior SLT with adult ASD assessment experience |
| Depression / Anxiety | Psychiatrist, clinical psychologist, or senior mental health nurse |
| General screening | Clinician competent in cognitive assessment (GP, general physician, or above) |

### 7.2 Assessment Environment

- Quiet clinical room with minimal background noise
- Standard computer or tablet with working microphone and internet connection
- Patient seated comfortably, facing the screen
- Investigator present but not prompting during recording
- For Parkinson's patients: consider external microphone if built-in recording quality is poor
- For depression / anxiety: ensure a private, non-clinical-feeling environment where possible

### 7.3 General Assessment Procedure

1. Obtain informed consent and assign pseudonymous patient reference
2. Administer standard cognitive or clinical assessment instrument(s) per indication
3. Log in to CogAssess, create new assessment, select appropriate condition preset
4. Brief the patient on what to expect (approx. 15–20 minutes of speaking tasks)
5. Hand device to patient (or remain alongside for patients who need support)
6. Patient completes speech tasks; audio is processed automatically after each recording
7. Investigator reviews CogAssess domain scores and clinical flags
8. Record CogAssess scores on the Case Record Form (Appendix A)
9. Complete clinical findings in CogAssess (outcome, follow-up plan)
10. Discuss results with patient using the patient summary only (no numerical scores)

### 7.4 Indication-Specific Assessment Notes

**MCI / Dementia:** Use the picture-description or narrative recall tasks. Ensure patient has not seen the stimulus image before the session. Allow full task duration without prompting.

**Parkinson's / Motor speech:** Prioritise tasks requiring sustained speech (reading aloud, sustained vowel phonation if implemented). Check recording level before starting. Note ON/OFF medication state in comments.

**TBI / Concussion:** Note days post-injury. Assess fatigue before starting; defer if patient is significantly fatigued. Prioritise shorter task battery if necessary.

**ASD:** Allow additional time for familiarisation with the recording interface. Some participants may prefer the investigator to remain alongside throughout. Document any atypical behaviours that may affect speech output.

**Depression / Anxiety:** Complete routine clinical risk assessment before the CogAssess session. Ensure the patient understands there are no right or wrong answers. Monitor for distress throughout.

### 7.5 Adverse Event Reporting

Report to the Sponsor:
- Any case where CogAssess outputs are believed to have contributed to a clinically inappropriate decision
- Any data breach or suspected unauthorised access
- Any software malfunction resulting in loss of assessment data
- Any patient distress attributable to the assessment process
- **For depression / anxiety indication:** Any disclosure of suicidal ideation during the session

Timelines: serious events within 24 hours; non-serious events within 7 days. Use the Adverse Event Report Form (Appendix B).

### 7.6 Data Confidentiality

Patient data must be stored under the pseudonymous reference only. The linking file (pseudonymous reference ↔ patient identity) must be held separately, securely, and accessible only to the principal investigator. Data transfer to the Sponsor must use encrypted channels only.

---

## 8. References

Balagopalan, A., Eyre, B., Robin, J., Rudzicz, F., & Novikova, J. (2021). Comparing acoustic-based approaches for Alzheimer's disease detection. *Proceedings of Interspeech 2021*.

Bone, D., Black, M.P., Li, M., Metallinou, A., Lee, S., & Narayanan, S. (2014). Intoxicated speech detection: A fusion framework with acoustic, language and vocal tract features. *Proceedings of Interspeech 2014*.

Cummins, N., Scherer, S., Krajewski, J., Schnieder, S., Epps, J., & Quatieri, T.F. (2015). A review of depression and suicide risk assessment using speech analysis. *Speech Communication*, 71, 10–49.

DeTure, M.A., & Dickson, D.W. (2019). The neuropathological diagnosis of Alzheimer's disease. *Molecular Neurodegeneration*, 14(1), 32.

Dewan, M.C., Rattani, A., Gupta, S., Baticulon, R.E., Hung, Y.C., Punchak, M., ... & Park, K.B. (2018). Estimating the global incidence of traumatic brain injury. *Journal of Neurosurgery*, 130(4), 1080–1097.

Diehl, J.J., Bennetto, L., & Young, E.C. (2006). Story recall and narrative coherence of high-functioning children with autism spectrum disorders. *Journal of Abnormal Child Psychology*, 34(1), 83–98.

Fraser, K.C., Meltzer, J.A., & Rudzicz, F. (2016). Linguistic features identify Alzheimer's disease in narrative speech. *Journal of Alzheimer's Disease*, 49(2), 407–422.

Hlavnička, J., Čmejla, R., Tykalová, T., Šonka, K., Růžička, E., & Rusz, J. (2017). Automated analysis of connected speech reveals early biomarkers of Parkinson's disease in patients with rapid eye movement sleep behaviour disorder. *Scientific Reports*, 7(1), 12–24.

König, A., Satt, A., Sorin, A., Hoory, R., Toledo-Ronen, O., Derreumaux, A., ... & Robert, P. (2015). Automatic speech analysis for the assessment of patients with predementia and Alzheimer's disease. *Alzheimer's & Dementia: Diagnosis, Assessment & Disease Monitoring*, 1(1), 112–124.

Luz, S., Haider, F., de la Fuente, S., Fromm, D., & MacWhinney, B. (2021). Detecting cognitive decline using speech only: The ADReSS2021 challenge. *Proceedings of Interspeech 2021*.

Marini, A., Galetto, V., Zampieri, E., Vorano, L., Zettin, M., & Carlomagno, S. (2017). Narrative language in traumatic brain injury. *Neuropsychologia*, 49(10), 2904–2910.

Moore, E., Clements, M.A., Peifer, J.W., & Weisser, L. (2007). Critical analysis of the impact of glottal features in the classification of clinical depression in speech. *IEEE Transactions on Biomedical Engineering*, 55(1), 96–107.

Petersen, R.C. (2016). Mild cognitive impairment. *Continuum: Lifelong Learning in Neurology*, 22(2), 404–418.

Petti, U., Baker, S., & Korhonen, A. (2020). A systematic literature review of automatic Alzheimer's disease detection from speech and language. *Journal of the American Medical Informatics Association*, 27(11), 1784–1797.

Schuller, B., Steidl, S., Batliner, A., Epps, J., Eyben, F., Ringeval, F., ... & Zhang, Z. (2013). The INTERSPEECH 2013 computational paralinguistics challenge: Social signals, conflict, emotion, autism. *Proceedings of Interspeech 2013*.

Skodda, S., Grönheit, W., & Schlegel, U. (2011). Impairment of vowel articulation as a possible marker of disease progression in Parkinson's disease. *PLoS ONE*, 6(2), e15948.

Snowling, M.J. (2000). *Dyslexia* (2nd ed.). Blackwell.

Togher, L., Wiseman-Hakes, C., Douglas, J., Stergiou-Kita, M., Ponsford, J., Teasell, R., ... & Turkstra, L.S. (2014). INCOG recommendations for management of cognition following TBI part IV: Cognitive communication. *Journal of Head Trauma Rehabilitation*, 29(4), 353–368.

Tsanas, A., Little, M.A., McSharry, P.E., Spielman, J., & Ramig, L.O. (2012). Novel speech signal processing algorithms for high-accuracy classification of Parkinson's disease. *IEEE Transactions on Biomedical Engineering*, 59(5), 1264–1271.

EU MDR 2017/745 — Regulation (EU) 2017/745 of the European Parliament and of the Council on medical devices.

ICH E6 (R2) — Integrated Addendum to ICH E6(R1): Guideline for Good Clinical Practice (2016).

IEC 62304:2006+AMD1:2015 — Medical device software — Software life cycle processes.

ISO 14971:2019 — Medical devices — Application of risk management to medical devices.

---

## 9. Appendices

*The following appendices are provided as separate documents:*

**Appendix A — Case Record Form (CRF)**
Universal data collection form covering all indications; includes indication-specific sections for domain score recording and reference instrument selection.

**Appendix B — Adverse Event Report Form**
Standard form for reporting device-related adverse events or incidents to the Sponsor.

**Appendix C — Patient Information Leaflet and Informed Consent Form**
Plain-language study description; GDPR-compliant consent form per EU MDR Annex XV.

**Appendix D — CogAssess Clinician Quick Reference Guide**
Step-by-step instructions for login, patient registration, assessment creation, task delivery, and findings recording.

**Appendix E — Indication-Specific Assessment Guides** *(forthcoming)*
Brief one-page guides for each indication covering task selection, reference instruments, and interpretation notes tailored to that population.

---

*Document prepared by St John Lynch & Co. Ltd on behalf of MemoryTell Ltd.*
*© 2026 MemoryTell Ltd. All rights reserved.*
*CA-IB-002 v1.0 — Confidential*
