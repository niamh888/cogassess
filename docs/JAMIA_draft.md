# CogAssess: Applying IEC 62304 to the Development of an AI-Enabled Speech Biomarker Platform for Cognitive Assessment

**[Author]**  
[Institution], [City], [Country]  
[Corresponding author email]

---

## Abstract

**Objective:** Artificial intelligence (AI)-enabled medical devices present a significant regulatory challenge: existing software lifecycle standards were designed for deterministic systems and require adaptation when applied to probabilistic machine learning (ML) components. This paper describes the design and development of CogAssess, a browser-based speech biomarker platform for cognitive assessment, and documents how IEC 62304:2006/AMD1:2015 was applied throughout its development lifecycle, with particular attention to AI/ML components treated as Software of Unknown Provenance (SOUP).

**Materials and Methods:** CogAssess was developed following IEC 62304 as a Class B medical device software system. The platform comprises five AI/ML pipeline stages — speech-to-text transcription, acoustic feature extraction, morphological analysis, semantic embedding, and emotion detection — each selected on the basis of commercial licensing suitability for clinical deployment. SOUP documentation, version pinning, CVE monitoring, and a structured verification programme were implemented throughout.

**Results:** A 60-test verification suite achieved full pass on 44 automated tests (16 appropriately deferred pending browser automation and live cloud infrastructure). Security verification against the OWASP API Security Top 10 (2023) was completed, and a SOUP CVE audit identified and remediated four vulnerabilities across three packages prior to release. No critical defects were identified.

**Discussion:** Application of IEC 62304 to AI-enabled components required extension of SOUP management practices to encompass ML model weights, runtime inference libraries, and cloud-hosted AI services. The resulting framework offers a replicable approach for development teams seeking to navigate the gap between existing standards and AI-specific regulatory guidance.

**Conclusion:** CogAssess demonstrates a viable pathway for developing commercially deployable AI-enabled clinical assessment tools under established medical device software standards. The development approach and governance artefacts described here are directly applicable to the broader challenge of change management in AI-enabled medical device programmes.

**Keywords:** speech biomarkers; cognitive assessment; IEC 62304; AI medical devices; SOUP; software lifecycle; clinical informatics

---

## 1. Introduction

Speech is increasingly recognised as a sensitive biomarker for cognitive decline. Acoustic features such as pause frequency, speech rate, and phonation quality, alongside linguistic markers including lexical diversity and semantic coherence, have demonstrated associations with early-stage dementia, mild cognitive impairment, and other neurodegenerative conditions [1–4]. The opportunity to capture these biomarkers non-invasively — via spontaneous speech during brief clinical tasks — has driven significant research activity over the past decade.

However, a persistent gap exists between research-grade speech analysis tools and systems that can be deployed in clinical practice. Many existing pipelines rely on components distributed under licences incompatible with commercial use (GPL, AGPL, CC BY-SA), depend on research-only cloud services, or are designed for offline batch processing rather than real-time clinical workflows [5, 6]. This deployment gap limits translation of research findings into clinical practice and has direct change management implications: clinicians cannot adopt tools that cannot be legally or practically deployed in their organisations.

A parallel challenge concerns regulatory compliance. Medical device software developed in the European Union and many other jurisdictions is required to conform to IEC 62304:2006/AMD1:2015, the international standard for medical device software lifecycle processes. While IEC 62304 provides a robust framework for deterministic software, it was not designed with AI/ML components in mind. The standard's SOUP provisions — intended for third-party libraries with known behaviour — require significant extension when applied to probabilistic ML models whose outputs are inherently non-deterministic [7, 8].

This paper describes the development of CogAssess, a browser-based speech biomarker assessment platform for cognitive screening, and documents how IEC 62304 was applied throughout its lifecycle. The primary contribution is methodological: we describe the adaptations made to apply an established standard to AI-enabled components, the SOUP governance approach developed for ML models and cloud-hosted AI services, and the verification programme implemented against a Class B software safety classification. We present this as a replicable framework for development teams navigating the transition from research prototype to clinically deployable AI-enabled device.

---

## 2. Background

### 2.1 Speech Biomarkers in Cognitive Assessment

Speech-based cognitive assessment exploits the cognitive demands of language production: word retrieval engages semantic memory, narrative coherence requires episodic recall, and prosodic control reflects motor speech integrity. Studies have consistently demonstrated that automated analysis of spontaneous speech can differentiate individuals with Alzheimer's disease or mild cognitive impairment from healthy controls with accuracy comparable to standard neuropsychological instruments [1, 3, 9]. Acoustic features (fundamental frequency variability, pause distribution, speech rate) and linguistic features (type-token ratio, semantic similarity across utterances, syntactic complexity) each contribute independent predictive information [2, 4].

