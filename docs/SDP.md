# Software Development Plan

**Document ID:** CA-SDP-001  
**Product:** CogAssess — Speech Biomarker Assessment Platform  
**Version:** 1.0  
**Date:** 2026-06-05  
**Status:** Draft  
**Prepared by:** St John Lynch & Co. Ltd / MemoryTell Ltd  
**IEC 62304 Safety Class:** Class B  

---

## Document Control

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1 | 2026-05-01 | Development Team | Initial draft |
| 1.0 | 2026-06-05 | Development Team | First complete release |

---

## Table of Contents

1. Introduction  
2. Development Lifecycle Model  
3. Roles and Responsibilities  
4. Development Tools and Environments  
5. Coding Standards  
6. Configuration Management  
7. Document Management  
8. Problem Resolution Process  
9. Risk Management Integration  
10. Software Safety Activities  
11. Release Criteria  
12. Maintenance and Updates  
13. Referenced Documents  

---

## 1. Introduction

### 1.1 Purpose

This Software Development Plan (SDP) defines the processes, methods, tools, and responsibilities governing the development of the CogAssess software system. It is produced in accordance with IEC 62304:2006+AMD1:2015 (Medical device software — Software life cycle processes), specifically §5.1 (Software Development Planning), for a Class B medical device software system.

This document provides a unified reference for all development activities. It ensures that the CogAssess software is developed in a controlled, auditable, and reproducible manner appropriate to its intended clinical use and regulatory classification.

### 1.2 Scope

This plan applies to all software development activities for CogAssess from initial design through to formal release. It covers the backend (Python/FastAPI), frontend (React 18 SPA), and the integrated speech analysis pipeline. It applies to version 0.5.0-beta and all subsequent versions within the 0.x development series.

Activities governed by this plan include:

- Requirements analysis and management
- Architectural and detailed design
- Implementation (coding)
- Unit, integration, and system verification
- Risk-related software activities
- Configuration and change management
- Document management
- Release and post-release maintenance

Activities explicitly out of scope include clinical validation (i.e. demonstrating clinical utility in patient populations), hardware qualification, and regulatory submission preparation — these are managed separately under the MemoryTell Ltd Quality Management System.

### 1.3 Relationship to Other Plans

This SDP is the top-level planning document for the CogAssess software lifecycle. It references and depends on the companion documents listed in Section 13. Where any conflict exists between this document and a companion document, the more specific companion document takes precedence for its subject area.

### 1.4 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|-----------|
| SDLC | Software Development Lifecycle |
| SDP | Software Development Plan (this document) |
| SRS | Software Requirements Specification |
| SAD | Software Architecture Document |
| SVP | Software Verification Plan |
| RMF | Risk Management File |
| SOUP | Software of Unknown Provenance |
| SRR | Software Release Record |
| SEC | Security Risk Assessment |
| PR | Pull Request |
| CI | Continuous Integration |
| QA | Quality Assurance |
| PEP 8 | Python Enhancement Proposal 8 — Python style guide |
| LTS | Long-Term Support |

---

## 2. Development Lifecycle Model

### 2.1 Selected Model

CogAssess is developed using an **iterative and incremental lifecycle model**. This model is chosen because it allows clinical requirements to be refined progressively as understanding of the clinical domain deepens, while still providing formal verification gates before each release increment.

The model is not purely agile in the sense of continuous deployment. Instead, development proceeds in defined increments (phases), each of which concludes with a formal gate review before proceeding to the next. This hybrid approach satisfies the auditability requirements of IEC 62304 while retaining the flexibility appropriate to a novel clinical software product at an early stage of commercialisation.

### 2.2 Development Phases

Each increment of the CogAssess software passes through the following ordered phases:

| Phase | Activities | IEC 62304 Reference |
|-------|-----------|---------------------|
| **Planning** | Scope increment, update SDP, assign tasks | §5.1 |
| **Requirements** | Review/update SRS, capture new requirements, update traceability matrix | §5.2 |
| **Architecture and Design** | Update SAD, define/refine software item interfaces | §5.3, §5.4 |
| **Implementation** | Write code per coding standards, code review via PR | §5.5 |
| **Unit Verification** | Execute unit tests per SVP, document results | §5.6 |
| **Integration Verification** | Integration tests per SVP, document results | §5.6 |
| **System Verification** | System-level tests per SVP, document results | §5.6, §5.7 |
| **Risk Review** | Review RMF for new or changed risks, confirm risk controls implemented | §7 (ISO 14971) |
| **Gate Review** | QA and Clinical Adviser sign-off; all release criteria evaluated | §5.8 |
| **Release** | Update SRR, tag version in Git, archive SDLC documents | §5.8 |

No phase may be formally closed until its documented exit criteria are met. Exit criteria for each phase are defined in the relevant companion document (SVP for verification phases, RMF for risk review, this SDP for the gate review).

### 2.3 Formal Verification Gates

A formal verification gate is held before any software increment is released to clinical users or external evaluators. The gate requires:

1. All requirements targeted for the increment are implemented and individually verified.
2. All verification activities planned in the SVP for the increment are complete and their results recorded.
3. The RMF has been reviewed and no new unmitigated risks remain open.
4. All Critical and Major defects logged in GitHub Issues are resolved and closed.
5. The SRR has been updated to reflect the new version.
6. At least one QA review and one Clinical Adviser review have been completed and documented.

Gate reviews are recorded as a dated, signed document stored in the `docs/` folder with the naming convention `GR-vX.X.X.md`.

### 2.4 Branching Strategy

Development work is carried out on feature branches branched from `main`. No direct commits to `main` are permitted. All changes to `main` pass through a Pull Request (PR) with at least one review approval. Branch names follow the convention:

```
feature/<short-description>
fix/<issue-id>-<short-description>
release/v<MAJOR.MINOR.PATCH>
```

---

## 3. Roles and Responsibilities

### 3.1 Defined Roles

The following roles are defined for the CogAssess SDLC. A single individual may hold more than one role; where this occurs it must be documented in the project's personnel register and any conflicts of interest noted.

| Role | Responsibilities |
|------|----------------|
| **Development Lead** | Overall technical direction; architectural decisions; final code review approval; release tagging |
| **Developer** | Implementation of requirements; unit test authorship; code review participation; defect resolution |
| **QA Reviewer** | Review of SDLC documents; verification of test results; defect triage; gate review participation |
| **Clinical Adviser** | Review of clinical requirements and safety requirements; clinical plausibility of outputs; gate review sign-off |
| **Document Controller** | Maintenance of document version history; archival of approved documents; change control log |

### 3.2 Responsibilities by SDLC Phase

| Phase | Development Lead | Developer | QA Reviewer | Clinical Adviser |
|-------|-----------------|-----------|-------------|-----------------|
| Planning | Approve | Contribute | Review | Consult |
| Requirements | Approve | Author | Review | Approve |
| Architecture | Approve | Author | Review | Consult |
| Implementation | Review/Approve | Author | — | — |
| Unit Verification | Review | Execute | Spot-check | — |
| Integration Verification | Review | Execute | Review | — |
| System Verification | Review | Execute | Approve | Review |
| Risk Review | Participate | Contribute | Review | Approve |
| Gate Review | Chair | Participate | Approve | Approve |
| Release | Execute | Support | Sign-off | Sign-off |

### 3.3 Training and Competency

All personnel performing SDLC activities must have documented competency relevant to their role. For development activities this includes familiarity with:

- IEC 62304 requirements for Class B software
- The CogAssess codebase and architecture (documented in CA-SAD-001)
- The branching and PR workflow described in Section 2.4
- This SDP and the companion documents listed in Section 13

Competency records are maintained by the Document Controller and reviewed annually or when a new role is assigned.

---

## 4. Development Tools and Environments

### 4.1 Purpose

