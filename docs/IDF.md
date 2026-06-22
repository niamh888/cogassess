# Innovation/Invention Declaration Form — CogAssess
## Dundalk Institute of Technology

---

### 1. Title of Invention

CogAssess: A Browser-Based Multi-Domain Speech Biomarker Assessment Platform for Cognitive Screening

---

### 2. Inventors

| Name | Department | Affiliation with Institute | Address / Contact / Email | % Contribution |
|---|---|---|---|---|
| [Full name] | [Department] | Staff / Researcher | nmstjoly@gmail.com | [%] |
| [Co-inventor name] | — | Industry partner (MemoryTell Ltd) | — | [%] |

---

### 3. Contribution to the Invention

*(Each contributor writes a paragraph, signs, and dates. Suggested starting point for primary inventor:)*

I conceived and directed the development of the CogAssess platform, defining the clinical requirements, the five-stage speech analysis pipeline architecture, the cognitive domain scoring model, and the clinical workflow. I supervised the technical implementation of the system, selected the commercially-licensed component stack to replace the non-commercial TELL research architecture, and authored the full IEC 62304 Class B software lifecycle documentation suite including the Investigator's Brochure for EU MDR Article 62 clinical investigation.

Signature: __________________________ Date: ______________

---

### 4. Description of Invention

CogAssess is a clinician-facing, browser-based Software as a Medical Device (SaMD) that captures short speech samples from patients and automatically scores cognitive biomarkers across four clinical domains: Motor Speech, Semantic Memory, Episodic Memory, and Emotional Processing.

The system operates as a five-stage AI/ML pipeline:
1. **Google Cloud Chirp STT** — automatic speech recognition producing a verbatim transcript with word-level timing
2. **Acoustic feature extraction (librosa)** — measures articulation rate, pause patterns, pitch, and harmonic-to-noise ratio
3. **Morphological and linguistic analysis (spaCy)** — extracts lexical diversity, disfluency counts, and pronoun ratios
4. **Semantic embedding analysis (sentence-transformers, all-mpnet-base-v2)** — measures topic coherence and semantic variability
5. **Emotion classification (DistilRoBERTa)** — produces a 7-class emotional profile

Domain scores (0–100) and a composite risk flag (Low / Moderate / Elevated) are generated per assessment session.

The platform includes a full clinical workflow: patient pseudonymisation, configurable battery of 8 speech tasks, per-task scoring, a population bell-curve report, structured clinical flags with severity levels, clinician findings recording with immutable audit trail, and a patient-facing printed summary. The backend is FastAPI (Python); the frontend is React. All AI models are locked at evaluated versions. The system is documented to IEC 62304 Class B and targets EU MDR 2017/745 Article 62 investigational device classification.

---

### 5. Why is this invention more advantageous than present technology? What are its novel or unusual features? What problems does it solve?

**Problem:** Cognitive screening tools (e.g., MoCA, MMSE) rely on manual clinician administration, are subject to examiner variability, and capture only gross cognitive performance without objective biological signal. No commercially-deployable, browser-based tool currently integrates acoustic, linguistic, semantic, and affective speech biomarkers into a single clinician workflow.

**Novel features:**

- **Multi-modal integration in one clinical session:** acoustic, morphological, semantic, and emotional features are extracted from a single speech sample and combined into interpretable domain scores — no existing commercial product does all four in one workflow.
- **Fully commercial-safe component stack:** the system is architecturally derived from the TELL research framework (Universidad de San Andrés) but replaces every non-commercial component (PySentimiento, FreeLing AGPL, FastText CC BY-SA, PRAAT GPL) with commercially licensed equivalents, making it deployable as a commercial product.
- **No specialist equipment:** audio is captured directly in the clinician's browser via the WebRTC MediaRecorder API — no recording hardware, no specialist software installation required.
- **GDPR-compliant by design:** patient names are not stored; audio is processed in-memory and deleted immediately; all records are held under pseudonymous reference codes.
- **Immutable clinical audit trail:** all findings amendments are logged with reason and timestamp, satisfying ICH E6(R2) GCP requirements for investigational medical devices.
- **Structured clinical flag system:** flags with severity levels (note / watch / refer) provide decision support without issuing a standalone diagnosis.

---

### 6. Sponsorship

**Government Agency:**

| Field | Detail |
|---|---|
| Government Agency & Department | [Fill in if applicable, e.g. SFI / Enterprise Ireland] |
| % Support | |
| Contract/Grant No. | |
| Contact Name | |
| Phone No. | |
| Address | |

**Industry or Other Sponsor:**

| Field | Detail |
|---|---|
| Industry or other Sponsor | MemoryTell Ltd |
| % Support | [Fill in] |
| Contract/Grant No. | [Fill in if applicable] |
| Contact Name | [Fill in] |
| Phone No. | [Fill in] |
| Address | [Fill in] |

---

### 7. Where was the research carried out?

Dundalk Institute of Technology (DkIT), in collaboration with MemoryTell Ltd (industry partner). Software development was conducted at DkIT.

---

### 8. What is the potential commercial application of this invention?

Subscription-based SaaS platform licensed to healthcare providers (GP practices, memory clinics, neurology departments, geriatric services, speech and language therapy) for structured, objective, repeatable cognitive screening. Target patient population: adults aged 50+ with subjective cognitive complaints or clinical concern for MCI or early dementia. A planned Phase 2 extension covers dyslexia assessment for educational and clinical settings.

---

### 9. Was there transfer of any materials/information to or from other institutions regarding this invention?

The system architecture is conceptually derived from the published TELL (Toolkit to Examine Lifelike Language) framework from Universidad de San Andrés, Argentina. No code, data, or proprietary materials were transferred — all pipeline components are independent commercially-licensed replacements. Pre-trained AI models were obtained from publicly available repositories (HuggingFace Hub) under Apache 2.0 licence.

---

### 10. Have any third parties any rights to this invention?

MemoryTell Ltd (industry sponsor) has a commercial interest in the product as commissioning party. Google LLC holds rights to the Cloud Speech-to-Text (Chirp) API used within the pipeline, accessed under a commercial subscription licence. All other third-party components are used under MIT, Apache 2.0, ISC, or BSD licences which impose no IP claims on the derived work.

---

### 11. Are there any existing or planned disclosures regarding this invention?

An Investigator's Brochure (IB) has been drafted for a planned EU MDR Article 62 clinical investigation. Academic paper drafts are in preparation. No public disclosure has been made to date.

*(Update this if any conference presentations or paper submissions have occurred.)*

---

### 12. Has any patent application been made?

No.

---

### 13. Is a model or prototype available? Has the invention been demonstrated practically?

Yes. A working beta prototype (v0.5.0-beta) is available with all five pipeline stages operational. The system has been demonstrated with real speech samples, producing scored reports across all four cognitive domains. A full IEC 62304 Class B documentation suite (SRS, SAD, SVP, RMF, SOUP, SEC, RTM, VP, VR, Investigator's Brochure) has been completed.

---

## Items to complete before submission

- [ ] Section 2: full names, contact details, and % contribution for all inventors
- [ ] Section 3: signed contribution paragraph from each inventor
- [ ] Section 6: MemoryTell Ltd contact details; government grant details if applicable
- [ ] Section 11: update if any conference presentations or paper submissions have occurred
- [ ] Signatures and dates on final page