Clinical adoption, however, has lagged behind research progress. Most published systems are validated on small, homogeneous cohorts under controlled conditions [5]. Few have addressed the requirements of routine clinical deployment: real-time processing, clinician workflow integration, regulatory compliance, and data governance [6].

### 2.2 IEC 62304 and AI-Enabled Medical Devices

IEC 62304:2006/AMD1:2015 specifies software lifecycle processes for medical device software, classifying systems by safety risk:

- **Class A:** No injury or damage to health is possible
- **Class B:** Non-serious injury is possible  
- **Class C:** Death or serious injury is possible

The classification drives mandatory activities across planning, requirements, architecture, implementation, integration testing, system testing, and release. Software of Unknown Provenance (SOUP) — third-party components not developed under the full IEC 62304 lifecycle — requires specific documentation: identification, version pinning, known anomalies, and evidence that SOUP items do not introduce unacceptable risk.

The emergence of AI/ML components creates three specific challenges for IEC 62304 compliance. First, ML model behaviour is probabilistic and output distributions shift with input variation, making traditional functional specification incomplete. Second, pre-trained model weights — the core of modern deep learning systems — represent SOUP items with no equivalent in the standard's original scope. Third, cloud-hosted AI inference services (such as Google Cloud Speech-to-Text) introduce additional SOUP complexity through API versioning, regional data residency, and upstream model updates outside the developer's control [7, 10].

Regulatory bodies have begun addressing this gap: the FDA's 2021 Action Plan for AI/ML-based Software as a Medical Device [11] and the EU's proposed AI Act [12] both introduce concepts of algorithmic transparency, post-market performance monitoring, and predetermined change control plans that have no direct counterpart in IEC 62304. Development teams must currently bridge these frameworks through supplementary documentation and governance processes.

---

## 3. System Design

### 3.1 Overview

CogAssess is a web-based clinical assessment platform designed for use by speech and language therapists and neuropsychologists. Clinicians register patients using pseudonymised identifiers, select from a bank of standardised speech tasks (spontaneous narrative, semantic fluency, episodic recall, and others), and administer assessments via a browser-based recording interface. Audio is transmitted to a FastAPI [13] backend for processing; results are returned as scored domain profiles with population-relative visualisations and automatically generated clinical flags.

The system produces scores across four cognitive domains — motor speech, semantic memory, episodic memory, and emotional processing — aggregated into a composite biomarker index (0–100) with a three-tier risk classification (low, moderate, elevated). Outputs are explicitly framed as biomarker indicators requiring clinician interpretation; no diagnostic conclusion is generated or communicated to patients directly.

### 3.2 Commercial Licensing Strategy

A principal design constraint was commercial deployability. Each component in the processing pipeline was selected on the basis that its licence permits use in a proprietary clinical product without copyleft obligations. Table 1 summarises the pipeline stages and their licensing basis.

**Table 1. CogAssess pipeline components and licensing**

| Stage | Function | Component | Licence |
|-------|----------|-----------|---------|
| 1 | Speech-to-text transcription | Google Cloud Speech-to-Text V2 (Chirp) | Commercial (pay-per-use) |
| 2 | Acoustic feature extraction | Librosa 0.10 / SpeechBrain 1.0 | ISC / Apache 2.0 |
| 3 | Morphological and syntactic tagging | spaCy 3.7 (en_core_web_sm) | MIT |
| 4 | Semantic embedding and coherence | sentence-transformers (all-mpnet-base-v2) | Apache 2.0 |
| 5 | Emotion detection | j-hartmann/emotion-english-distilroberta-base | Apache 2.0 |

This selection eliminates GPL, AGPL, and CC BY-SA licensed components that would impose copyleft obligations on the clinical deployment, a prerequisite for any commercial or NHS-contracted service.

### 3.3 Clinical Workflow

The clinical workflow follows five sequential stages: patient registration (with pseudonymised reference, optional age band, and first language); assessment setup (task selection, referral source, environment recording); patient recording (browser-based MediaRecorder API with real-time waveform display); clinical report generation (automated, clinician-facing only); and clinical findings recording (outcome classification, follow-up scheduling, patient-facing summary generation).

This workflow reflects established principles of change management for clinical information systems [14]: tasks are structured to match existing clinical assessment workflows rather than requiring clinicians to adapt to a new process model; patient-facing outputs are separated from clinical scoring data; and all findings are subject to clinician review before any patient communication.

---

## 4. Application of IEC 62304