Tools used in the development of medical device software must be identified and, where appropriate, validated. This section lists all tools used in the CogAssess SDLC, their versions, and their role in the process.

### 4.2 Tool Register

| Tool | Version | Role | Validation Status |
|------|---------|------|-------------------|
| Python | 3.10 – 3.13 | Backend runtime language | Qualified — widely deployed; version-pinned in `requirements.txt` |
| Node.js | 18 LTS | Frontend build runtime | Qualified — LTS release; version specified in `package.json` engines field |
| Vite | 4.x | Frontend build tool (bundler/dev server) | Qualified — deterministic build output verified |
| Git | 2.x (latest) | Source code version control | Qualified — industry standard SCM |
| GitHub | N/A (SaaS) | Remote repository, PR workflow, issue tracking | Accepted — hosted service; access controlled via personal access tokens |
| Visual Studio Code | Latest stable | Primary IDE | Not validated — used for authoring only; does not participate in build or test artefact generation |
| pandoc | 3.x | SDLC document conversion (Markdown to DOCX/PDF) | Not validated — used for document rendering only |
| pytest | 8.x (planned) | Automated unit and integration testing | Qualified — results reviewed manually before gate close |
| SQLite Browser | 3.x | Database inspection and schema verification | Not validated — used for ad hoc inspection only |
| pip / pip-tools | Latest | Python dependency management | Qualified — `requirements.txt` pinned and version-controlled |
| npm | Bundled with Node.js | JavaScript dependency management | Qualified — `package-lock.json` version-controlled |

### 4.3 Tool Version Control

All tool versions used for a given release are recorded in the SRR (CA-SRR-001) at the time of release. This ensures that the exact tool environment for any release can be reconstructed if required for defect investigation or re-verification.

### 4.4 Development and Test Environments

| Environment | Description | Used For |
|-------------|-------------|----------|
| Developer Workstation | Windows 11 / Python venv / Node.js | Development, unit testing, manual testing |
| Verification Environment | Controlled copy of workstation configuration, clean database | All formal SVP test execution |
| Test Database | Separate SQLite file populated with synthetic test data | Integration and system testing |

No production patient data is used in any development or test environment.

---

## 5. Coding Standards

### 5.1 Purpose

Consistent coding standards improve maintainability, reduce defect introduction, and facilitate code review. Adherence to these standards is a mandatory exit criterion for the Implementation phase.

### 5.2 Python — PEP 8

All Python source code (backend, pipeline, utilities) must conform to PEP 8 (Python Enhancement Proposal 8: Style Guide for Python Code). Key requirements include:

| Rule | Specification |
|------|--------------|
| Indentation | 4 spaces; no tabs |
| Maximum line length | 99 characters (relaxed from PEP 8 default of 79 to accommodate FastAPI route definitions) |
| Naming conventions | `snake_case` for variables and functions; `PascalCase` for classes; `UPPER_SNAKE_CASE` for module-level constants |
| Imports | Grouped: stdlib, then third-party, then local; alphabetical within groups |
| Docstrings | All public functions and classes must have docstrings (Google style) |
| Type hints | All function signatures must carry type hints for parameters and return values |

In addition to PEP 8, the following project-specific rules apply:

- FastAPI route handlers must not contain business logic; business logic belongs in service or utility modules.
- All database access must go through the SQLAlchemy ORM layer (`database.py`); raw SQL is prohibited except in documented migration scripts.
- No secrets, credentials, or API keys may appear in source code; all such values must be loaded from environment variables.
- All pipeline stages must return a typed result object or raise a defined exception; silent failures are prohibited.

### 5.3 JavaScript / React — Airbnb Style Guide

All JavaScript and JSX source code (React frontend) must conform to the Airbnb JavaScript Style Guide. Key requirements include:

| Rule | Specification |
|------|--------------|
| Indentation | 2 spaces |
| Quotes | Single quotes for strings; double quotes for JSX attributes |
| Semicolons | Required |
| Component naming | PascalCase for React components |
| Hooks | All custom hooks must be prefixed with `use` |
| PropTypes or TypeScript | All component props must be documented with PropTypes |
| No `var` | Use `const` by default; `let` only when mutation is required |
| Arrow functions | Preferred for component definitions and callbacks |

### 5.4 Security Coding Rules (all languages)

These rules apply in addition to the language-specific standards above:

1. All user-supplied input must be validated before use (type, length, permitted characters).
2. Authentication must be verified on every API endpoint; no endpoint may be open by default.
3. Passwords must never be stored in plaintext; bcrypt hashing via passlib is mandatory.
4. JWT tokens must be signed with HS256 minimum; the signing key must be loaded from an environment variable.
5. Temporary files (including audio files) must be deleted immediately after use.
6. No patient identifiers (name, DOB, NHS/patient number) may be transmitted to any external service.

### 5.5 Code Review

Every code change to the `main` branch requires a Pull Request with at least one reviewer approval before merging. Reviewers must confirm:

- The code conforms to the relevant coding standard (Section 5.2 or 5.3).
- The security coding rules in Section 5.4 are satisfied.
- Any new or changed requirements are reflected in the traceability matrix.
- Unit tests have been authored or updated for the changed code.
- No new SOUP has been introduced without updating CA-SOUP-001.

---

## 6. Configuration Management

### 6.1 Version Control System

All source code, SDLC documents, and configuration files are managed using **Git** with a remote repository hosted on **GitHub** (organisation: `niamh888`, repository: `CogAssess`). Git is the single source of truth for all versioned artefacts.

### 6.2 Semantic Versioning

CogAssess versions follow **Semantic Versioning 2.0.0** (semver.org):

```
MAJOR.MINOR.PATCH[-stage]
```

| Component | Increment trigger |
|-----------|-----------------|
| MAJOR | Incompatible API changes or significant clinical feature changes requiring re-validation |
| MINOR | New features that are backward-compatible |
| PATCH | Bug fixes and minor improvements |
| stage | Pre-release qualifier: `alpha`, `beta`, `rc1`, etc. |

Examples: `0.5.0-beta`, `0.5.1`, `1.0.0-rc1`, `1.0.0`

The version string appears in:
- `main.py` (backend `version` field in the OpenAPI schema)
- `package.json` (frontend)
- The SRR (CA-SRR-001) at release time

### 6.3 Branch Protection

The `main` branch is protected on GitHub with the following rules:

| Rule | Setting |
|------|---------|
| Direct pushes to `main` | Prohibited |
| Require PR before merging | Enabled; minimum 1 approval required |
| Dismiss stale PR approvals on new commit | Enabled |
| Require status checks to pass | Enabled (when CI is configured) |
| Require linear history | Recommended (squash or rebase merge) |

### 6.4 Tagging and Release Artefacts

At each formal release:

1. The release branch is merged to `main` via PR.
2. A Git tag is created on the merge commit: `git tag -a v<VERSION> -m "Release v<VERSION>"`.
3. A GitHub Release is created, linked to the tag, with the SRR attached as a release asset.
4. A snapshot of all SDLC documents in `docs/` is archived as a zip file and attached to the GitHub Release.

### 6.5 Dependency Pinning

| File | Purpose | Policy |
|------|---------|--------|
| `requirements.txt` | Python dependencies | All packages pinned to exact version (`==`); updated only via deliberate upgrade task |
| `package-lock.json` | JavaScript dependencies | Committed to version control; `npm ci` used in verification environments |

Dependency upgrades are treated as code changes and require a PR, code review, and re-execution of affected verification tests.

### 6.6 Prohibited Items in Version Control

The following must not be committed to the Git repository:

- `.env` files or any file containing secrets, API keys, or credentials
- SQLite database files containing patient data (`.db` files are excluded via `.gitignore`)
- Compiled artefacts (`__pycache__`, `dist/`, `build/`, `.venv/`)
- Audio recordings

