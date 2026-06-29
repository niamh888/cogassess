# Operationalising the Predetermined Change Control Plan: A Reference Architecture for Proactive AI Change Management in Clinical Decision Support Software

**Journal target:** Frontiers in Digital Health — Technology Report

**Author:** Niamh St. John-Lynch, Dundalk Institute of Technology

---

## Abstract

Artificial Intelligence-enabled Medical Devices (AIeMDs) exhibit forms of post-deployment behavioural change — including data drift, population shift, and gradual performance degradation — that existing post-market surveillance frameworks are not adequately equipped to detect. While the Predetermined Change Control Plan (PCCP), introduced by the FDA (2024) and adopted in EU guidance (MDCG-2025-6, 2025), provides a regulatory mechanism for governing permissible AI change, implementation requires proactive, automated monitoring capabilities that remain underdeveloped in practice. This paper presents a reference architecture for PCCP-aligned change management implemented within CogAssess, a speech biomarker clinical decision support system developed under IEC 62304 Class B software lifecycle requirements. The architecture comprises three integrated components: continuous pipeline performance instrumentation; automated covariate shift detection using a four-metric suite (z-score, Population Stability Index, two-sample Kolmogorov-Smirnov test, and Cumulative Sum control chart) against a clinically validated feature baseline; and a three-layer change notification and acknowledgement system linking statistical drift detection to formal change assessment workflows. A clinical performance endpoint computes sensitivity, specificity, F1, and AUC-ROC once clinician-confirmed outcome labels are available. Critically, when sensitivity or specificity falls below 80%, the system automatically generates a formal change event through the same three-layer notification and acknowledgement workflow as data drift breaches — completing a closed regulatory feedback loop between statistical deployment monitoring and governance action. Clinician-confirmed diagnoses are recorded through a dedicated UI section embedded in the existing clinical findings workflow, ensuring ground-truth data accumulates as a natural byproduct of routine clinical practice rather than through separate data collection effort. A key artefact is the change control plan expressed as a versioned, machine-readable software configuration — a practical operationalisation of regulatory threshold requirements. The implementation demonstrates how four operational governance gaps identified in the AIeMD literature — governance, change management, operationalisation, and monitoring — can be addressed concurrently through a single coherent system architecture, and illustrates an architectural pattern not currently documented in the literature: a complete, closed-loop PCCP implementation spanning pre-specified change boundaries, continuous distributional monitoring, ground-truth feedback, automated performance gates, and a governed audit trail. The full implementation is available as an open artefact to support reproducibility and adoption.

**Keywords:** AI-enabled medical devices; change management; data drift; post-market surveillance; predetermined change control plan; IEC 62304; clinical decision support; speech biomarkers

---

## 1. Introduction

The deployment of Artificial Intelligence-enabled Medical Devices (AIeMDs) in clinical settings presents a governance challenge that existing software lifecycle frameworks are not fully equipped to address. Unlike traditional deterministic medical device software, AI systems whose outputs depend on statistical models trained on clinical data may exhibit behavioural change in deployment even in the absence of deliberate modification (Gilbert et al. 2021; Bayram et al. 2022). Performance degradation arising from data drift, shifts in patient population characteristics, or changes in data acquisition conditions may develop gradually, go undetected, and ultimately affect the safety and efficacy of clinical decisions informed by such systems (Davis et al. 2020; Dhunnoo 2022).

Regulatory responses to this challenge have evolved. The Predetermined Change Control Plan (PCCP) — introduced by the United States Food and Drug Administration (FDA 2024) and subsequently adopted within European Union guidance (MDCG-2025-6 2025) — provides a regulatory framework through which manufacturers may pre-specify the nature, scope, and conditions under which changes to an AI system's performance are permissible without triggering full re-submission. However, to implement an acceptable and effective PCCP, organisations must first have a functioning Change Management Process (CMP) capable of identifying, assessing, and documenting changes in real time (Phillips and Klein 2023). The literature consistently demonstrates that such operational processes remain underdeveloped, with post-market surveillance of AIeMDs relying heavily on reactive signals such as adverse event reports and user complaints rather than proactive, automated performance monitoring (Badnjević et al. 2022; Mohajer-Bastami et al. 2025).

A critical and recurring finding across the AIeMD governance literature is that proactive monitoring strategies — including continuous performance evaluation and population-level analysis — are frequently advocated but rarely demonstrated in practice (Hernandez-Boussard et al. 2021; Olawade et al. 2024). This gap between regulatory aspiration and operational implementation represents a significant barrier to the safe and accountable deployment of AI in clinical settings. Sweeney et al. (2023) identified poor change management as one of three primary barriers to scaling AI medical devices, alongside infrastructural costs and security risks, noting that 75% of industry engineers surveyed reported limited or introductory knowledge of AI and machine learning governance.

This paper addresses that gap directly. We present a reference architecture for proactive AI change management implemented within CogAssess, a speech biomarker clinical decision support system developed under IEC 62304 Class B software lifecycle requirements. The architecture operationalises the PCCP concept through three integrated components: (1) continuous pipeline performance instrumentation; (2) automated covariate shift detection against a clinically validated feature baseline; and (3) a three-layer change notification and acknowledgement system that bridges statistical drift detection with formal change assessment workflows. A key contribution is the expression of the change control plan as a versioned software configuration file — a machine-readable operationalisation of regulatory threshold requirements that is itself subject to change control governance.

The paper makes four contributions: (i) a working reference implementation of a PCCP-aligned change management system in a deployed SaMD context; (ii) a demonstration of how four operational governance gaps identified in the AIeMD literature can be addressed at system level; (iii) a reusable architectural pattern applicable to other clinical AI deployments; and (iv) a practical illustration of the relationship between IEC 62304 §8 maintenance provisions and AI-specific change detection requirements.