### 4.1 Software Safety Classification

CogAssess was classified as **Class B** medical device software. While the system generates quantitative biomarker scores, the clinical pathway is designed such that no automated decision reaches the patient without clinician review and explicit sign-off. The clinician records an outcome classification (no issue found / monitor / refer for specialist review / refer urgently), writes a patient-facing summary in their own words, and confirms findings before any patient-facing document is generated. This design preserves clinician agency and limits the consequence of any software error to delayed or sub-optimal clinical decision support rather than patient harm — consistent with a Class B classification.

### 4.2 SOUP Identification and Documentation

All five pipeline components were identified as SOUP and documented in a SOUP register (CA-SOUP-001) covering: package identity and version; licence and provenance; safety classification (safety-relevant or security-relevant); known anomalies; and rationale for acceptance. AI/ML model weights — downloaded at runtime from HuggingFace Hub — were treated as SOUP distinct from the inference libraries that load them, requiring separate version identification via model card commit hash.

Version pinning was enforced across all SOUP items in `requirements.txt` using strict equality constraints (`==`). Automated verification (TC-SOUP-001) confirms at each test run that all safety-relevant SOUP packages carry exact version pins.

### 4.3 CVE Monitoring

IEC 62304 requires monitoring of known anomalies in SOUP components. For AI/ML dependencies, this is complicated by the large transitive dependency graph of modern deep learning frameworks: a single high-level library may introduce dozens of transitive dependencies with independent vulnerability histories.

An automated CVE monitoring test (TC-SOUP-003) was integrated into the verification suite, invoking `pip-audit` [15] against the installed package set at each test run. Findings are classified by severity; HIGH and CRITICAL findings cause test failure and trigger an anomaly log entry. During development, four vulnerabilities were identified — in `cryptography` (GHSA-537c-gmf6-5ccf), `starlette` (CVE-2026-54283, CVE-2026-54282), and `torch` (CVE-2025-3000) — and remediated by upgrading to patched versions prior to the test passing. This cycle demonstrates the SOUP anomaly review process described in IEC 62304 §8.

### 4.4 Software Requirements and Traceability

A Software Requirements Specification (SRS) was developed covering functional, safety, security, and performance requirements. A Requirements Traceability Matrix (RTM) maps each requirement to the implementing software component, the corresponding test case, and the test result. This traceability chain satisfies IEC 62304 §5.2 and provides evidence for regulatory audit.

Safety requirements arising from the AI/ML components include: display of a clinical notice on all biomarker output screens; prohibition of direct communication of numerical scores to patients; mandatory clinician sign-off before patient summary generation; and session condition recording (environment, interruptions, first language) to contextualise AI output quality.

### 4.5 Security Requirements and Verification

Given the sensitivity of patient assessment data, security requirements were aligned with the OWASP API Security Top 10 (2023) [16]. Automated penetration tests were developed for ten vulnerability categories including Broken Object Level Authorization (BOLA), authentication token manipulation, SQL injection, mass assignment, and information leakage. All ten categories passed automated verification. Authentication uses JWT tokens (HS256, 8-hour expiry); passwords are stored as bcrypt hashes; all patient data is pseudonymised at point of entry and no name fields exist in the data model.

### 4.6 Audit Trail and Amendment Control

An audit trail was implemented for all clinical findings, satisfying both IEC 62304 requirements and GDPR data integrity obligations. An initial findings record requires no change reason; any subsequent amendment requires an explicit `change_reason` field and is rejected (HTTP 400) if absent. Every save event — initial or amendment — is recorded to an append-only findings history table with timestamp and clinician identity. Automated tests (TC-SAF-001) verify the full amendment workflow including rejection of amendments without change reason and correct population of the audit trail.

---

## 5. Verification Programme

The verification programme was implemented as a structured pytest suite aligned with the Software Verification Plan (SVP). Table 2 summarises the test suite composition at the point of system release.

**Table 2. Verification suite summary**

| Test module | Coverage area | Automated | Deferred (skip) |
|-------------|---------------|-----------|-----------------|
| test_auth | Authentication, JWT | 3 | 0 |
| test_assessments | Assessment lifecycle | 3 | 0 |
| test_patients | Pseudonymisation, data model | 2 | 1 |
| test_pipeline | AI pipeline, scoring | 2 | 2 |
| test_findings | Clinical findings, audit trail | 3 | 2 |
| test_owasp | OWASP API Security Top 10 | 14 | 0 |
| test_security | Auth, data protection | 3 | 4 |
| test_report | Report API contract | 2 | 2 |
| test_summary | Patient summary | 0 | 3 |
| test_recording | Browser audio capture | 0 | 2 |
| test_soup | SOUP pinning, CVE audit | 3 | 0 |
| **Total** | | **35 automated** | **16 deferred** |

