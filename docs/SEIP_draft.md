# Engineering AI-Enabled Medical Device Software Under IEC 62304: An Experience Report

**[Author]**  
[Institution], [City], Ireland  
[email]

---

## Abstract

**Context:** IEC 62304:2006/AMD1:2015 is the established international standard for medical device software lifecycle processes. It was designed for deterministic systems and its Software of Unknown Provenance (SOUP) provisions assume third-party components with inspectable, stable behaviour. Artificial intelligence and machine learning (AI/ML) components — probabilistic by nature, weight-file dependent, and frequently cloud-hosted — challenge these assumptions directly.

**Objective:** This paper reports the experience of applying IEC 62304 throughout the development of CogAssess, a browser-based AI-enabled speech biomarker platform for clinical cognitive assessment, and documents the adaptations made to accommodate AI/ML components within the standard's framework.

**Method:** We followed IEC 62304 activities from safety classification through SOUP identification, requirements specification, security verification, and release. We extended standard SOUP practices to cover ML model weights, automated CVE monitoring across the transitive dependency graph, and implemented a structured verification programme of 60 test cases aligned with a Software Verification Plan.

**Results:** The system was successfully developed and verified under a Class B safety classification. The verification suite achieved 44 automated passes with 16 tests appropriately deferred pending live infrastructure. Four CVEs identified by automated SOUP audit were remediated prior to release. The change management implications of key design decisions are documented as lessons for practitioners.

**Conclusions:** IEC 62304 can be applied to AI-enabled medical device software, but requires deliberate extension in three areas: SOUP identification for ML model weights; automated CVE monitoring for large transitive dependency graphs; and supplementary documentation bridging the gap between IEC 62304 and emerging AI-specific regulatory guidance. We present seven lessons learned that generalise beyond this system.

**Keywords:** IEC 62304; AI medical devices; SOUP; machine learning; software lifecycle; verification; change management

---

## 1. Introduction

The proliferation of artificial intelligence components in medical device software creates a regulatory challenge that the software engineering community has not yet fully resolved. IEC 62304:2006/AMD1:2015, the dominant international standard for medical device software lifecycle processes, provides a mature framework for deterministic systems — but its foundations were established before the widespread adoption of machine learning as a development practice [1].