---

## 2. Background

### 2.1 Lifecycle Behaviour and Data Drift in AI-Enabled Medical Devices

A defining characteristic of AI systems is their reliance on data-driven models whose performance properties are not fully described by explicit code (Gilbert et al. 2021; Klie et al. 2023). System outputs emerge from the interaction of model architecture, training data, and statistical optimisation processes, rendering AI behaviour contingent on the distributional properties of data encountered in deployment — properties that may shift substantially from those present at the time of model training and validation.

*Data drift* refers to changes in the statistical properties of input data over time; *concept drift* describes changes in the functional relationship between inputs and outputs (Bayram et al. 2022). In clinical settings, such drift may arise from changes in disease prevalence, evolution of diagnostic practices, variation in data acquisition technologies, or demographic change in patient populations (Davis et al. 2019; 2020; Abdul et al. 2022). Critically, studies consistently demonstrate that performance degradation can occur even in locked models — those not designed to update post-deployment — when applied across new clinical settings or patient populations (Dhunnoo 2022; Bayram et al. 2022).

The consequences of undetected drift range from gradual performance erosion to more acute failure modes including catastrophic forgetting and model collapse, whereby the model progressively loses alignment with the clinical patterns it was trained to identify (Martínez et al. 2023; Vela et al. 2022). In clinical decision support contexts, such degradation may influence diagnostic and treatment decisions before becoming apparent through conventional monitoring mechanisms (Guan et al. 2025). These findings challenge assumptions underlying existing medical device software governance models, which treat deployed systems as behaviourally stable unless deliberately modified (Canada et al. 2011; MDCG 2020-3 2020).

### 2.2 Limitations of Post-Market Surveillance for AIeMDs

Post-market surveillance (PMS) is a core requirement under the EU Medical Device Regulation and equivalent frameworks, intended to provide ongoing assurance of device safety and performance in clinical use (MDCG-2025-10 2025). However, PMS mechanisms as currently implemented for software and AI devices are predominantly reactive in character, relying on user-generated signals — complaints, adverse events, and vigilance reports — as the primary detection mechanism for performance issues (Badnjević et al. 2022; Kramer et al. 2012).

For AIeMDs, this reactive paradigm is structurally insufficient. Gradual performance degradation arising from data drift does not manifest as discrete adverse events; instead, it produces a slow and often imperceptible decline in output quality that may persist across many clinical encounters before a systematic error pattern becomes apparent (Cutillo et al. 2020; Vanneste et al. 2023). The absence of standardised metrics and evaluation protocols for AI performance monitoring further limits the sensitivity and comparability of existing PMS practice (Mohajer-Bastami et al. 2025; Olawade et al. 2024).

While both the EU AI Act (2021) and MDCG-2025-6 (2025) emphasise the need for lifecycle oversight and identify post-market monitoring as essential, neither provides operational specification of methods for real-time detection of AI model change. ISO/TR-20416 (2020) and ISO/IEC/DIS-42105 (2025) similarly identify performance monitoring as a requirement without prescribing implementation approaches. The result is a regulatory framework that mandates outcomes — continuous assurance of safety and performance — without specifying the mechanisms through which those outcomes are to be achieved (Carvalho et al. 2025; Mashar et al. 2023).

### 2.3 The Predetermined Change Control Plan as Regulatory Framework

The PCCP represents a regulatory acknowledgement that AI systems may — and in adaptive cases, are designed to — change behaviour post-deployment, and that such change need not be inherently unsafe if appropriately governed (FDA 2024; MDCG-2025-6 2025). Under the PCCP framework, manufacturers pre-specify: (i) the types of modifications anticipated; (ii) the performance boundaries within which modifications are permissible without re-submission; and (iii) the monitoring and verification protocols that will confirm ongoing compliance with those boundaries.

The PCCP represents a significant regulatory shift from the assumption of post-deployment behavioural stability that underpins traditional medical device software governance (Canada et al. 2011; MDCG 2020-3 2020). However, implementation requires manufacturers to possess robust real-time monitoring capabilities, documented change assessment processes, and the technical infrastructure to detect when performance boundaries have been breached. Phillips and Klein (2023) argue that organisations seeking to implement an effective PCCP must first establish a mature CMP, noting that in many organisations this foundational capability is absent or incompletely implemented. This is consistent with the findings of DuPreez and McDermott (2025) and Carvalho et al. (2025), who argue that the critical issue for AI governance is not the classification of a model as locked or adaptive, but whether its lifecycle behaviour is adequately monitored, controlled, and governed.

### 2.4 IEC 62304 and the Operational Change Management Gap

IEC 62304 establishes software lifecycle requirements for medical device software and includes provisions for software maintenance (§8) encompassing change assessment, impact analysis, and configuration management. However, these provisions were developed in the context of deterministic software and do not explicitly address forms of change characteristic of AI systems: implicit behavioural evolution, distributional shift in inference-time data, or output changes that are not linked to intentional code modification (Muralidharan et al. 2024).

Existing change management frameworks serve as control points for assessing the regulatory impact of deliberate modifications. They are not designed to capture AI-specific change types, nor to provide a real-time detection mechanism for gradual performance degradation occurring between planned review cycles (Hernandez-Boussard et al. 2021; Li et al. 2026). Several authors argue that without structured, repeatable change management processes tailored to AI, manufacturers are likely to adopt inconsistent or ad-hoc approaches, increasing safety risk and undermining regulatory traceability and accountability (Ardic and Dinc 2026; Muralidharan et al. 2024).

