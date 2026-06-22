# Innovation/Invention Declaration Form — CogAssess

---

### 1. Title of Invention

CogAssess: A Browser-Based Multi-Domain Speech Biomarker Assessment Platform for Cognitive Screening

---

### 2. Inventors

| Name | Department / Organisation | Affiliation | Address / Contact / Email | % Contribution |
|---|---|---|---|---|
| Niamh St John Lynch | St John Lynch & Co. | Director / Founder | nmstjoly@gmail.com | 100% |

> **Note:** This invention was conceived and developed in the inventor's capacity as Director of St John Lynch & Co., a commercial entity independent of Dundalk Institute of Technology. It does not form part of, and was not funded by, the inventor's PhD research at DkIT. No DkIT resources, supervision, or institutional facilities were used in its development.

---

### 3. Contribution to the Invention

I, Niamh St John Lynch, conceived and directed the development of the CogAssess platform in my capacity as Director of St John Lynch & Co. Working informally with MemoryTell Ltd., I developed a feasibility prototype comprising:

- A five-stage AI/ML speech biomarker pipeline (CogAssess)
- A full IEC 62304 Class B software lifecycle documentation suite (SRS, SAD, SVP, RMF, SOUP, SEC, RTM, VP, VR, and Investigator's Brochure for EU MDR Article 62)
- Regulatory and clinical workflow documentation

This work was not formally commissioned but was carried out to demonstrate the feasibility of a commercially-deployable cognitive screening platform based on the TELL research architecture. The prototype and documentation were shared with MemoryTell Ltd. during the course of an informal working relationship.

This work was conducted entirely in a commercial capacity and is independent of any research obligations to Dundalk Institute of Technology.

Signature: __________________________ Date: ______________

---

### 4. Description of Invention

CogAssess is a clinician-facing, browser-based feasibility prototype for a Software as a Medical Device (SaMD) that captures short speech samples from patients and automatically scores cognitive biomarkers across four clinical domains: Motor Speech, Semantic Memory, Episodic Memory, and Emotional Processing.

**Note:** CogAssess is a feasibility prototype, not a finished commercial product. Significant further development, clinical validation, and regulatory submission work would be required before commercial deployment.

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
| Industry or other Sponsor | MemoryTell Ltd. (recipient of prototype; payment for services via MemoryTell's grant workpackages) |
| % Support | — |
| Contract/Grant No. | MemoryTell Ltd. grant reference [fill in if known] |
| Contact Name | Corrina [fill in surname] |
| Phone No. | [Fill in] |
| Address | [Fill in] |

> **Note:** MemoryTell Ltd. received a government/agency grant. Payment to St John Lynch & Co. for services rendered (€18,000 over 18 months, commencing June 2026) is structured retrospectively against MemoryTell's grant workpackages, reflecting the work completed to date on the prototype and documentation suite.

---

### 7. Where was the research carried out?

The invention was designed and developed by St John Lynch & Co. as an independent commercial initiative. Development was not carried out at Dundalk Institute of Technology and did not involve DkIT facilities, equipment, supervision, or funding.

---

### 8. What is the potential commercial application of this invention?

The feasibility prototype demonstrates the viability of a subscription-based SaaS platform for healthcare providers (GP practices, memory clinics, neurology departments, geriatric services, speech and language therapy) for structured, objective, repeatable cognitive screening. Target patient population: adults aged 50+ with subjective cognitive complaints or clinical concern for MCI or early dementia.

The prototype and documentation have been made available to MemoryTell Ltd. to support their product development. Further commercial development, clinical validation, and regulatory submission are required before market deployment.

---

### 9. Was there transfer of any materials/information to or from other institutions regarding this invention?

The CogAssess prototype codebase and IEC 62304 Class B documentation suite were shared with MemoryTell Ltd. during the course of an informal working relationship. Payment for this contribution is being made retrospectively through MemoryTell's grant workpackage structure (€18,000 over 18 months from June 2026).

Access to the AIa-CMP platform (a separate software tool with independent IP, involving DkIT) was also provided to MemoryTell Ltd. during this period. Licensing terms for AIa-CMP access are governed separately and are not part of this declaration.

The system architecture is conceptually inspired by the published TELL research framework from Universidad de San Andrés, Argentina; no proprietary code, data, or materials were transferred from that institution. Pre-trained AI models were obtained from publicly available repositories (HuggingFace Hub) under Apache 2.0 licence.

---

### 10. Have any third parties any rights to this invention?

**MemoryTell Ltd.** received the CogAssess prototype and documentation as a contribution during an informal working arrangement. Payment for this contribution (€18,000 over 18 months) is being made via MemoryTell's grant workpackages. MemoryTell Ltd. does not hold IP ownership in the invention.

Google LLC holds rights to the Cloud Speech-to-Text (Chirp) API used within the pipeline, accessed under a commercial subscription licence. All other third-party components are used under MIT, Apache 2.0, ISC, or BSD licences which impose no IP claims on the derived work.

Dundalk Institute of Technology has no rights to this invention, which was developed independently of the inventor's PhD research engagement with DkIT.

---

### 11. Are there any existing or planned disclosures regarding this invention?

An Investigator's Brochure (IB) has been drafted for a planned EU MDR Article 62 clinical investigation. Academic paper drafts are in preparation. No public disclosure has been made to date.

The prototype and documentation suite have been shared with MemoryTell Ltd., with payment structured via their grant workpackages. An informal written agreement (WhatsApp exchange, 8 June 2026) documents the €18,000 payment schedule over 18 months for work completed to date.

*(Update this section if any conference presentations, paper submissions, or formal agreements are executed.)*

---

### 12. Has any patent application been made?

No.

---

### 13. Is a model or prototype available? Has the invention been demonstrated practically?

Yes. A working feasibility prototype (v0.5.0-beta) is available with all five pipeline stages operational. The system has been demonstrated with real speech samples, producing scored reports across all four cognitive domains. A complete IEC 62304 Class B documentation suite has been authored by the inventor. The prototype and documentation have been provided to MemoryTell Ltd. and are in active use for their product development.

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
- [ ] Section 11: update once Corrina replies confirming the payment agreement in writing
- [ ] Final signature and date