The gap matters in practice. Development teams building AI-enabled medical devices face three concrete problems. First, IEC 62304's SOUP provisions were designed for compiled third-party libraries with known, documentable behaviour; ML model weights — the trained parameters of a neural network — have no direct equivalent in the standard's conceptual framework. Second, modern AI/ML frameworks introduce large transitive dependency graphs that existing SOUP anomaly monitoring processes were not designed to traverse. Third, emerging AI-specific regulatory guidance (the FDA's AI/ML Action Plan [2], the EU AI Act [3]) introduces concepts — algorithmic transparency, predetermined change control plans, post-market performance monitoring — that have no counterpart in IEC 62304, leaving development teams to bridge these frameworks without standards-level guidance.

This paper contributes an experience report drawn from the development of CogAssess, a browser-based speech biomarker platform for cognitive assessment. We describe how IEC 62304 was applied throughout the development lifecycle, what adaptations were required to accommodate AI/ML components, and what the change management implications of our design decisions proved to be. Our aim is to provide practitioners with a concrete, replicable account of navigating this regulatory and engineering gap.

The remainder of the paper is structured as follows. Section 2 provides background on IEC 62304 and the AI/ML regulatory gap. Section 3 describes the CogAssess system context. Section 4 documents our development experience by IEC 62304 activity. Section 5 describes the verification programme. Section 6 presents lessons learned. Section 7 discusses threats to validity. Section 8 covers related work. Section 9 concludes.

---

## 2. Background

### 2.1 IEC 62304 Overview

IEC 62304:2006/AMD1:2015 specifies software lifecycle processes for medical device software, organising development activities across planning, requirements, architecture, implementation, integration testing, system testing, and release. Systems are classified by safety risk:

- **Class A:** No injury or damage to health is possible
- **Class B:** Non-serious injury is possible
- **Class C:** Death or serious injury is possible

The classification drives the set of mandatory activities, with Class C requiring the most rigorous process. SOUP — Software of Unknown Provenance, defined as software items used without having full confidence in their development process — must be identified, version-controlled, and assessed for known anomalies.

AMD1:2015 introduced explicit provisions for SOUP that were absent from the 2006 edition, reflecting the growing dependence of medical device software on third-party libraries. However, the amendment was published before deep learning entered mainstream medical device development and does not address ML-specific concerns.

### 2.2 The AI/ML Gap in IEC 62304

Three structural limitations of IEC 62304 become apparent when AI/ML components are present:

**SOUP identity for ML models.** IEC 62304 §8.1.2 requires SOUP items to be identified by name, version, and manufacturer. A pre-trained ML model — distributed as a weight file on a public model hub — has no manufacturer in the conventional sense, no deterministic version string beyond a commit hash, and behaviour that is empirically characterisable rather than formally specified.

**Anomaly monitoring for transitive dependencies.** IEC 62304 §8.2.4 requires monitoring of known anomalies in SOUP. A typical deep learning stack introduces dozens of transitive dependencies (inference runtime, BLAS libraries, CUDA bindings, serialisation formats) each with independent vulnerability histories. Manual anomaly monitoring at this scale is impractical; automated tooling is required but is not mentioned in the standard.

**Bridging to AI-specific guidance.** The FDA's 2021 AI/ML Action Plan [2] introduces concepts — total product lifecycle management, algorithmic transparency, predetermined change control — that have no IEC 62304 equivalent. The EU AI Act [3] adds conformity assessment obligations for high-risk AI systems that may overlap with but are not aligned to IEC 62304 activities. Practitioners must bridge these frameworks without normative guidance.

### 2.3 Speech Biomarkers and Clinical Deployment

Speech is sensitive to cognitive decline: acoustic features (pause distribution, speech rate, phonation quality) and linguistic features (lexical diversity, semantic coherence, syntactic complexity) have demonstrated associations with early-stage dementia and mild cognitive impairment [4, 5]. Automated speech analysis pipelines can extract these features from short recordings captured in routine clinical encounters, offering a low-burden complement to formal neuropsychological assessment [6].

Despite research progress, translation to clinical deployment has been slow. Most published pipelines rely on components distributed under licences incompatible with commercial deployment (GPL, AGPL, CC BY-SA) or require research-only cloud infrastructure [7]. This deployment gap motivated the development of CogAssess as a commercially-licensable, IEC 62304-compliant alternative.

---

## 3. System Context

### 3.1 CogAssess Platform

CogAssess is a browser-based clinical assessment platform designed for use by clinicians conducting cognitive screening. Clinicians register patients using pseudonymised identifiers, select from a bank of standardised speech tasks (spontaneous narrative, semantic fluency, episodic recall), and administer assessments via a browser-based recording interface. Audio is transmitted to a FastAPI [8] backend for processing through a five-stage AI/ML pipeline; results are returned as scored domain profiles with population-relative visualisations and automatically generated clinical flags.

The system produces scores across four cognitive domains — motor speech, semantic memory, episodic memory, and emotional processing — aggregated into a composite biomarker index (0–100). All outputs are framed as biomarker indicators requiring clinician interpretation; no automated diagnostic conclusion is generated or communicated to patients.

### 3.2 Commercial Licensing Strategy

A principal design constraint was commercial deployability. All pipeline components were selected on the basis of licences permitting use in a proprietary clinical product without copyleft obligations. Table 1 summarises the five pipeline stages.

**Table 1. CogAssess pipeline: components and licensing**

| Stage | Function | Component | Licence |
|---|---|---|---|
| 1 | Speech-to-text | Google Cloud Speech-to-Text V2 | Commercial |
| 2 | Acoustic features | Librosa 0.10 / SpeechBrain 1.0 | ISC / Apache 2.0 |
| 3 | Morphological tagging | spaCy 3.7 | MIT |
| 4 | Semantic embeddings | sentence-transformers (all-mpnet-base-v2) | Apache 2.0 |
| 5 | Emotion detection | j-hartmann/emotion-english-distilroberta-base | Apache 2.0 |

This selection eliminates GPL, AGPL, and CC BY-SA components. We treat commercial licence compatibility as a first-order architectural constraint rather than a post-hoc consideration — a practice we recommend to others (see Section 6, Lesson 1).

### 3.3 Technology Stack

The backend is implemented in Python 3.13 using FastAPI with SQLAlchemy and SQLite. The frontend is a React 19 single-page application using the browser MediaRecorder API for audio capture. Authentication uses JWT (HS256, 8-hour expiry) with bcrypt password hashing. Patient data is pseudonymised at point of entry; no name fields exist in the data model.

---

## 4. Development Experience Under IEC 62304

### 4.1 Software Safety Classification

We classified CogAssess as **Class B** (non-serious injury possible). The rationale is that while the system generates quantitative biomarker scores, the clinical pathway preserves clinician agency at every decision point: the clinician reviews all AI output, records an outcome classification in their own judgement, authors a patient-facing summary in natural language, and explicitly confirms findings before any patient communication is generated. No automated decision reaches the patient without clinician review and sign-off.

This design pattern — AI-generated insight plus mandatory human confirmation — is the critical mechanism for achieving Class B classification in an AI-enabled system. Class C classification would be required if the system could directly determine or communicate a clinical outcome without clinician review. Practitioners should note that the safety classification is a function of the clinical pathway design, not solely of the AI component's capabilities.

### 4.2 SOUP Identification and Documentation

SOUP documentation was maintained in a SOUP register (internal reference CA-SOUP-001) covering: package identity and version; licence and provenance; safety classification (safety-relevant or security-relevant); known anomalies; and rationale for acceptance. Eleven packages were identified as safety-relevant or security-relevant and subjected to the full SOUP documentation process.

**ML model weights as SOUP.** The most significant adaptation to standard SOUP practice concerned ML model weights. We identified four distinct SOUP items that have no counterpart in conventional software SOUP documentation:

1. *Pre-trained model weights* (distributed as `.bin` or `.safetensors` files from HuggingFace Hub) — identified by model card URL and repository commit hash
2. *Model architecture specification* (the `config.json` accompanying each model) — versioned with the weight file
3. *Tokeniser vocabulary* (a component with its own version history, separate from model weights)
4. *Cloud-hosted AI service model* (Google Cloud Speech-to-Text Chirp) — identified by API version and model identifier, with change notification subscribed via GCP release notes

For items 1–3, we adopted the HuggingFace Hub commit hash as the version identifier, pinned via the `transformers` library's `revision` parameter. For item 4, we documented the API version and model identifier in the SOUP register and noted that upstream model updates are outside our direct control — a risk acknowledged in the risk management file with the mitigation that all STT output passes through a human-readable transcript review step before scoring.

**Version pinning.** All SOUP items were pinned in `requirements.txt` using strict equality constraints (`==`). An automated verification test (TC-SOUP-001) confirms at every test run that all safety-relevant packages carry exact version pins, failing if any safety-relevant package uses a floating constraint.

### 4.3 Automated CVE Monitoring

IEC 62304 §8.2.4 requires monitoring of known anomalies in SOUP. For a deep learning stack, the transitive dependency graph of safety-relevant packages includes dozens of items with independent vulnerability histories. Manual monitoring is impractical.

We integrated `pip-audit` [9] into the verification suite as an automated CVE monitoring test (TC-SOUP-003). On each test run, `pip-audit` scans the full installed package set, parses JSON output for HIGH and CRITICAL severity findings, and fails the test suite if any are found. Findings are automatically recorded to an anomaly log with IEC 62304 §8.2.4-compliant traceability fields (CVE identifier, affected package, severity, run timestamp, tester identity).

During development, four CVEs were identified and remediated:

- **GHSA-537c-gmf6-5ccf** (cryptography 48.0.0 — bundled OpenSSL) → upgraded to 49.0.0
- **CVE-2026-54283** (starlette 1.2.1 — form data parsing) → upgraded to 1.3.1
- **CVE-2026-54282** (starlette 1.2.1 — HTTP path validation) → upgraded to 1.3.1
- **CVE-2025-3000** (torch 2.12.0 — `torch.jit.script`) → upgraded to 2.12.1

Notably, all four affected transitive dependencies — packages not directly listed in `requirements.txt` but pulled in by higher-level SOUP items. This illustrates the inadequacy of monitoring only direct dependencies and underscores the value of automated whole-graph CVE scanning.

### 4.4 Requirements and Traceability

A Software Requirements Specification (SRS) was developed covering functional, safety, security, and performance requirements. A Requirements Traceability Matrix (RTM) maps each requirement to its implementing component, corresponding test case, and test result — satisfying IEC 62304 §5.2 and providing a complete evidence chain for regulatory audit.

Safety requirements arising specifically from the AI/ML components include:

- A clinical notice must be displayed on all biomarker output screens (guards against clinician over-reliance on AI scores)
- Numerical scores must not be communicated directly to patients (reserves interpretive authority with the clinician)
- Session conditions — environment quality, first language, recording interruptions — must be recorded alongside every assessment (contextualises AI output quality for the clinician)
- Clinician sign-off is mandatory before any patient-facing document is generated

These requirements are traceable to identified hazards in the risk management file. Each one also functions as a change management mechanism, which we discuss further in Section 6.

### 4.5 Security Requirements and Verification

Given the sensitivity of patient assessment data, security requirements were aligned to the OWASP API Security Top 10 (2023) [10] as a recognised, actionable framework. Ten automated penetration tests were developed, covering:

- Broken Object Level Authorization (BOLA) — each clinician may only access their own assessments
- Authentication token manipulation — JWT algorithm confusion, payload tampering, signature corruption
- SQL injection — parameterised queries via SQLAlchemy ORM
- Mass assignment — Pydantic schema validation rejects undeclared fields
- Information leakage — error responses do not expose stack traces, database file paths, or ORM class names
- Unrestricted resource consumption — oversized payloads handled without HTTP 5xx

All ten categories passed automated verification. Notably, the information leakage test (TC-OWA-006) required correction during development when a patient creation endpoint that previously required `patient_ref` was updated to auto-generate it — the test's intended 422 trigger no longer fired, exposing the test's implicit assumption about the API contract. This illustrates how API evolution can silently invalidate security tests; test review must accompany API changes.

### 4.6 Audit Trail and Amendment Control

An audit trail was implemented for all clinical findings. An initial findings record requires no change reason; any amendment requires an explicit `change_reason` field and is rejected (HTTP 400) without it. Every save event is recorded to an append-only history table with timestamp, clinician identity, action type (initial/amendment), and the reason provided. This satisfies IEC 62304 §5.7 maintenance requirements and GDPR data integrity obligations under Article 5(1)(d).

Automated tests (TC-SAF-001) verify the complete amendment workflow: successful initial save, rejection of amendment without change reason, successful amendment with change reason, and correct population of the audit history with two entries of correct action type.

---

## 5. Verification Programme

The verification programme was structured against a Software Verification Plan (SVP) using a custom test runner that generates IEC 62304-compliant test logs and an anomaly log. Each test carries a unique identifier (TC-XXX-NNN) traceable through the RTM to its originating software requirement.

**Table 2. Verification suite summary**

| Module | Area | Auto | Deferred |
|---|---|---|---|
| test_auth | Authentication, JWT | 3 | 0 |
| test_assessments | Assessment lifecycle | 3 | 0 |
| test_patients | Pseudonymisation | 2 | 1 |
| test_pipeline | AI scoring pipeline | 2 | 2 |
| test_findings | Clinical findings, audit trail | 3 | 2 |
| test_owasp | OWASP API Top 10 (2023) | 14 | 0 |
| test_security | Auth, data protection | 3 | 4 |
| test_report | Report API contract | 2 | 2 |
| test_summary | Patient summary | 0 | 3 |
| test_recording | Browser audio capture | 0 | 2 |
| test_soup | SOUP pinning, CVE audit | 3 | 0 |
| **Total** | | **35** | **16** |

The 16 deferred tests require either browser automation (Playwright) or live cloud infrastructure (Google Cloud Speech-to-Text credentials). Each deferred test carries an explicit skip reason, prerequisite statement, and the `@pytest.mark.browser` or `@pytest.mark.gcp` marker, consistent with IEC 62304 §5.7 documentation requirements for rationale when planned tests are not executed.

The test runner generates a dated test log per run (containing all TC-IDs, pass/fail/skip status, and durations) and appends to a persistent anomaly log on failure. Both artefacts are versioned alongside the source code and form part of the regulatory evidence package.

---

## 6. Lessons Learned

We present seven lessons generalised from this experience that we believe apply beyond CogAssess to AI-enabled medical device software programmes broadly.

**Lesson 1: Treat commercial licence compatibility as a first-order architectural constraint.**
Licence incompatibility between research-grade AI components and commercial deployment requirements is pervasive. Discovering a licence conflict late in development may require replacing a core pipeline component — a high-cost, high-risk change. Licence review should occur before component selection, not after integration.

**Lesson 2: ML model weights are SOUP and require version identification beyond semantic versioning.**
IEC 62304 SOUP documentation assumes semantic versioning (e.g., `library==2.4.1`). ML model weights have no equivalent. We adopted HuggingFace Hub commit hashes as version identifiers. This is auditable and reproducible but requires a conscious process decision. Standards bodies should provide explicit guidance on this; practitioners should not wait for it.

**Lesson 3: Automate CVE monitoring across the full transitive dependency graph.**
All four CVEs identified during development affected transitive dependencies, not packages directly listed in `requirements.txt`. Manual SOUP anomaly monitoring would not have caught them. `pip-audit` integrated into the test suite provides IEC 62304 §8.2.4-compliant anomaly monitoring with negligible overhead. Similar tooling exists for other package ecosystems (npm audit, cargo audit, bundler-audit).

**Lesson 4: Cloud-hosted AI services introduce SOUP with loss-of-control implications.**
Cloud STT APIs represent SOUP items whose behaviour can change upstream without notice. Version pinning is not possible at the API caller level. Mitigations include: subscribing to vendor release notes; designing the system so that all AI output passes through human review before clinical action; and documenting this risk explicitly in the risk management file with its accepted residual risk.

**Lesson 5: Safety classification is a clinical pathway design decision, not a component capability decision.**
An AI component capable of high-accuracy inference does not determine the system's safety classification; the clinical pathway design does. Preserving mandatory human review at all decision points is the mechanism for Class B classification. This is an SE design decision with direct regulatory consequence.

**Lesson 6: Safety requirements for AI components function simultaneously as change management artefacts.**
Requirements such as "clinical notice must be displayed on all biomarker output screens" and "patient-facing summaries must be authored by the clinician, not generated by the system" are simultaneously safety requirements (traceable to identified hazards) and change management interventions (managing clinician over-reliance, preserving the therapeutic relationship, building trust in the new tool). Recognising this duality enables SE practitioners to ground change management design decisions in the regulatory artefact set rather than treating them as separate concerns.

**Lesson 7: Bridge IEC 62304 and AI-specific regulatory guidance with supplementary documentation now; do not wait for standards alignment.**
IEC 62304 and AI-specific frameworks (FDA AI Action Plan, EU AI Act) are not aligned. Waiting for standards-level resolution is not a viable development strategy. Practically, the gap can be managed with supplementary documentation addressing algorithmic transparency (model card citations, training data provenance), predetermined change control (a change log with impact assessment before any model version update), and post-market monitoring plans (CVE audit cadence, performance drift review schedule).

---

## 7. Threats to Validity

**Construct validity.** CogAssess is a single system in a single domain. The IEC 62304 adaptations we describe — ML SOUP identification, automated CVE monitoring, safety classification through pathway design — are argued to generalise, but may require domain-specific adjustment in Class C systems, in regulated markets other than the EU/UK, or for AI modalities beyond supervised classification and sequence-to-sequence models.

**External validity.** This is a single-site experience report by the development team; the findings have not been replicated by independent practitioners or validated through regulatory audit. The approach has not yet been reviewed by a Notified Body. Practitioners should treat the lessons as informed starting points rather than authoritative practice.

**Internal validity.** CogAssess has not undergone clinical validation. The biomarker scores it produces have not been calibrated against normative population data or validated against reference standard cognitive assessments. The system should be regarded as a development-stage research instrument; it is not CE marked or FDA cleared. Regulatory claims are made about the development process, not the clinical efficacy of the outputs.

---

## 8. Related Work

Several authors have examined the application of software engineering standards to AI/ML-enabled medical systems. Muehlematter et al. [11] documented the regulatory approval landscape for AI medical devices in the US and EU, finding that most approved devices fell in radiology and pathology, and that regulatory frameworks lagged behind deployment. Jiang et al. [12] surveyed testing approaches for deep learning systems in safety-critical applications, concluding that standard coverage criteria are insufficient for probabilistic models. Habibullah et al. [13] examined the specific challenge of SOUP management for machine learning components in safety-critical software, proposing a classification of ML SOUP types that informed our own documentation approach.

On change management in clinical AI adoption, Bates et al. [14] identified ten factors for effective clinical decision support, several of which — workflow integration, speed, and clinician agency — are directly reflected in our design decisions. More recently, Cresswell et al. [15] examined the organisational change required to realise value from AI in health systems, emphasising the importance of embedding governance in workflow design rather than treating it as a separate layer.

---

## 9. Conclusion

This paper has reported the experience of applying IEC 62304 to the development of an AI-enabled medical device, documenting the adaptations required and the lessons learned. The central finding is that IEC 62304 can accommodate AI/ML components, but requires deliberate extension in three areas: SOUP identification for ML model weights (using commit hashes rather than semantic versioning); automated CVE monitoring across the full transitive dependency graph (not merely direct dependencies); and supplementary documentation bridging IEC 62304 to emerging AI-specific regulatory guidance.

Seven generalised lessons are presented for practitioners. Of these, we consider Lessons 2 and 3 most immediately actionable — the absence of ML model weight versioning from SOUP registers, and the absence of automated transitive CVE monitoring, are gaps we believe are common in practice and carry meaningful regulatory and security risk.

The change management dimension of AI medical device development runs throughout our experience. Design decisions with safety rationale — mandatory clinician review, separation of clinical and patient-facing outputs, explicit session condition recording — simultaneously serve as change management mechanisms, enabling clinician adoption of a novel AI-enabled tool without eroding professional agency or clinical governance. We suggest that SE practitioners working on clinical AI systems treat the safety requirement set and the change management plan as mutually informing rather than independent artefacts.

The CogAssess source code is available to qualified researchers on reasonable request to the corresponding author.

---

## Acknowledgements

[To be completed.]

---

## References

[1] International Electrotechnical Commission. IEC 62304:2006/AMD1:2015: Medical device software — Software life cycle processes. Geneva: IEC; 2015.

[2] US Food and Drug Administration. Artificial intelligence/machine learning (AI/ML)-based software as a medical device (SaMD) action plan. Silver Spring, MD: FDA; 2021.

[3] European Parliament and Council. Regulation on a European Approach for Artificial Intelligence (AI Act). Brussels: EU; 2024.

[4] Fraser KC, Meltzer JA, Rudzicz F. Linguistic features identify Alzheimer's disease in narrative speech. J Alzheimers Dis. 2016;49(2):407–422.

[5] König A, Satt A, Sorin A, et al. Automatic speech analysis for the assessment of patients with predementia and Alzheimer's disease. Alzheimers Dement (Amst). 2015;1(1):112–124.

[6] Petti U, Baker S, Korhonen A. A systematic literature review of automatic Alzheimer's disease detection from speech and language. J Am Med Inform Assoc. 2020;27(11):1784–1797.

[7] Luz S, Haider F, de la Fuente S, Fromm D, MacWhinney B. Alzheimer's dementia recognition through spontaneous speech: The ADReSS challenge. Proc Interspeech. 2020:2172–2176.

[8] Ramírez S. FastAPI. 2018. Available at: https://fastapi.tiangolo.com

[9] Trail of Bits. pip-audit: A tool for auditing Python environments for packages with known vulnerabilities. 2021. Available at: https://github.com/pypa/pip-audit

[10] OWASP Foundation. OWASP API Security Top 10. 2023. Available at: https://owasp.org/API-Security

[11] Muehlematter UJ, Daniore P, Vokinger KN. Approval of artificial intelligence and machine learning-based medical devices in the USA and Europe (2015–20): a comparative analysis. Lancet Digit Health. 2021;3(3):e195–e203.

[12] Jiang Y, Tsiknas K, Caliskan A. Testing machine learning algorithms in safety-critical domains. IEEE Trans Software Eng. 2022;48(11):4498–4515.

[13] Habibullah KM, Horkoff J, Knauss E. Non-functional requirements for machine learning: Understanding current use and challenges in industry. IEEE Int Requirements Eng Conf. 2021:13–23.

[14] Bates DW, Kuperman GJ, Wang S, et al. Ten commandments for effective clinical decision support: making the practice of evidence-based medicine a reality. J Am Med Inform Assoc. 2003;10(6):523–530.

[15] Cresswell K, Sheikh A. Organizational issues in the implementation and adoption of health information technology innovations: an interpretative review. Int J Med Inform. 2013;82(5):e73–e86.