The synthesis of this literature reveals four operational gaps that the present work addresses in a working implementation: a **Governance Gap** (limited operational mechanisms for full-lifecycle management), a **Change Management Gap** (existing frameworks ill-suited to AI-specific implicit change), an **Operationalisation Gap** (high-level regulatory requirements lacking practical translation into day-to-day quality management activities), and a **Monitoring Gap** (post-market surveillance insufficient for gradual performance degradation detection). Each gap is addressed by a specific component of the reference architecture described in Section 3.

---

## 3. System Overview: CogAssess

### 3.1 Clinical Context and Regulatory Classification

CogAssess is a clinical decision support system for cognitive assessment through speech analysis. The system accepts spoken audio input from a patient performing structured verbal tasks and returns a multi-domain cognitive profile derived from features of the speech signal and transcribed language. Target use cases include initial cognitive screening, longitudinal monitoring, and referral support in neurological and psychiatric clinical settings.

Under the EU MDR, CogAssess functions as a Software as a Medical Device (SaMD), providing information to clinicians that may influence diagnostic and clinical management decisions. The software lifecycle has been structured according to IEC 62304 Class B requirements, reflecting a classification as a device whose failure could contribute to non-serious patient harm. This lifecycle designation establishes the change management obligations that the architecture described in Section 4 is designed to operationalise.

### 3.2 The Speech Biomarker Pipeline

The clinical output of CogAssess is produced by a five-stage inference pipeline applied to each speech sample. The pipeline is designed as a sequential series of independent analytical stages, with outputs from upstream stages available as inputs to downstream stages where appropriate. The stages are:

**Stage 1 — Speech-to-Text (STT):** Raw audio is converted to 16 kHz mono WAV format via FFmpeg and transcribed using the Google Cloud Speech-to-Text V2 API with the Chirp universal model. Stage outputs include the verbatim transcript and a per-utterance confidence score (0–1). The Chirp model was selected for its robustness to the recording conditions typical of clinical environments and its support for international English variants.

**Stage 2 — Acoustic Feature Extraction:** Acoustic features are derived from the audio signal using the librosa signal processing library. The feature set includes fundamental frequency statistics (mean, standard deviation, range), energy metrics, spectral centroid, zero-crossing rate, harmonic-to-noise ratio (HNR), and speech rate estimated from syllable detection. These features serve as the primary indicators of motor speech function, capturing articulatory fluency, prosodic regularity, and vocal quality.

**Stage 3 — Morphological Analysis:** The transcript is processed using spaCy (en_core_web_sm) for part-of-speech tagging and dependency parsing. Derived features include type-token ratio (a measure of lexical diversity), mean dependency distance, clause count, and noun/verb/adjective frequency distributions. These features contribute to the semantic memory and motor speech scoring domains.

**Stage 4 — Semantic Analysis:** Sentence-level embeddings are generated using the `sentence-transformers/all-mpnet-base-v2` model. Semantic coherence is estimated by computing pairwise cosine similarity across clause embeddings; semantic variability is derived from the standard deviation of inter-sentence similarity scores. These features serve as indicators of semantic memory and higher-level language organisation.

**Stage 5 — Emotion Analysis:** Emotional valence and arousal are estimated using the `j-hartmann/emotion-english-distilroberta-base` classifier, which produces probability distributions across seven emotion categories (anger, disgust, fear, joy, neutral, sadness, surprise). The primary outputs for clinical scoring are the neutral probability and the overall emotional affect profile.

Pipeline outputs are combined by a scoring function to produce five domain-level cognitive scores (composite, motor speech, semantic memory, episodic memory, emotional processing) each normalised to a 0–100 scale. The full pipeline output and all intermediate feature values are serialised as JSON and stored in the `task_results` database table, providing the longitudinal record required for drift baseline computation.

### 3.3 Technical Architecture

The system comprises a FastAPI (Python 3.11) REST API backend connected to a SQLite database via the SQLAlchemy ORM, and a React + Vite single-page application frontend. Authentication uses JWT bearer tokens. The database schema is managed through SQLAlchemy's declarative base, enabling automatic table creation on server start — a property that allows new monitoring tables to be introduced without a separate migration step.

The backend exposes two categories of endpoint: clinical endpoints (assessment submission, patient management, findings recording) and monitoring endpoints (performance KPIs, drift detection, change events). The monitoring endpoints introduced in the change management architecture are described in Section 4.

---

## 4. Change Management Architecture

The change management architecture comprises three integrated phases, each addressing a distinct aspect of the operational monitoring problem identified in Section 2. Together they form a pipeline from raw performance data through statistical change detection to formal change assessment workflow, implemented across eight new API endpoints, three new database tables, and a monitoring frontend page.

### 4.1 Phase 1: Pipeline Stage Instrumentation

The first phase addresses the Monitoring Gap by establishing continuous, automated measurement of system performance at the stage level. Prior to this phase, performance data for the CogAssess pipeline was not systematically recorded; the only observable performance signal was implicit in the composite cognitive scores written to the `task_results` table.

A `PipelineMetric` database table was introduced with the following schema:

```
pipeline_metrics(id, task_result_id FK, stage, duration_ms, recorded_at)
```

The `stage` field takes one of six values corresponding to the five pipeline stages and an aggregate total: `stt`, `acoustic`, `morphology`, `semantics`, `emotion`, `total`. Each successful task submission now creates six `PipelineMetric` rows, capturing the wall-clock duration of each stage in milliseconds. Timing is implemented using Python's `time.perf_counter()` at five boundary points within the pipeline execution, with the start-to-end total recorded independently.