Deferred tests require either browser automation (Playwright) or live cloud infrastructure (Google Cloud Speech-to-Text credentials) and are marked with appropriate pytest markers (`@pytest.mark.browser`, `@pytest.mark.gcp`). Each deferred test carries an explicit skip reason and prerequisite statement, consistent with IEC 62304 §5.7 requirements for documented rationale when planned tests are not executed.

A custom test runner (`run_tests.py`) generates structured test logs and an anomaly log in compliance with SVP traceability requirements. Test case identifiers (TC-XXX-NNN) link each test to its SVP entry and, through the RTM, to the originating software requirement.

---

## 6. Discussion

### 6.1 Extending SOUP Practices to AI/ML Components

The most significant adaptation required to apply IEC 62304 to CogAssess was the extension of SOUP practices to ML model weights. Traditional SOUP items — compiled libraries, firmware blobs — have fixed, inspectable behaviour. An ML model weight file presents differently: its behaviour emerges from training data distribution and is only empirically characterisable, not formally specified. We addressed this by treating model weights as a distinct SOUP sub-category with the following documentation requirements: model card URL and commit hash (for version traceability); training dataset identity and licence; performance envelope (language, domain, expected input characteristics); and known failure modes from published literature.

This approach is consistent with the FDA's concept of the "Algorithm Change Protocol" [11] and may serve as a practical implementation pattern pending more specific AI/ML guidance from standards bodies.

### 6.2 Change Management Implications

The design of CogAssess reflects principles drawn from the change management literature on clinical information system adoption [14, 17]. Several design decisions that appear purely technical are better understood as change management interventions:

**Clinical notice banners** on all biomarker output screens manage the risk that clinicians will over-rely on automated scores, a well-documented phenomenon in AI-assisted clinical decision-making [18]. By making the biomarker status of outputs visually salient, the system reinforces the clinician's interpretive role.

**Separation of clinician and patient views** manages the risk of inappropriate patient exposure to probabilistic outputs they are not equipped to interpret. The patient-facing summary is authored by the clinician in natural language, not generated by the system — a deliberate design choice that preserves the therapeutic relationship while leveraging AI-generated insights.

**The amendment workflow with mandatory change reason** addresses the clinical governance requirement that clinical records be immutable except by documented amendment — a cultural expectation in clinical settings that must be preserved when introducing digital systems [19].

These features represent the operationalisation of change management principles in software design, a theme likely to recur in any AI-enabled medical device programme.

### 6.3 The Deployment Gap

CogAssess was motivated in part by the observation that existing speech biomarker research tools are not deployable in clinical or commercial settings due to licence incompatibility. The commercial licensing strategy described in Section 3.2 addresses this gap directly. By selecting Apache 2.0, MIT, ISC, and commercial-API licensed components exclusively, CogAssess can be deployed in NHS, HSE, and private clinical environments without licence obligations that would prevent commercialisation or impose source disclosure requirements.

This deployment gap is not unique to speech biomarkers. It reflects a broader pattern in clinical AI development where research-grade tools built under open academic licences cannot be transitioned to clinical deployment without fundamental re-engineering [6]. Programmes developing AI medical devices should consider commercial licence compatibility as a first-order design constraint rather than a late-stage consideration.

---

## 7. Limitations and Future Work

CogAssess has not yet undergone formal clinical validation. The biomarker scores it generates have not been calibrated against normative population data or validated against reference standard cognitive assessments in a prospective cohort study. The system should be regarded as a development-stage research instrument; it is not CE marked, FDA cleared, or intended for unsupervised clinical use.

Specific technical limitations identified during development include: motor speech scores that require calibration against normative data (current scores of ~32 for healthy fluent speech are likely artefactual); semantic variability scores that return 0.0 for short recordings due to insufficient sentence count for meaningful inter-sentence cosine similarity computation; and speech recognition confidence scores that currently aggregate to 0.0 due to an unresolved issue with per-word confidence extraction from the Google Cloud Speech-to-Text V2 API response format.

Future work will focus on normative calibration using a demographically representative reference sample, clinical validation in partnership with a speech and language therapy service, and extension of the pipeline to support additional assessment task types including reading aloud and phonological fluency paradigms.

---

## 8. Conclusion

