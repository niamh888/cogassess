# Innovation/Invention Declaration Form — CogAssess

---

### 1. Title of Invention

CogAssess: A Browser-Based Multi-Domain Speech Biomarker Assessment Platform for Cognitive Screening

---

### 2. Inventors

| Name | Department / Organisation | Affiliation | Address / Contact / Email | % Contribution |
|---|---|---|---|---|
| Niamh St John Lynch | St John Lynch & Co. | Director / Founder | nmstjoly@gmail.com | 100% |

> **Note on dual development context:** The CogAssess platform has been developed across two distinct phases with different organisational contexts, as described in Section 3. The core speech biomarker pipeline (v0.5.0-beta) was conceived and developed entirely in the inventor's capacity as Director of St John Lynch & Co., independently of DkIT. The change management and real-time monitoring architecture (v1.0.0) was subsequently developed to support the inventor's PhD research at DkIT. The IP position for each version is addressed in Section 10. Inventors with queries regarding the boundary between these two phases should contact both DkIT Technology Transfer and St John Lynch & Co.

---

### 3. Contribution to the Invention

I, Niamh St John Lynch, conceived and directed the development of the CogAssess platform across two phases:

**Phase 1 — Commercial feasibility prototype (v0.5.0-beta, June 2026)**

In my capacity as Director of St John Lynch & Co., I independently conceived, named, and developed CogAssess as a feasibility prototype. The concept, architecture, and name originated with the inventor. The prototype was not commissioned by any third party. It comprises:

- A five-stage AI/ML speech biomarker pipeline (CogAssess)
- A full IEC 62304 Class B software lifecycle documentation suite (SRS, SAD, SVP, RMF, SOUP, SEC, RTM, VP, VR, and Investigator's Brochure for EU MDR Article 62)
- Regulatory and clinical workflow documentation

During a separate working relationship with MemoryTell Ltd. (relating to the AIa-CMP platform), the inventor demonstrated the CogAssess prototype to MemoryTell Ltd. as an illustration of what was technically feasible in the cognitive screening domain. This demonstration was voluntary and unsolicited; no service agreement, commission, or payment was made in respect of CogAssess. The inventor subsequently withdrew from the working relationship with MemoryTell Ltd. This phase was conducted entirely in a commercial capacity, independently of any research obligations to Dundalk Institute of Technology.

**Phase 2 — Change management and real-time monitoring architecture (v1.0.0, June 2026)**

Following delivery of v0.5.0-beta, a further phase of development was undertaken to support the inventor's PhD research at Dundalk Institute of Technology. This phase produced an integrated change management and real-time monitoring system, comprising:

- A Predetermined Change Control Plan (PCCP) expressed as a versioned, machine-readable configuration artefact (`change_control.json`), aligned with FDA (2024) and MDCG-2025-6 (2025) guidance
- A four-metric statistical drift detection suite (Z-score, Population Stability Index, Kolmogorov-Smirnov test, CUSUM) operating across 28 pipeline features
- Automated clinical performance gates: sensitivity and specificity monitoring against clinician-confirmed outcome labels, with threshold breach triggering formal change events
- A three-layer change notification and governance workflow (dashboard, engineering log, database audit trail)
- A clinician-facing confirmed diagnosis UI embedded in the clinical findings workflow

This phase is documented in a Technology Report paper submitted to Frontiers in Digital Health (in preparation). The IP position for this phase is addressed in Section 10.

Signature: __________________________ Date: ______________

---

### 4. Description of Invention

CogAssess is a clinician-facing, browser-based Software as a Medical Device (SaMD) that captures short speech samples from patients and automatically scores cognitive biomarkers across four clinical domains: Motor Speech, Semantic Memory, Episodic Memory, and Emotional Processing.

**Version history:**

| Version | Date | Status | Context |
|---|---|---|---|
| v0.5.0-beta | June 2026 | Feasibility prototype | Delivered to MemoryTell Ltd. as a commercial initiative of St John Lynch & Co. |
| v1.0.0 | June 2026 | Research prototype with integrated monitoring | Developed to support PhD research at Dundalk Institute of Technology; adds PCCP change management and real-time performance monitoring |

**Note:** CogAssess v1.0.0 is a research prototype, not a finished commercial product. Significant clinical validation and regulatory submission work would be required before commercial deployment.

The system operates as a five-stage AI/ML pipeline:

1. **Google Cloud Chirp STT** — automatic speech recognition producing a verbatim transcript with word-level timing
2. **Acoustic feature extraction (librosa)** — measures articulation rate, pause patterns, pitch, and harmonic-to-noise ratio
3. **Morphological and linguistic analysis (spaCy)** — extracts lexical diversity, disfluency counts, and pronoun ratios
4. **Semantic embedding analysis (sentence-transformers, all-mpnet-base-v2)** — measures topic coherence and semantic variability
5. **Emotion classification (DistilRoBERTa)** — produces a 7-class emotional profile

Domain scores (0–100) and a composite risk flag (Low / Moderate / Elevated) are generated per assessment session. The backend is FastAPI (Python); the frontend is React. All AI models are locked at evaluated versions.

Accompanying the prototype is a complete IEC 62304 Class B documentation suite, authored by the inventor, covering the full software development lifecycle to Class B standard and including an Investigator's Brochure structured for EU MDR 2017/745 Article 62 investigational device classification.

---

### 5. Why is this invention more advantageous than present technology? What are its novel or unusual features? What problems does it solve?

**Problem:** Cognitive screening tools (e.g., MoCA, MMSE) rely on manual clinician administration, are subject to examiner variability, and capture only gross cognitive performance without objective biological signal. No commercially-deployable, browser-based tool currently integrates acoustic, linguistic, semantic, and affective speech biomarkers into a single clinician workflow.

**Novel features:**

- **Multi-modal integration in one clinical session:** acoustic, morphological, semantic, and emotional features are extracted from a single speech sample and combined into interpretable domain scores
- **Fully commercial-safe component stack:** replaces every non-commercial component of the TELL research framework (PySentimiento, FreeLing AGPL, FastText CC BY-SA, PRAAT GPL) with commercially licensed equivalents
- **No specialist equipment:** audio is captured directly in the clinician's browser via the WebRTC MediaRecorder API
- **GDPR-compliant by design:** patient names are not stored; audio is processed in-memory and deleted immediately
- **Immutable clinical audit trail:** satisfying ICH E6(R2) GCP requirements
- **Structured clinical flag system:** severity levels (note / watch / refer) providing decision support without standalone diagnosis

---

### 6. Sponsorship

**Government Agency:**

| Field | Detail |
|---|---|
| Government Agency & Department | None (development self-funded by St John Lynch & Co.) |
| % Support | — |
| Contract/Grant No. | — |
| Contact Name | — |
| Phone No. | — |
| Address | — |

**Industry:**

| Field | Detail |
|---|---|
| Industry or other Sponsor | None — CogAssess was self-funded and independently developed |
| % Support | — |
| Contract/Grant No. | — |
| Contact Name | — |
| Phone No. | — |
| Address | — |

> **Note:** MemoryTell Ltd. received a demonstration of the CogAssess prototype during a separate working relationship with the inventor (relating to the AIa-CMP platform). MemoryTell Ltd. is not a sponsor of this invention and made no financial contribution to its development. No service agreement or payment arrangement exists in respect of CogAssess.

---

### 7. Where was the research carried out?

The invention was designed and developed by St John Lynch & Co. as an independent commercial initiative. Development was not carried out at Dundalk Institute of Technology and did not involve DkIT facilities, equipment, supervision, or funding.

---

### 8. What is the potential commercial application of this invention?

The feasibility prototype demonstrates the viability of a subscription-based SaaS platform for healthcare providers (GP practices, memory clinics, neurology departments, geriatric services, speech and language therapy) for structured, objective, repeatable cognitive screening. Target patient population: adults aged 50+ with subjective cognitive complaints or clinical concern for MCI or early dementia.

The prototype and documentation have been made available to MemoryTell Ltd. to support their product development. Further commercial development, clinical validation, and regulatory submission are required before market deployment.

---

### 9. Was there transfer of any materials/information to or from other institutions regarding this invention?

The CogAssess prototype codebase and IEC 62304 Class B documentation suite were demonstrated to MemoryTell Ltd. during a separate working relationship relating to the AIa-CMP platform. This sharing was voluntary and unsolicited; no service agreement, commission, or payment was made or agreed in respect of CogAssess. The NDA in place between the inventor and MemoryTell Ltd. (executed prior to the conception of CogAssess) obligates MemoryTell Ltd. to treat shared materials as confidential but does not confer any rights to use, copy, or develop the CogAssess materials. The inventor has since withdrawn from the working relationship with MemoryTell Ltd.

Access to the AIa-CMP platform (a separate software tool with independent IP, involving DkIT) was also provided to MemoryTell Ltd. during this period. Licensing terms for AIa-CMP access are governed separately and are not part of this declaration.

The system architecture is conceptually inspired by the published TELL research framework from Universidad de San Andrés, Argentina; no proprietary code, data, or materials were transferred from that institution. Pre-trained AI models were obtained from publicly available repositories (HuggingFace Hub) under Apache 2.0 licence.

---

### 10. Have any third parties any rights to this invention?

**v0.5.0-beta (core pipeline and documentation suite):** IP vests in St John Lynch & Co. as the originating commercial entity. MemoryTell Ltd. received the prototype and documentation as a contribution and does not hold IP ownership. Dundalk Institute of Technology has no rights to this phase of development, which was conducted independently of the inventor's PhD research.

**v1.0.0 (change management and monitoring architecture):** This phase was developed in the context of the inventor's PhD research at Dundalk Institute of Technology. The IP position for this phase has not yet been formally agreed and should be clarified with DkIT Technology Transfer before any commercial exploitation of this component. *(Add outcome of TT discussion here.)*

**Google LLC** holds rights to the Cloud Speech-to-Text (Chirp) API used within the pipeline, accessed under a commercial subscription licence. All other third-party components are used under MIT, Apache 2.0, ISC, or BSD licences which impose no IP claims on the derived work.

---

### 11. Are there any existing or planned disclosures regarding this invention?

An Investigator's Brochure (IB) has been drafted for a planned EU MDR Article 62 clinical investigation. A Technology Report paper describing the v1.0.0 change management architecture is in preparation for submission to Frontiers in Digital Health. No public disclosure has been made to date.

The v0.5.0-beta prototype and documentation suite were demonstrated to MemoryTell Ltd. during a separate working engagement. No formal agreement, service contract, or payment arrangement was executed in respect of CogAssess. The only binding instrument between the inventor and MemoryTell Ltd. is a confidentiality NDA, executed prior to the conception of CogAssess.

The v1.0.0 monitoring architecture is being disclosed in the context of PhD research at DkIT. The relationship between the commercial prototype and the PhD contribution is documented in Sections 3 and 10.

*(Update this section if any conference presentations, paper submissions, or formal agreements are executed.)*

---

### 12. Has any patent application been made?

No.

---

### 13. Is a model or prototype available? Has the invention been demonstrated practically?

Yes. Two versions are available:

**v0.5.0-beta** — the feasibility prototype delivered to MemoryTell Ltd. in June 2026. Includes the full five-stage speech biomarker pipeline, clinical workflow UI, and IEC 62304 Class B documentation suite. Demonstrated with real speech samples, producing scored reports across all four cognitive domains.

**v1.0.0** — extends v0.5.0-beta with an integrated change management and real-time monitoring system, developed to support PhD research at DkIT. Implements a Predetermined Change Control Plan (PCCP) as a machine-readable artefact, four-metric statistical drift detection across 28 pipeline features, automated clinical performance gates (sensitivity/specificity monitoring), and a three-layer governance audit trail. Documented in a Technology Report paper submitted to Frontiers in Digital Health (in preparation).

---

## Inventor Declaration

I/we acknowledge that the information provided in this disclosure is complete and correct.

**Note on IP ownership:** This invention was developed by St John Lynch & Co. as an independent commercial venture. IP rights vest in St John Lynch & Co. and are not assigned to Dundalk Institute of Technology by this declaration.

Inventor: ______________________________ _______________________
Signature (Niamh St John Lynch) Date

---

## Items to complete before submission

- [ ] Section 2: confirm postal address and phone number for St John Lynch & Co.
- [ ] Section 3: sign and date contribution paragraph
- [ ] Section 6: add Corrina's full name, MemoryTell address, and grant reference number if known
- [ ] Section 9: confirm AIa-CMP licensing position with DkIT
- [ ] Section 10: clarify IP position for v1.0.0 monitoring architecture with DkIT Technology Transfer; record outcome
- [ ] Section 11: update once Frontiers paper is submitted
- [ ] Final signature and date