A `GET /monitoring/performance` endpoint aggregates these records to return per-stage mean, minimum, and maximum latency, alongside composite score distribution statistics (mean, standard deviation, min, max) computed from all stored task results. This endpoint provides the data for the performance section of the monitoring dashboard and establishes the quantitative baseline against which future performance degradation can be identified.

The performance data also provides an indirect signal for hardware and infrastructure change: a sudden increase in STT stage latency, for example, may indicate network latency to the Google Chirp API, while an increase in acoustic or semantic stage latency may indicate changes in underlying model execution on the host system.

### 4.2 Phase 2: Data Drift Detection

The second phase addresses the Monitoring Gap more directly through automated covariate shift detection across 27 numerical features spanning all five pipeline stages and the five scoring domains.

**Feature extraction.** The `_extract_feature_vectors()` function traverses the JSON-serialised pipeline output stored for each task result and extracts a dictionary mapping feature paths (e.g., `acoustic.pitch_mean_hz`, `semantics.semantic_variability`) to lists of float values across the dataset window. Feature paths use a dot-separated notation that encodes stage (`stt`, `acoustic`, `morphology`, `semantics`, `emotion`) and feature name, enabling stage-level grouping in the monitoring interface.

**Baseline computation.** A `DriftBaseline` table stores the statistical summary of each feature computed from the full historical dataset:

```
drift_baselines(id, feature_path, stage, mean, std, p5, p25, p75, p95, n_samples, computed_at)
```