A `.gitignore` file enforcing these exclusions is maintained at the repository root.

---

## 7. Document Management

### 7.1 Document Storage

All SDLC documents are stored as Markdown (`.md`) files in the `docs/` folder at the repository root. This places documents under the same version control as the source code, ensuring that the document state at any release can be reconstructed from the Git history.

Human-readable rendered copies (`.docx` or `.pdf`) may be generated from Markdown source using pandoc and distributed for review, but the Markdown source in `docs/` is the authoritative version.

### 7.2 Document Naming and Identification

| Document | ID | Filename |
|----------|----|----------|
| Software Development Plan | CA-SDP-001 | `docs/SDP.md` |
| Software Requirements Specification | CA-SRS-001 | `docs/SRS.md` |
| Software Architecture Document | CA-SAD-001 | `docs/SAD.md` |
| Software Verification Plan | CA-SVP-001 | `docs/SVP.md` |
| Risk Management File | CA-RMF-001 | `docs/RMF.md` |
| SOUP List | CA-SOUP-001 | `docs/SOUP.md` |
| Software Release Record | CA-SRR-001 | `docs/SRR.md` |
| Security Risk Assessment | CA-SEC-001 | `docs/SEC.md` |

### 7.3 Document Version Control

All documents carry a Document Control table (as shown at the top of this document) recording version, date, author, and description of changes. Every substantive change to a document increments the document version and adds a row to this table.

### 7.4 Document Approval

Documents are approved by the roles specified in Section 3.2. Approval is recorded by adding the approver's name, role, and date to the document's approval section prior to committing the approved version to Git. Draft documents carry the status "Draft"; reviewed documents carry "Under Review"; approved documents carry "Approved".

### 7.5 Change Control for Documents

Changes to approved SDLC documents are controlled through the same PR workflow as code changes. No approved document may be modified without a PR that documents the reason for the change, the sections affected, and the impact on other documents.

---

## 8. Problem Resolution Process

### 8.1 Defect Reporting

All defects, anomalies, and non-conformances are reported as **GitHub Issues** in the CogAssess repository. Every issue must include:

- A descriptive title
- Steps to reproduce (for functional defects)
- Expected result vs actual result
- Version/commit at which the defect was observed
- Severity classification (see Section 8.2)
- Affected requirements (SRS ID(s), if known)

### 8.2 Severity Classification

| Severity | Definition | Examples |
|----------|-----------|---------|
| **Critical** | Loss of essential clinical function; patient safety risk; data loss; security breach | Pipeline produces no output; authentication bypass; audio not deleted after processing |
| **Major** | Significant functional impairment; incorrect clinical output; incorrect scoring | Wrong composite score calculated; clinical flag missing; assessment not saved |
| **Minor** | Limited functional impairment; workaround available; no clinical impact | UI element misaligned; non-critical field validation absent; slow response |
| **Cosmetic** | Appearance or wording; no functional impact | Typo in UI text; minor styling inconsistency |

Severity is assigned by the QA Reviewer at triage. The Development Lead may escalate severity; the Clinical Adviser must be consulted for any issue with potential clinical impact.

### 8.3 Fix Workflow

```
Issue opened → QA triage (severity assigned, milestone set)
    → Developer assigned → fix implemented on fix/<id> branch
    → PR raised → code review → merged to main
    → Verification re-executed for affected test cases
    → Issue closed with reference to merge commit and test results
```

### 8.4 Escalation

| Condition | Action |
|-----------|--------|
| Critical defect found in released version | Immediately suspend clinical use; notify Clinical Adviser; fast-track fix through gate review |
| Defect indicates unmitigated safety risk | Open/update RMF entry; notify Development Lead and Clinical Adviser within 24 hours |
| Defect cannot be reproduced | Issue tagged "cannot-reproduce"; monitor for recurrence over two subsequent releases before closing |

### 8.5 Resolution Metrics

At each gate review, the following defect metrics are reported:

| Metric | Threshold for Gate Pass |
|--------|------------------------|
| Open Critical defects | 0 |
| Open Major defects | 0 |
| Open Minor defects | Documented and accepted by QA Reviewer |
| Open Cosmetic defects | No threshold |

---

## 9. Risk Management Integration

### 9.1 Risk Management Framework

Risk management for CogAssess is conducted in accordance with ISO 14971:2019 (Application of risk management to medical devices). The Risk Management File (CA-RMF-001) is the primary risk document and is maintained throughout the SDLC.

### 9.2 Risk Review at Each Development Phase

Risk management is not a one-time activity. The following risk-related activities are mandated at each SDLC phase:

| Phase | Risk Activity |
|-------|--------------|
| Requirements | Review RMF for new risks arising from new or changed requirements |
| Architecture | Review RMF for risks arising from architectural decisions (e.g. use of SOUP, external services) |
| Implementation | Developers flag any implementation-level risks as GitHub Issues for RMF review |
| System Verification | Confirm that all risk controls identified in the RMF are implemented and verified |
| Gate Review | Development Lead and Clinical Adviser formally review and sign off RMF |

### 9.3 Risk-to-Requirement Traceability

Every safety-related software requirement in the SRS (SRS-SAF-xxx) must be traceable to one or more risk control entries in the RMF. This traceability is maintained in the Requirements Traceability Matrix in CA-SRS-001.

### 9.4 Residual Risk

Residual risk acceptance is the responsibility of the Clinical Adviser in conjunction with the Development Lead. No software may be released with an unaccepted residual risk. Accepted residual risks are documented in CA-RMF-001 with the date, rationale, and accepting party's name.

---

## 10. Software Safety Activities

### 10.1 Safety Requirements

Safety requirements are defined in CA-SRS-001 under the prefix `SRS-SAF-xxx`. These requirements arise directly from the risk analysis in CA-RMF-001. Examples include:

- **SRS-SAF-001:** All clinical reports must display a prominent clinician-only notice stating that the output is not a diagnosis.
- **SRS-SAF-002:** Numerical biomarker scores must not be displayed on any patient-facing screen.
- **SRS-SAF-006:** An empty or unintelligible STT transcript must be flagged as an error state; the pipeline must not return zero scores as a valid result.

### 10.2 Safety Test Coverage

Every safety requirement (SRS-SAF-xxx) must have at least one corresponding test case in CA-SVP-001 (the SVP SAF group). Safety tests are mandatory for every release; they may not be deferred.

### 10.3 Safety Flags in Pipeline Output

The speech analysis pipeline is required to include a safety_flags field in its output JSON. This field carries structured flags with a severity attribute taking one of three values: `note`, `watch`, or `refer`. These flags are used by the clinical report to alert the clinician to findings requiring attention. The flag generation logic is subject to dedicated verification (TC-PIP-003 in CA-SVP-001).

### 10.4 Known Clinical Risk Mitigations

The following architectural decisions are made specifically to mitigate identified clinical risks:

| Risk | Mitigation |
|------|-----------|
| Clinician interprets output as diagnosis | Prominent clinician-only disclaimer on every clinical report (SRS-SAF-001) |
| Patient sees score and self-diagnoses | All scoring excluded from patient-facing screens (SRS-SAF-002) |
| Non-English speaker's speech misscored | Amber warning displayed when L1 language ≠ English (SRS-FUN-014) |
| Silent pipeline failure returns false normal | Empty transcript raises error state, not zero score (SRS-SAF-006) |

---

## 11. Release Criteria

### 11.1 Mandatory Release Criteria

No version of CogAssess may be released to clinical users or external evaluators until all of the following criteria are met:

| # | Criterion | Verified by |
|---|-----------|------------|
| 1 | All requirements marked "Mandatory" in CA-SRS-001 for the current increment are implemented | Requirements traceability matrix |
| 2 | All test cases in CA-SVP-001 applicable to the release increment have been executed and passed | SVP test results record |
| 3 | All SAF group test cases (TC-SAF-xxx) have been executed and passed | SVP test results record |
| 4 | No open Critical defects in GitHub Issues | GitHub Issues list |
| 5 | No open Major defects in GitHub Issues | GitHub Issues list |
| 6 | The RMF (CA-RMF-001) has been reviewed and all risks are either mitigated or formally accepted | RMF sign-off |
| 7 | The SRR (CA-SRR-001) has been updated for the new version | SRR document |
| 8 | All SDLC documents applicable to the increment are in "Approved" status | Document register |
| 9 | QA Reviewer sign-off obtained | Gate review record |
| 10 | Clinical Adviser sign-off obtained | Gate review record |

### 11.2 Conditional Release

Where a Minor or Cosmetic defect is present at gate review, the QA Reviewer and Clinical Adviser may conditionally approve release provided:

- The defect is documented in GitHub Issues with severity assigned.
- A remediation milestone is set for the next patch release.
- The defect has no clinical safety impact (confirmed by Clinical Adviser).

This exception does not apply to Critical or Major defects.

### 11.3 Release Artefacts

At release, the following artefacts are produced and archived:

| Artefact | Location |
|----------|----------|
| Tagged Git commit | GitHub repository |
| Software Release Record | `docs/SRR.md` (updated) |
| SVP test results | Attached to GitHub Release |
| Gate review record | `docs/GR-v<VERSION>.md` |
| SDLC documents snapshot | Zip archive attached to GitHub Release |

---

## 12. Maintenance and Updates

### 12.1 Maintenance Policy

CogAssess is under active development. Post-release maintenance is managed through the same SDLC described in this document. There is no separate maintenance process; all changes, whether new features or defect fixes, follow the iterative increment model described in Section 2.

### 12.2 SOUP Updates

Updates to SOUP components (third-party libraries) are subject to the following process:

1. The update is proposed via a GitHub Issue tagged "dependency-upgrade".
2. The SOUP List (CA-SOUP-001) is reviewed for impact.
3. The RMF is reviewed for any new risks introduced by the updated SOUP version.
4. The update is implemented on a `fix/` or `feature/` branch.
5. Affected SVP tests are re-executed on the updated dependency.
6. The `requirements.txt` or `package-lock.json` is updated in the same PR.
7. CA-SOUP-001 is updated to reflect the new version.

### 12.3 Regulatory Change

If a regulatory change (e.g. a new edition of IEC 62304) requires changes to this SDP or companion documents, the Development Lead is responsible for conducting a gap analysis and scheduling the necessary document updates.

### 12.4 End of Life

When CogAssess is retired or a major architectural rebuild is undertaken that constitutes a new medical device, a formal End of Life record will be created and all SDLC documents will be archived in read-only storage for a minimum of ten years in accordance with applicable medical device regulations.

---

## 13. Referenced Documents

| Document ID | Title | Location |
|-------------|-------|----------|
| CA-SRS-001 | Software Requirements Specification | `docs/SRS.md` |
| CA-SAD-001 | Software Architecture Document | `docs/SAD.md` |
| CA-SVP-001 | Software Verification Plan | `docs/SVP.md` |
| CA-RMF-001 | Risk Management File | `docs/RMF.md` |
| CA-SOUP-001 | SOUP List | `docs/SOUP.md` |
| CA-SRR-001 | Software Release Record | `docs/SRR.md` |
| CA-SEC-001 | Security Risk Assessment | `docs/SEC.md` |
| IEC 62304:2006+AMD1:2015 | Medical device software — Software life cycle processes | External standard |
| ISO 14971:2019 | Application of risk management to medical devices | External standard |
| semver.org | Semantic Versioning 2.0.0 | https://semver.org |
| PEP 8 | Style Guide for Python Code | https://peps.python.org/pep-0008/ |
| Airbnb JavaScript Style Guide | JavaScript coding standard | https://github.com/airbnb/javascript |

---

*End of Document CA-SDP-001 v1.0*