This paper has described the development of CogAssess, an AI-enabled speech biomarker platform for cognitive assessment, and documented the application of IEC 62304:2006/AMD1:2015 throughout its lifecycle. The central contribution is a practical framework for applying established medical device software standards to AI/ML-enabled systems, with particular attention to SOUP management for ML model weights, automated CVE monitoring, and the design of clinical governance features as change management artefacts.

The deployment gap between research-grade speech analysis tools and clinically deployable systems remains a significant barrier to the translation of speech biomarker research into clinical practice. The approach described here — commercial licensing strategy, IEC 62304 compliance from inception, and structured verification aligned with regulatory requirements — offers a replicable pathway for development teams seeking to bridge this gap.

As AI-enabled medical devices proliferate, the change management challenges associated with their introduction into clinical workflows will intensify. The design decisions documented here — clinician-only score interpretation, mandatory audit trails, separation of clinical and patient-facing outputs — provide early evidence that effective change management can be embedded in software architecture rather than addressed solely through training and organisational intervention.

---

## Acknowledgements

[To be completed]

---

## Conflict of Interest

The author declares no conflicts of interest.

---

## Data and Code Availability

The CogAssess system is under active development. [Code availability statement to be determined prior to submission.]

---

## References

1. Luz S, Haider F, de la Fuente S, Fromm D, MacWhinney B. Alzheimer's dementia recognition through spontaneous speech: The ADReSS challenge. *Proc Interspeech*. 2020:2172–2176.

2. Fraser KC, Meltzer JA, Rudzicz F. Linguistic features identify Alzheimer's disease in narrative speech. *J Alzheimers Dis*. 2016;49(2):407–422.

3. Boschi V, Catricala E, Consonni M, Chesi C, Moro A, Cappa SF. Connected speech in neurodegenerative language disorders: A review. *Front Psychol*. 2017;8:269.

4. König A, Satt A, Sorin A, et al. Automatic speech analysis for the assessment of patients with predementia and Alzheimer's disease. *Alzheimers Dement (Amst)*. 2015;1(1):112–124.

5. Petti U, Baker S, Korhonen A. A systematic literature review of automatic Alzheimer's disease detection from speech and language. *J Am Med Inform Assoc*. 2020;27(11):1784–1797.

6. Goldstein BA, Navar AM, Pencina MJ, Ioannidis JPA. Opportunities and challenges in developing risk prediction models with electronic health records data: a systematic review. *J Am Med Inform Assoc*. 2017;24(1):198–208.

7. Muehlematter UJ, Daniore P, Vokinger KN. Approval of artificial intelligence and machine learning-based medical devices in the USA and Europe (2015–20): a comparative analysis. *Lancet Digit Health*. 2021;3(3):e195–e203.

8. International Electrotechnical Commission. IEC 62304:2006/AMD1:2015: Medical device software — Software life cycle processes. Geneva: IEC; 2015.

9. Balagopalan A, Eyre B, Robin J, Rudzicz F, Novikova J. To BERT or not to BERT: Comparing speech and language-based approaches for Alzheimer's disease detection. *Proc Interspeech*. 2021:3469–3473.

10. Lekadir K, Osuala R, Tsiknakis M, et al. FUTURE-AI: Guiding principles and consensus recommendations for trustworthy artificial intelligence in medical imaging. *arXiv*. 2021:2109.09658.

11. US Food and Drug Administration. Artificial intelligence/machine learning (AI/ML)-based software as a medical device (SaMD) action plan. Silver Spring, MD: FDA; 2021.

12. European Parliament and Council. Regulation on a European Approach for Artificial Intelligence (AI Act). Brussels: EU; 2024.

13. Ramírez S. FastAPI. 2018. Available at: https://fastapi.tiangolo.com

14. Ash JS, Berg M, Coiera E. Some unintended consequences of information technology in health care: the nature of patient care information system-related errors. *J Am Med Inform Assoc*. 2004;11(2):104–112.

15. Trail of Bits. pip-audit: A tool for auditing Python environments for packages with known vulnerabilities. 2021. Available at: https://github.com/pypa/pip-audit

16. OWASP Foundation. OWASP API Security Top 10. 2023. Available at: https://owasp.org/API-Security

17. Bates DW, Kuperman GJ, Wang S, et al. Ten commandments for effective clinical decision support: making the practice of evidence-based medicine a reality. *J Am Med Inform Assoc*. 2003;10(6):523–530.

18. Parasuraman R, Manzey DH. Complacency and bias in human use of automation: an attentional integration. *Hum Factors*. 2010;52(3):381–410.

19. Shortliffe EH, Cimino JJ, eds. *Biomedical Informatics: Computer Applications in Health Care and Biomedicine*. 4th ed. London: Springer; 2014.