The `POST /monitoring/baseline/compute` endpoint recomputes the baseline from all available task results (minimum 5 required). For each feature, the mean, standard deviation (with Bessel's correction, ddof=1), and the 5th, 25th, 75th, and 95th percentiles are computed using NumPy. Baseline rows are replaced atomically on each recomputation. The baseline computation immediately triggers a drift check against the freshly computed baseline and surfaces any threshold breaches as `ChangeEvent` records.

**Drift detection.** The `_compute_drift()` helper function compares a rolling window of the most recent *n* task results (default: 20) against the stored baseline using four complementary metrics. This multi-metric approach provides a more robust and statistically defensible signal than any single metric, and accommodates the non-normal distributions characteristic of several speech biomarker features.

**(i) Z-score.** The standardised deviation of the window mean from the baseline mean:

$$z = \frac{|\bar{x}_{\text{window}} - \mu_{\text{baseline}}|}{\sigma_{\text{baseline}}}$$

Thresholds: stable (*z* < 1.5), watch (1.5 ≤ *z* < 2.5), drift (*z* ≥ 2.5). The z-score is sensitive to mean shift but insensitive to changes in distribution shape.

**(ii) Population Stability Index (PSI).** A bin-based distributional distance metric widely used in production ML monitoring (Siddiqi 2006). The baseline percentiles (p5, p25, p75, p95) define five bins with expected proportions [0.05, 0.20, 0.50, 0.20, 0.05]:

$$\text{PSI} = \sum_{i=1}^{5} (A_i - E_i) \cdot \ln\!\left(\frac{A_i}{E_i}\right)$$

where *A_i* is the actual proportion of window values in bin *i* and *E_i* is the expected proportion from the baseline. Thresholds follow industry convention: stable (PSI < 0.10), watch (0.10 ≤ PSI < 0.25), drift (PSI ≥ 0.25). PSI is distribution-free and detects shape changes that z-score misses.

**(iii) Two-sample Kolmogorov-Smirnov test.** The K-S statistic *D* is the maximum absolute difference between the empirical cumulative distribution functions of the baseline and window samples (computed using `scipy.stats.ks_2samp`). The raw baseline values are stored as a JSON array in `DriftBaseline.raw_values` to support this comparison. Thresholds: stable (*D* < 0.20), watch (0.20 ≤ *D* < 0.40), drift (*D* ≥ 0.40). The accompanying p-value is reported for engineering review but not used for threshold classification, as p-value interpretation is sensitive to sample size in this context.

**(iv) CUSUM (Cumulative Sum).** A sequential change-point detection statistic that accumulates standardised deviations over the ordered window, making it sensitive to gradual monotonic trends that single-window comparisons may not detect:

$$S_n^+ = \max(0,\; S_{n-1}^+ + z_n - k), \quad S_n^- = \max(0,\; S_{n-1}^- - z_n - k)$$

with allowable slack *k* = 0.5 standard deviations. The reported value is max(*S*⁺, *S*⁻) at the end of the window. Thresholds: stable (< 2.0), watch (2.0–5.0), drift (≥ 5.0), expressed in units of the baseline standard deviation.

In addition to these four metrics, two shape statistics are computed for each feature: window skewness and excess kurtosis, reported alongside their baseline counterparts to flag distributional shape change. For the emotion stage, Shannon entropy of the probability distribution across seven affect categories is computed per assessment and tracked as a synthetic feature (`emotion.entropy`; maximum 2.807 bits for seven equiprobable classes), providing a label-free indicator of model confidence stability.

The **overall status** assigned to each feature is the worst-case across all available metrics. This conservative design is intentional: in a clinical safety context, a false negative (failure to detect a real change) is more harmful than a false positive (triggering an unnecessary review).

This function is implemented as a plain Python helper rather than an endpoint, avoiding the anti-pattern of an endpoint directly invoking another endpoint via HTTP, which would bypass FastAPI's dependency injection machinery.

### 4.3 Three-Layer Change Notification and Acknowledgement

The third phase addresses the Change Management Gap by connecting statistical detection to a formal change assessment workflow. When the drift detection logic identifies that a feature's z-score exceeds a configured threshold, three co-ordinated notification events are triggered:

**Layer A — Dashboard badge.** The `GET /monitoring/alerts` endpoint returns a count of unresolved `ChangeEvent` records. The frontend `Header` component polls this endpoint on load and renders a red badge on the Monitoring navigation link when the count exceeds zero. This provides an immediate, ambient signal to any clinician or engineer accessing the system that open change events require attention, without requiring active navigation to the monitoring page.

**Layer B — Engineering change event log.** The `_append_change_event_log()` function appends a structured Markdown entry to `logs/change_events.md` for each new breach. Each entry records the UTC timestamp, feature label, breach type, severity, and the statistical detail (window mean, baseline mean, z-score, limits). This log file is intended for engineering review, version control integration, and as a persistent human-readable artefact that can be reviewed outside the application and retained under document control.

**Layer C — Database change event record.** The `ChangeEvent` table stores a formal record of each breach:

```
change_events(id, feature_path, breach_type, severity, detail JSON,
              status, reviewed_by_id FK, review_notes, opened_at, reviewed_at)
```

The `breach_type` field distinguishes between z-score breaches and absolute threshold violations (`threshold_min`, `threshold_max`) against the limits defined in the PCCP artefact. The `status` field implements a simple change assessment workflow: records are created with status `open`, and may transition to `reviewed` or `dismissed` by an authenticated clinician via the `PUT /monitoring/change-events/{id}/review` endpoint. The reviewing clinician's identity and review notes are recorded in the database, providing an auditable change management trail aligned with the traceability requirements of IEC 62304 §8 and ISO 13485 §8.2.1.

Deduplication is applied within the `_check_change_control_thresholds()` function: a new `ChangeEvent` row is created only if no open event already exists for the same feature and breach type, preventing repeated drift checks from generating duplicate records for the same underlying condition.

**Clinical performance thresholds.** A fourth class of change event is generated by the `GET /monitoring/performance/clinical` endpoint when sensitivity or specificity falls below a pre-specified minimum of 80%. These events use the same three-layer notification mechanism — dashboard badge, engineering log entry, and database record — and are subject to the same reviewed/dismissed workflow as data drift events. The `feature_path` values `clinical.sensitivity` and `clinical.specificity` are used to distinguish these events from pipeline feature drift events in the change events table and log. This design ensures that a decline in the system's clinical accuracy — the most safety-critical form of change in a clinical decision support device — is surfaced, attributed, and governed through exactly the same process as distributional changes in model inputs. The 80% threshold is pre-specified in the architecture rather than user-configurable, reflecting clinical convention; future work may incorporate this threshold into the `change_control.json` PCCP artefact to subject it to the same version governance as pipeline feature thresholds.

---

## 5. The PCCP as a Software Artefact

A central contribution of this architecture is the expression of the Predetermined Change Control Plan as a versioned, machine-readable software configuration file (`change_control.json`), rather than as a standalone regulatory document. This approach operationalises the PCCP requirement in two ways: it makes the thresholds that define permissible performance boundaries directly executable by the monitoring system, and it subjects those thresholds to the same version control and change governance processes as any other software configuration.

The file defines thresholds at two levels. Global thresholds apply to all features unless overridden:

```json
"global": {
  "z_score_watch": 1.5,
  "z_score_critical": 2.5
}
```

Feature-level entries provide tighter thresholds for clinically sensitive features and, where clinically justified, absolute bounds on the feature mean:

```json
"scores.composite": {
  "label": "Composite cognitive score",
  "z_score_critical": 2.0,
  "min_mean": 30,
  "max_mean": 95
}
```

The `min_mean` and `max_mean` fields encode range-based validity constraints: if the rolling window mean for the composite score falls below 30 or exceeds 95, a `threshold_min` or `threshold_max` `ChangeEvent` is raised regardless of z-score. These absolute bounds provide a safety net against distributional drift so severe that the z-score metric itself becomes unreliable — a scenario that can arise when the baseline and window populations are drawn from very different demographic or clinical contexts.

The file is loaded once at server startup into an in-memory variable, eliminating per-request I/O and ensuring that threshold changes take effect only on server restart — a deliberate choice that aligns threshold changes with the formal release management process rather than allowing live edits to alter system behaviour without a documented deployment event.

From a regulatory standpoint, the `change_control.json` file functions as a controlled document: modifications to thresholds require a clinical validation review (documented in the file's inline comment), a change assessment under the IEC 62304 §8 maintenance process, and a version-controlled commit to the system repository. This file therefore bridges the regulatory PCCP concept and the engineering implementation in a concrete, auditable form.

---

## 6. Implementation Results

### 6.1 Monitoring Endpoint Coverage

The change management architecture introduces eight new monitoring endpoints to the CogAssess API:

| Endpoint | Method | Purpose |
|---|---|---|
| `/monitoring/performance` | GET | Per-stage latency KPIs and score distributions |
| `/monitoring/baseline/compute` | POST | Compute or recompute drift baseline |
| `/monitoring/drift` | GET | Multi-metric drift analysis against baseline |
| `/monitoring/alerts` | GET | Count of open change events (header badge) |
| `/monitoring/change-events` | GET | Full list of change events with status |
| `/monitoring/change-events/{id}/review` | PUT | Mark event reviewed or dismissed |
| `/monitoring/performance/clinical` | GET | Sensitivity, specificity, F1, AUC-ROC |
| `/assessments/{key}/clinical-label` | PUT | Record clinician-confirmed outcome label |

All endpoints require JWT authentication, ensuring monitoring data and change event actions are attributed to an authenticated clinician identity.

### 6.2 Feature Coverage and Baseline Population

The baseline computation covers 27 numerical features distributed across the five pipeline stages and the scoring domain, plus one derived feature:

- **STT (1):** transcript words per minute
- **Acoustic (10):** pitch mean/std/range Hz, energy mean/std, spectral centroid, zero-crossing rate, HNR, speech rate, duration seconds
- **Morphology (7):** word count, type-token ratio, mean dependency distance, clause count, noun/verb/adjective ratios
- **Semantics (4):** semantic coherence, semantic variability, semantic granularity, high-frequency word ratio
- **Emotion (7 + 1 derived):** probabilities for all seven affect categories (anger, disgust, fear, joy, neutral, sadness, surprise); plus Shannon entropy of the affect distribution as a synthetic feature
- **Scores (5):** composite, motor speech, semantic memory, episodic memory, emotional processing

The baseline requires a minimum of five completed task result records. With 13 historical assessments available at implementation time, the baseline was computed from a population of *n* = 13. Score distribution statistics showed a composite mean of 71.1 (SD 6.8, range 54.2–82.3), consistent with a mixed clinical population including both healthy controls and individuals with mild-to-moderate cognitive impairment.

### 6.3 Drift Metrics and Clinical Performance

The `DriftBaseline` row for each feature now stores the full statistical summary required by all four drift metrics: mean, standard deviation, five percentiles (p5, p25, p75, p95), skewness, excess kurtosis, and the raw value array (for K-S test). On initial baseline computation against the 13-record cohort, all four metrics returned *stable* or *watch* ratings, with no features reaching *drift* status. No `ChangeEvent` records were created, confirming correct system behaviour with a small but internally consistent dataset.

The `GET /monitoring/performance/clinical` endpoint requires clinician-confirmed outcome labels recorded via `PUT /assessments/{key}/clinical-label`. Labels accept four values: `normal`, `mci`, `dementia`, or `other`. Rather than requiring manual API calls, outcome labels are recorded through a dedicated section — "Confirmed diagnosis" — embedded in the existing Clinical Findings workflow page, presenting four radio-card options. This design ensures that ground-truth data accumulates as a natural by-product of routine clinical documentation rather than as a separate, parallel data collection obligation. The endpoint applies a binary classification boundary (composite score ≥ 65 → predicted normal; < 65 → predicted impaired) and computes sensitivity, specificity, positive predictive value (PPV), negative predictive value (NPV), F1 score, and AUC-ROC using scikit-learn. A minimum of ten labelled assessments with at least one case from each class is required; the endpoint returns a structured `insufficient_labels` response until this threshold is met. When sensitivity or specificity falls below 80%, a `ChangeEvent` record is created automatically with severity `critical`, and the endpoint response includes a `new_change_events` field that triggers the frontend to reload the change events list without a manual page refresh, ensuring the governance signal is visible immediately.

PSI computation is suppressed for features whose baseline was computed from fewer than 20 task results, or where the feature distribution is effectively constant (degenerate percentile bins). This guard prevents the well-documented small-sample instability of PSI — where degenerate bin boundaries produce artificially extreme distributional distance values — from generating spurious drift alerts during the early deployment phase. The monitoring dashboard displays an explicit low-sample warning when the baseline record count falls below this threshold, explaining to the clinical user why PSI values are absent and what action is required.

The frontend monitoring dashboard presents all metrics in a horizontally scrollable per-stage table showing: baseline μ ± σ, window mean, z-score, PSI, K-S statistic (with p-value on hover), CUSUM, and an overall worst-case status badge. Each column header includes an interactive help control that expands a plain-language explanation of the metric, its thresholds, and its clinical interpretation — designed to make the dashboard interpretable by a clinical reviewer without statistical expertise. A clinical performance panel below the drift section displays the six classification metrics in a tile layout once sufficient labelled data is available. The window size indicator distinguishes between individual task recordings and the number of distinct clinical sessions they represent, providing clinically meaningful context for the sample count.

### 6.4 The Regulatory Feedback Loop

The combination of components described in Sections 4–6 produces an architectural pattern not commonly documented in the AIeMD literature: a complete, closed regulatory feedback loop between deployment monitoring and governance action. The five elements of this loop, and the artefacts that implement each, are as follows:

**1. Pre-specified change boundaries.** The `change_control.json` PCCP artefact defines, before deployment, the conditions under which change becomes a governance matter rather than normal operational variation. Boundaries are expressed both as z-score thresholds (applicable to all features) and as absolute clinical performance floors (sensitivity and specificity ≥ 80%). These are the conditions the deploying organisation has committed to maintain; breaching them triggers a formal review obligation.

**2. Continuous distributional monitoring.** The four-metric drift detection suite (z-score, PSI, K-S, CUSUM) monitors every completed task recording against the baseline, detecting changes in pipeline input characteristics that may precede visible changes in clinical output quality. This layer addresses data drift — changes in the statistical properties of what the model receives — without requiring any ground-truth labels.

**3. Ground-truth feedback.** The Clinical Findings workflow integration allows clinicians to record their confirmed diagnosis for each assessment as a routine documentation step. This transforms the clinical application from a one-way scoring tool into a learning feedback loop: confirmed diagnoses accumulate passively, enabling the system to compare its predictions against clinical ground truth over time.

**4. Automated performance gates.** When sufficient labelled data is available, the clinical performance endpoint computes sensitivity and specificity. Falling below 80% on either metric triggers a `ChangeEvent` with severity `critical` — the same governance record as a pipeline drift breach. This operationalises the concept drift detection requirement that data drift metrics alone cannot address: a model whose inputs are stable but whose clinical accuracy has declined will pass the distributional checks but fail the performance gate.

**5. Auditable governance trail.** Every breach — whether distributional or performance-based — is attributed, timestamped, logged to a human-readable audit file, and held as a database record requiring named clinician acknowledgement before closure. This trail is the artefact through which regulators, quality reviewers, and clinical governance bodies can verify that the monitoring system is functioning as declared in the PCCP.

To the authors' knowledge, most commercially deployed AI medical device systems implement element 2 in some form. Elements 1 and 5 are present where a formal PCCP has been submitted. Elements 3 and 4 — ground-truth feedback integrated into clinical workflow and automated performance gates generating governed change events — are rarely implemented in practice, and their absence is precisely the gap that allows concept drift to go undetected. The present architecture demonstrates that all five elements can be implemented cohesively within a single SaMD codebase at a scale accessible to small development teams, and that their integration creates governance properties that none of the five elements achieves individually.

---

## 7. Discussion

### 7.1 Addressing the Four Operational Gaps

The architecture presented directly addresses each of the four operational gaps identified in Section 2.4.

The **Governance Gap** — the absence of operational mechanisms for full-lifecycle management — is addressed by the systematic recording of per-stage performance metrics across every task submission, and by the audit trail created in the `ChangeEvent` table and the engineering log. These records provide the empirical basis for ongoing governance decisions and can be surfaced in periodic reviews without requiring manual data collection. The addition of automated clinical performance threshold events means that governance is triggered not only by distributional changes in model inputs but by verified clinical accuracy decline — the most direct governance concern for a clinical decision support device.

The **Change Management Gap** — the inadequacy of deterministic change frameworks for AI-specific implicit change — is addressed by the drift detection layer, which captures distributional shifts in model input characteristics that do not arise from deliberate software modification. The multi-metric approach provides statistically principled signals that can be reviewed in the context of IEC 62304 §8 change assessment. The integration of clinical performance gates extends this to concept drift: a change in the model's relationship to clinical ground truth, not merely in its input distribution, is now a first-class change management event.

The **Operationalisation Gap** — the absence of practical mechanisms translating regulatory requirements into day-to-day quality management — is addressed most directly by the `change_control.json` artefact, which renders the PCCP as executable configuration. The thresholds in this file are not aspirational documentation; they are enforced at runtime and produce auditable records when breached. This closes the loop between the regulatory requirement and the operational practice in a way that a standalone PCCP document cannot. The integration of confirmed diagnosis recording into the clinical findings workflow — making ground-truth labelling a natural documentation step rather than a separate obligation — further operationalises the continuous monitoring requirement at the point of clinical practice.

The **Monitoring Gap** — the insufficiency of reactive post-market surveillance for gradual AI performance degradation — is addressed by the automated, continuous nature of both the drift detection and the clinical performance evaluation processes. Because drift is computed against a rolling window of recent assessments, performance trends are visible before they accumulate into a pattern detectable by conventional adverse event mechanisms. The clinical performance gate closes the residual gap left by data-drift-only monitoring: a model may pass all four distributional checks while its predictive accuracy has degraded — a scenario detected by the sensitivity and specificity thresholds but not by the z-score, PSI, K-S, or CUSUM metrics. The ambient dashboard badge ensures that an engineer or clinician does not need to actively seek out the monitoring page to become aware of an emerging issue of either type.

### 7.2 Relationship to IEC 62304 §8

IEC 62304 §8 defines four activities in the software maintenance process: the software problem and modification analysis, the modification implementation, the software release, and the software configuration management record update. The change management architecture maps onto these activities as follows. The `ChangeEvent` record and the engineering log provide the artefact for problem analysis (§8.2.2). The `status` workflow — open, reviewed, dismissed — provides a minimal implementation of the modification decision record (§8.2.3). Threshold modifications to `change_control.json` with their accompanying commit history provide the configuration management record (§8.3). The architecture does not implement a full software release workflow; this remains the responsibility of the organisation's broader QMS.

### 7.3 Limitations

Several limitations of the current implementation should be acknowledged. First, the baseline is computed from the full historical dataset rather than a clinically validated reference population. In production use, the baseline should be established from a representative, characterised cohort before deployment, and recomputation should be a controlled event requiring documented justification rather than an on-demand user action.

Second, the multi-metric approach introduces the possibility of conflicting signals: z-score may indicate *stable* while CUSUM indicates *watch*, for example. The current implementation resolves this conservatively by taking the worst-case across all metrics. Future work could weight metrics by their sensitivity properties — CUSUM is most informative for gradual trend detection; K-S is most informative for sudden distributional shift — to provide a more nuanced composite signal rather than a simple maximum.

Third, the binary classification threshold for the clinical performance endpoint (composite score ≥ 65 → normal) is a heuristic boundary not validated against a labelled reference population. Sensitivity and specificity values derived from this threshold should be treated as indicative until the threshold is calibrated against confirmed clinical diagnoses from a representative sample. Consequently, the 80% performance gate — while appropriate as an architectural construct — will not produce clinically meaningful change events until this calibration is completed. AUC-ROC, which is threshold-independent, provides the most stable clinical performance indicator at this stage and is reported alongside the threshold-dependent metrics for this reason.

Fourth, the window size of 20 recent assessments is a fixed parameter that may not be optimal across all deployment contexts. In low-volume clinical settings, a window of 20 may represent several months of data and thus be insensitive to relatively rapid change; in higher-volume settings, the same window may be populated within a week. Adaptive or time-bounded windows should be considered for future implementation.

Fifth, PSI bin boundaries are derived from baseline percentiles, which means that a small or non-representative baseline produces degenerate bins and artificially extreme distributional distance values. The current implementation mitigates this through a minimum sample guard (PSI is suppressed when baseline n < 20 or when the feature range across percentile boundaries is effectively zero), but this guard introduces a monitoring blind spot during the early deployment phase before sufficient baseline data has accumulated. The guard is surfaced to users through a dashboard warning rather than silently producing null values.

### 7.4 Future Work

The natural extensions to this architecture fall into three areas. **Metric refinement:** Maximum Mean Discrepancy (MMD) and Jensen-Shannon Divergence are strong candidates for addition to the drift metric suite, particularly for the emotion stage where features are probability distributions rather than continuous scalars. Weighted composite drift scores — combining z-score, PSI, K-S, and CUSUM in proportion to their statistical power under different drift patterns — would provide a more principled single signal for change event triggering.

**Clinical performance calibration:** As labelled assessment data accumulates, the binary classification threshold (currently set at composite ≥ 65) should be calibrated using ROC analysis against confirmed diagnoses, and a Youden-optimal threshold adopted. Longitudinal AUC tracking — plotting AUC over successive time windows — would operationalise the concept drift detection requirement that the current four data-drift metrics cannot address.

**Regulatory and QMS integration:** Connection of the change event workflow to an external quality management system (e.g. via webhook) would enable automatic creation of non-conformance records when drift thresholds are breached. The `change_control.json` artefact also offers a foundation for automated regulatory submission support: a manufacturer preparing a PCCP under FDA 2024 or MDCG-2025-6 guidance could generate a structured submission document directly from the file, with threshold values, feature coverage, and monitoring methodology automatically populated.

---

## 8. Conclusion

This paper has presented a reference architecture for proactive AI change management in a deployed clinical decision support system, demonstrating how the Predetermined Change Control Plan concept can be operationalised as a working software implementation rather than a regulatory document. The three-phase architecture — pipeline instrumentation, drift detection, and change notification — addresses four operational governance gaps identified in the AIeMD literature and provides a concrete model for other SaMD developers seeking to implement the monitoring and change assessment capabilities required by emerging regulatory frameworks.

The central technical contribution is the treatment of the PCCP not as a standalone compliance document but as a machine-readable, version-controlled software configuration artefact that is directly executable by the monitoring system and subject to the same governance controls as any other software component. This approach renders the regulatory intent operationally meaningful: threshold breaches are detected automatically, attributed to identifiable features, logged for engineering review, and routed to a formal acknowledgement workflow — all without manual intervention.

A second, equally significant contribution is the demonstration of a complete regulatory feedback loop — five integrated elements that together achieve a monitoring capability qualitatively beyond what any single element delivers. Pre-specified change boundaries establish the governance contract before deployment. Continuous distributional monitoring detects data drift without requiring ground-truth labels. Ground-truth feedback, embedded in the clinical documentation workflow, accumulates confirmed diagnoses as a natural by-product of clinical practice. Automated performance gates translate accumulated ground truth into governed change events when clinical accuracy falls below threshold — addressing concept drift in a way that data-only monitoring cannot. An auditable governance trail closes the loop by ensuring every breach is attributed, acknowledged, and resolvable. The literature consistently demonstrates that most deployed AI medical devices implement only the first two of these elements. The present architecture shows that all five are achievable in a single IEC 62304-compliant codebase accessible to a small development team, and that their integration creates safety properties — particularly the detection of clinical accuracy decline — that distributional monitoring alone cannot provide.

The implementation demonstrates that IEC 62304-compliant change management and proactive AI drift monitoring are not architecturally incompatible but naturally complementary; the maintenance process activities required by §8 provide exactly the governance structure within which automated drift detection events should be assessed and resolved. As the AIeMD regulatory landscape continues to evolve toward continuous oversight requirements — with the FDA's PCCP guidance and MDCG-2025-6 both emphasising lifecycle monitoring as a regulatory expectation — reference implementations of this kind have a role to play in translating regulatory ambition into engineering practice.

The full implementation is available as part of the CogAssess open repository to support reproducibility, adaptation, and further development by the research and clinical AI engineering communities.

---

## Conflict of Interest Statement

The author declares no conflicts of interest.

## Funding

*[To be completed — include DkIT / any grant references.]*

## Data Availability Statement

The system implementation described in this paper is available at *[repository URL to be added]*. No patient data are shared.

---

## References

*[To be populated from Chapter 2 bibliography. Key references used in this draft:]*

- Abdul et al. 2022
- Ardic and Dinc 2026
- Badnjević et al. 2022
- Bayram et al. 2022
- Canada et al. 2011
- Carvalho et al. 2025
- Cutillo et al. 2020
- Davis et al. 2019; 2020
- Dhunnoo 2022
- DuPreez and McDermott 2025
- EU AI Act 2021
- FDA 2024 (PCCP guidance)
- Gilbert et al. 2021
- Guan et al. 2025
- Harrison et al. 2021
- Hernandez-Boussard et al. 2021
- IEC 62304:2006/AMD1:2015
- ISO 13485:2016
- ISO/IEC/DIS-42105 2025
- ISO/TR-20416 2020
- Klie et al. 2023
- Kramer et al. 2012
- Li et al. 2026
- Martínez et al. 2023
- Mashar et al. 2023
- MDCG 2020-3 2020
- MDCG-2025-6 2025
- MDCG-2025-10 2025
- Mohajer-Bastami et al. 2025
- Muralidharan et al. 2024
- Olawade et al. 2024
- Phillips and Klein 2023
- Sweeney et al. 2023
- Vanneste et al. 2023
- Vela et al. 2022
