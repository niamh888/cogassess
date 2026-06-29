# CA-SEC-001 — Security Architecture and Threat Model

| Field | Value |
|---|---|
| Document ID | CA-SEC-001 |
| Title | Security Architecture and Threat Model |
| Project | CogAssess |
| Version | 1.0.0 |
| Date | 2026-06-29 |
| Author | Niamh St John Lynch |
| Organisation | MemoryTell Ltd / St John Lynch & Co. Ltd |
| IEC 62304 Class | Class B |
| Status | Approved for pre-release |
| GitHub Repository | niamh888/cogassess |

---

## 1. Purpose and Scope

This document defines the security architecture, threat model, and security controls for CogAssess version 1.0.0. It is produced in accordance with IEC 62304:2006+AMD1:2015 §7.1 (Software configuration management) and §5.1 (Software development planning), and with reference to OWASP Application Security Verification Standard (ASVS) and OWASP Top 10.

CogAssess is a Class B medical device software application that collects and processes speech recordings from patients undergoing cognitive assessment. It generates acoustic, linguistic, and semantic scores to support clinical interpretation by qualified healthcare professionals. Because patient data — including audio recordings and cognitive assessment results — is handled by the system, the confidentiality, integrity, and availability of that data must be protected at all stages of the data lifecycle.

### 1.1 Scope of This Document

This document covers:

- Authentication and authorisation controls
- Data protection controls across all system layers
- API security controls
- Dependency security status and known vulnerabilities
- A STRIDE threat model covering all principal assets
- Security pre-conditions for production deployment
- Security incident response procedures

This document does not cover:

- Physical security of the host environment (assumed to be the responsibility of the deploying institution)
- Network perimeter controls (assumed to be the responsibility of the deploying institution)
- GCP platform-level security controls (governed by Google's shared responsibility model)

### 1.2 Intended Audience

This document is intended for the development team, quality assurance personnel, clinical IT staff responsible for deployment, and regulatory reviewers assessing IEC 62304 compliance. It should be read in conjunction with CA-RMF-001 (Risk Management File) and CA-SOUP-001 (SOUP Evaluation).

---

## 2. Security Architecture Overview

CogAssess implements a layered security model. Security controls are applied at each layer independently so that a failure in one layer does not expose assets in other layers.

```
┌─────────────────────────────────────────────────────┐
│  Clinician Browser (React 18 SPA)                   │
│  JWT Bearer token — localStorage                    │
│  All API calls require Authorization header         │
└────────────────────┬────────────────────────────────┘
                     │ HTTP (localhost:dev) / HTTPS (production)
┌────────────────────▼────────────────────────────────┐
│  FastAPI Backend                                     │
│  JWT HS256 verification — 8-hour expiry             │
│  Pydantic input validation on all request bodies    │
│  SQLAlchemy ORM — parameterised queries only        │
│  CORS (localhost:dev — restricted in production)    │
└─────┬──────────────┬──────────────┬─────────────────┘
      │              │              │
┌─────▼──────┐ ┌─────▼──────┐ ┌────▼──────────────────┐
│  SQLite DB │ │  GCP STT   │ │  Temp Audio Files      │
│  File-level│ │  No PII in │ │  Deleted in finally{}  │
│  OS perms  │ │  metadata  │ │  after each session    │
└────────────┘ └────────────┘ └───────────────────────┘
```

### 2.1 Authentication Layer

- JWT HS256 tokens are issued on successful login and must be presented as a `Bearer` token in the `Authorization` header on all authenticated endpoints.
- Token expiry is set to 8 hours, balancing usability (a clinical session typically does not exceed one working day) against exposure time in the event of token theft.
- Passwords are hashed using bcrypt with a work factor of 12 or greater. Plaintext passwords are never stored or logged.

### 2.2 Transport Layer

- In the current development configuration, all traffic runs on `localhost` and is not exposed externally.
- HTTPS via TLS 1.2 or later is a mandatory pre-condition for any production deployment. Refer to Section 8 for full production pre-conditions.

### 2.3 Data Layer

- Patient records use a pseudonymous `patient_ref` identifier. Clinician-facing names may be stored, but patient audio is never tagged with any direct patient identifier when submitted to external services.
- SQLite database access is mediated exclusively through the SQLAlchemy 2.x ORM. Raw SQL strings are not used in the application codebase.
- Temporary audio files written during pipeline processing are deleted in a `finally` block to ensure deletion occurs even if processing raises an exception.

### 2.4 External API Layer (Google Cloud STT)

- Audio is submitted to the GCP Speech-to-Text API using a service account credential stored in an environment variable (`GOOGLE_APPLICATION_CREDENTIALS`).
- No patient reference, session ID, or any other patient-linking metadata is included in the GCP API call. The audio content alone is transmitted.
- GCP data handling is governed by the Google Cloud Data Processing Amendment and GCP's HIPAA compliance programme. The deploying institution is responsible for ensuring GCP terms are compatible with applicable data protection obligations.

---

## 3. STRIDE Threat Model

The STRIDE model (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) is applied to the principal assets of the CogAssess system. Likelihood and Impact are rated Low / Medium / High / Critical. Residual Risk is rated Very Low / Low / Medium / High.

### 3.1 Assets Subject to Threat Modelling

| Asset ID | Asset | Classification |
|---|---|---|
| A-01 | Clinician account credentials | Confidential |
| A-02 | Active JWT session tokens | Confidential |
| A-03 | SQLite assessment database | Confidential / Integrity-critical |
| A-04 | Audio recordings (temporary files) | Personal data |
| A-05 | Patient pseudonymous records | Personal data |
| A-06 | Scoring API endpoints | Integrity-critical |
| A-07 | JWT signing secret | Critical |
| A-08 | GCP service account credentials | Confidential |
| A-09 | Clinical findings / assessor observations | Confidential / Integrity-critical |

### 3.2 STRIDE Threat Table

| # | Threat Category | Threat Description | Asset at Risk | Likelihood | Impact | Control(s) | Residual Risk |
|---|---|---|---|---|---|---|---|
| T-01 | Spoofing | Credential brute-force attack against `/auth/login` | A-01 — clinician accounts | Medium | High | bcrypt hashing (cost 12+) makes offline cracking expensive; no rate limiting currently implemented (planned for v1.0) | Medium (until rate limiting added); Low after bcrypt provides strong protection even without rate limiting in single-site context |
| T-02 | Spoofing | JWT token theft (e.g., via XSS or network interception) and reuse as another clinician | A-02 — active session | Low | High | 8-hour token expiry limits window of exploitation; HTTPS required in production to prevent interception; XSS risk mitigated by React's default output escaping | Low |
| T-03 | Tampering | Direct modification of the SQLite database file outside the application | A-03 — assessment records | Low | High | OS file system permissions restrict access to the database file; read-only DB user planned for application-layer access; changes are not audited at the DB level (planned: audit log in v1.0) | Medium |
| T-04 | Tampering | Manipulation of API request payloads to inject false scoring data | A-06 — scoring endpoints | Low | Medium | JWT authentication is required on all write endpoints; Pydantic schema validation rejects malformed payloads; SQLAlchemy ORM prevents SQL injection | Low |
| T-05 | Repudiation | No audit trail for clinical decisions — assessor could deny recording a finding | A-09 — clinical findings | Medium | Medium | `findings_recorded_at` timestamp is written server-side at the time of submission and stored in the database; assessor JWT identity is available in the session record | Low |
| T-06 | Information Disclosure | Breach of the SQLite database file exposes patient assessment data | A-05 — patient pseudonyms and scores | Low | High | Pseudonymisation: no patient names, dates of birth, or national identifiers stored in the database; audio not stored; database contains `patient_ref` (opaque identifier) only — re-identification requires access to a separate mapping held by the clinical site | Low |
| T-07 | Information Disclosure | PII embedded in GCP audio submission API call metadata links audio to a patient identity | A-05 / A-04 | Low | Medium | Audio is submitted to GCP without `patient_ref`, session ID, or any metadata that could link it to a specific patient; the GCP request contains only the audio bytes and configuration parameters | Very Low |
| T-08 | Information Disclosure | Temporary audio file not deleted after processing exposes a patient's audio recording | A-04 — audio recording | Low | Medium | Audio temp files are deleted in a `finally` block in the pipeline processing function, ensuring deletion even if an exception is raised during processing | Very Low |
| T-09 | Information Disclosure | JWT signing secret (`SECRET_KEY`) exposed in source code or logs enables token forgery | A-07 — JWT signing secret | Low | Critical | `SECRET_KEY` is read from an environment variable at startup and never hard-coded or logged; `.env` is excluded from version control via `.gitignore` | Low |
| T-10 | Denial of Service | Submission of an extremely large audio file consumes server memory and CPU, rendering the service unavailable | A-06 — server resources | Medium | Medium | No file size limit is currently enforced at the API layer (planned for v1.0: 25 MB limit); librosa and ffmpeg will process arbitrarily large files, consuming proportionate resources | Medium |
| T-11 | Elevation of Privilege | CORS policy `allow_origins=["*"]` permits cross-origin API requests from any domain, enabling CSRF-like attacks from a malicious page | A-06 / A-03 | Medium | Medium | In the current development configuration (localhost only), the risk is acceptable; `allow_origins=["*"]` must be replaced with a specific origin list before any production deployment | Medium (production risk — pre-condition for deployment per §8) |
| T-12 | Information Disclosure | GCP service account key file exposed in repository or accessible to unauthorised processes | A-08 — GCP credentials | Low | High | Key file path is stored in `GOOGLE_APPLICATION_CREDENTIALS` environment variable; key file is excluded from version control; access restricted to the process user | Low |
| T-13 | Spoofing | Weak or default `SECRET_KEY` used in production enables offline JWT forgery | A-07 | Low | Critical | Development default key is clearly labelled as insecure in documentation; deployment instructions specify minimum 256-bit random key; startup validation of key strength is planned for v1.0 | Low (with correct deployment) / High (if instructions not followed) |

### 3.3 Threat Summary

| Residual Risk Level | Count | Threats |
|---|---|---|
| Very Low | 2 | T-07, T-08 |
| Low | 7 | T-02, T-04, T-05, T-06, T-09, T-12, T-13 |
| Medium | 4 | T-01, T-03, T-10, T-11 |
| High | 0 | — |
| Critical | 0 | — |

No threat is assessed at High or Critical residual risk. The four Medium residual risks (T-01, T-03, T-10, T-11) are all scheduled for remediation in v1.0 and are documented as open issues in CA-SRR-001 §5 and in the risk register in CA-RMF-001. None of these threats are assessed as unacceptable for supervised single-site research use.

---

## 4. Authentication Security Controls

### 4.1 Password Hashing

Clinician passwords are hashed using bcrypt via the `passlib` library with a minimum work factor (rounds) of 12. The bcrypt algorithm incorporates a random salt per password hash, preventing rainbow table attacks. Plaintext passwords are not stored, logged, or transmitted after the initial registration request.

A known compatibility issue between `bcrypt` 4.x and `passlib` 1.7.x (missing `__about__` attribute) is mitigated by a startup patch in `main.py`. See SOUP-04 in CA-SOUP-001 for full details.

### 4.2 JWT Token Issuance and Verification

- Algorithm: HS256 (HMAC-SHA256)
- Token expiry: 8 hours from issuance
- Signing key: read from `SECRET_KEY` environment variable at startup
- All protected endpoints use a FastAPI `Depends(get_current_user)` dependency that verifies the token signature, checks expiry, and returns the authenticated clinician identity before the endpoint handler executes
- Expired or malformed tokens receive a 401 Unauthorised response

### 4.3 Token Storage (Frontend)

JWT tokens are currently stored in `localStorage` in the React SPA. This exposes the token to any JavaScript running in the same origin (XSS risk). For the current development and research-prototype context, this is accepted as a residual risk (React's default output escaping mitigates most XSS vectors). **For production deployment, tokens must be migrated to HttpOnly cookies to eliminate the localStorage XSS vector.**

### 4.4 Session Invalidation

There is currently no server-side session invalidation mechanism. A token remains valid until it expires (8 hours), even if the clinician logs out on the client side. Client-side logout clears the token from localStorage, which is sufficient for the current single-site research use case. A server-side token blacklist or short-expiry refresh token mechanism is planned for v1.0.

### 4.5 Account Management

- Clinician registration is available via the `/auth/register` endpoint. In the current release, this endpoint is not protected (any caller can register). For production, this endpoint must be restricted to administrators only.
- No account lockout mechanism is currently implemented. This is a known gap (see T-01 in the STRIDE table) and rate limiting is planned for v1.0.
- No multi-factor authentication is implemented. MFA is considered a future enhancement.

---

## 5. Data Protection Controls

### 5.1 Patient Pseudonymisation

Patient records are stored in the database using a `patient_ref` field that is an opaque identifier assigned by the clinical site. The CogAssess database does not store patient full names, dates of birth, NHS numbers, national identity numbers, or any other direct identifiers. Re-identification of a patient from the CogAssess database alone is not possible without access to the clinical site's separate patient identity mapping.

This pseudonymisation approach is consistent with GDPR Article 4(5) and reduces the sensitivity of a potential database breach.

### 5.2 Audio File Handling

Audio files submitted for analysis are written to a temporary file on disk for processing by ffmpeg and librosa. The temporary file is created in the system's default temp directory. The file is deleted in a `finally` block in the pipeline processing function, ensuring that deletion occurs regardless of whether the processing completes successfully or raises an exception. Audio recordings are not persisted in the database or in any long-term storage location.

### 5.3 GCP Audio Submission

When submitting audio to the Google Cloud Speech-to-Text API, the API call contains only the audio bytes and configuration parameters (language code, model name, sample rate). No `patient_ref`, session ID, clinician ID, or other application-layer metadata is included in the GCP API request. This ensures that GCP cannot correlate an audio submission with a specific patient or session in the CogAssess database.

### 5.4 Database Encryption

The SQLite database is not encrypted at the application layer. Database confidentiality relies on OS-level file system permissions restricting access to the database file to the application process user. Full-disk encryption of the host machine (e.g., BitLocker on Windows, LUKS on Linux) is strongly recommended as an additional control at the infrastructure layer and is the responsibility of the deploying institution. Column-level encryption for particularly sensitive fields is considered a future enhancement for v1.0.

### 5.5 Logging and Audit

The application logs to the Python standard logging facility. Log output includes request paths, HTTP status codes, and exception tracebacks. Logs must not include patient data, audio content, or JWT token values. Log retention and log access controls are the responsibility of the deploying institution. A formal audit log of clinical actions (findings recorded, sessions created, patients added) is planned for v1.0.

---

## 6. API Security Controls

### 6.1 Authentication Enforcement

All endpoints that read or write patient or session data require a valid JWT Bearer token. Unauthenticated requests to protected endpoints receive a `401 Unauthorised` response. The authentication dependency is applied via FastAPI's dependency injection system, making it explicit and auditable in the route definitions.

Public endpoints (not requiring authentication) are limited to:
- `POST /auth/login` — credential exchange for JWT token
- `POST /auth/register` — new clinician registration (to be restricted in production)
- `GET /health` — health check (returns server status only, no data)

### 6.2 Cross-Origin Resource Sharing (CORS)

The current development configuration applies `allow_origins=["*"]`, permitting cross-origin requests from any domain. This is acceptable in a localhost development environment where no external network access is possible.

**This configuration must be replaced before any production deployment.** The `allow_origins` list must be restricted to the specific domain(s) from which the application will be served. See Section 8 for the full production deployment pre-condition checklist.

### 6.3 Rate Limiting

No request rate limiting is currently implemented. The absence of rate limiting on the `/auth/login` endpoint is the primary exposure for a credential brute-force attack (T-01). Rate limiting on authentication endpoints (target: 5 requests per minute per IP address) is planned for v1.0.

### 6.4 Input Validation

All API request bodies are defined as Pydantic models. FastAPI automatically validates incoming JSON against the Pydantic schema and returns a `422 Unprocessable Entity` response for any request that does not conform to the schema. This provides defence against:

- Missing required fields
- Type coercion attacks (e.g., integer overflow via string injection)
- Unexpectedly large string fields (Pydantic `max_length` constraints are applied on sensitive fields)

### 6.5 SQL Injection Prevention

CogAssess uses the SQLAlchemy 2.x ORM exclusively for all database interactions. No raw SQL strings are constructed or executed anywhere in the application codebase. SQLAlchemy's ORM and Core layers use parameterised queries internally, providing complete protection against SQL injection attacks.

### 6.6 File Upload Handling

Audio files are received as `multipart/form-data` uploads. The content type is checked against an allowlist of accepted audio MIME types (WAV, MP3, M4A). However, no maximum file size limit is currently enforced at the API layer. This is a known gap (T-10) — a 25 MB maximum upload size will be enforced in v1.0.

---

## 7. Dependency Security

### 7.1 Known Vulnerability — python-jose CVE-2024-33663

A vulnerability in `python-jose` (CVE-2024-33663) was identified during the SOUP evaluation. This vulnerability relates to algorithm confusion attacks affecting JWT verification when multiple algorithms are accepted. CogAssess mitigates this by explicitly specifying `algorithms=["HS256"]` in all JWT verification calls, which prevents algorithm confusion. The vulnerability does not affect HS256-only configurations. Full details and the mitigation assessment are documented in CA-SOUP-001, SOUP-03.

### 7.2 Known Issue — passlib / bcrypt Compatibility

`bcrypt` 4.x removed the `__about__` attribute used by `passlib` 1.7.x. CogAssess mitigates this with a runtime patch applied in `main.py` at startup. This is a compatibility issue, not a security vulnerability — the underlying bcrypt hashing algorithm is not affected. Full details are in CA-SOUP-001, SOUP-04.

### 7.3 Dependency Review Process

The SOUP evaluation in CA-SOUP-001 documents the security assessment of all third-party libraries used in CogAssess. The evaluation covers:

- Known CVEs at the time of the evaluation
- Maintenance status of each library
- Licence compatibility
- Mitigation status for any identified vulnerabilities

Per CA-SOUP-001 §6, the SOUP evaluation will be repeated at a minimum annually and whenever a new version of a dependency is adopted. Dependency updates are tracked via `requirements.txt` version pinning. `pip-audit` is the recommended tool for automated vulnerability scanning and will be integrated into the v1.0 CI pipeline.

---

## 8. Security Controls for Production Deployment

The following controls are **mandatory pre-conditions** that must be satisfied before CogAssess is deployed in any environment where real patient data will be processed. These controls are not yet in place — CogAssess v1.0.0 has completed internal security testing (Bandit static analysis, OWASP API Security Top 10) and is approved for supervised research use only. Production deployment additionally requires the controls listed below.

| # | Control | Requirement | Rationale |
|---|---|---|---|
| P-01 | HTTPS | TLS 1.2 or later must be configured on all endpoints | Prevents token interception (T-02) and protects data in transit |
| P-02 | CORS restriction | `allow_origins` must be set to the specific deployment domain(s) only | Prevents cross-origin API access (T-11) |
| P-03 | Rate limiting | Minimum: 5 requests per minute per IP on `/auth/login` | Mitigates brute-force credential attacks (T-01) |
| P-04 | File size limit | Maximum 25 MB audio file upload enforced at the API layer | Prevents denial-of-service via large uploads (T-10) |
| P-05 | JWT secret strength | `SECRET_KEY` must be a minimum 256-bit (32 bytes) cryptographically random key, stored in a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault, or equivalent) | Prevents offline JWT forgery (T-13) |
| P-06 | HttpOnly cookies | Migrate JWT token storage from `localStorage` to HttpOnly cookies | Eliminates localStorage XSS vector (§4.3) |
| P-07 | Registration endpoint protection | `/auth/register` must be restricted to authenticated administrators only | Prevents unauthorised account creation |
| P-08 | Database | PostgreSQL with connection pooling strongly recommended for any multi-clinician deployment; SQLite acceptable only for single-workstation single-clinician use | SQLite single-file DB is not suitable for concurrent production use (CA-SRR-001 §5.2) |
| P-09 | Penetration test | A third-party penetration test of the API and authentication layer must be conducted and all critical and high findings remediated before go-live | Validates security controls under adversarial conditions |
| P-10 | Disk encryption | Full-disk encryption of the host machine (e.g., BitLocker, LUKS) must be enabled | Mitigates physical access threats to the SQLite database file |
| P-11 | Audit logging | A formal audit log of all clinical actions must be implemented and logs must be reviewed periodically | Required for clinical accountability and incident investigation |
| P-12 | GCP key management | GCP service account key must be rotated at a minimum annually and on any suspected exposure | Limits the impact of GCP credential theft (T-12) |

---

## 9. Security Incident Response Plan

This section defines the initial response procedures to be followed in the event of a suspected or confirmed security incident affecting CogAssess or the data it processes.

### 9.1 Incident Classification

| Severity | Description | Examples |
|---|---|---|
| Critical | Active breach with confirmed data exfiltration or system compromise | Confirmed database dump exfiltrated; active unauthorised session; ransomware on host |
| High | Suspected breach or confirmed vulnerability with high exploitation potential | Unauthorised access to the database file; JWT secret exposed in public repository |
| Medium | Identified vulnerability without confirmed exploitation; near-miss event | Vulnerability disclosed in a dependency; misconfigured CORS discovered in production |
| Low | Security weakness with low exploitation potential | Expired dependency with no known CVE; log entry indicating failed login attempts |

### 9.2 Immediate Response (within 1 hour of detection)

1. **Contain** — If the system is actively compromised, take the CogAssess server offline immediately to prevent further access. Preserve the state of the system before any remediation actions are taken.
2. **Preserve evidence** — Do not restart, wipe, or modify the affected system before capturing logs, database state, and any other relevant artefacts. Create a filesystem snapshot or backup if possible.
3. **Notify the responsible person** — The Data Protection Officer (or equivalent) at the deploying institution must be notified within one hour of a Critical or High incident being confirmed or suspected.
4. **Assess scope** — Determine which data assets may have been accessed or exfiltrated. Refer to the asset list in §3.1 to scope the assessment.

### 9.3 Regulatory Notification

If personal data relating to patients has been, or is suspected to have been, accessed without authorisation, the deploying institution is responsible for assessing whether the incident constitutes a personal data breach under GDPR Article 33. If so:

- The relevant supervisory authority must be notified within 72 hours of the institution becoming aware of the breach.
- Affected data subjects (patients) must be notified without undue delay if the breach is likely to result in a high risk to their rights and freedoms (GDPR Article 34).

The software developer (MemoryTell Ltd / St John Lynch & Co. Ltd) must be notified of any confirmed breach affecting CogAssess so that the incident can be assessed for implications to the product's risk management file and SDLC documentation.

### 9.4 Remediation and Recovery

1. Identify the root cause of the incident using preserved evidence.
2. Apply a software fix or configuration change to close the exploited vulnerability.
3. Rotate all potentially compromised credentials: `SECRET_KEY`, GCP service account key, clinician passwords.
4. Update the risk management file (CA-RMF-001) and SOUP evaluation (CA-SOUP-001) to reflect any newly identified vulnerability.
5. Re-deploy from a known clean state.
6. Conduct a post-incident review to identify process improvements.

### 9.5 Contact Information

Contact information for the development team, the deploying institution's data protection officer, and the relevant supervisory authority must be recorded in the deploying institution's local addendum to this document before go-live.

---

## 10. Penetration Test Record

This section records the results of security testing activities conducted against CogAssess on 2026-06-06 (v0.5.0-beta baseline; results carry forward to v1.0.0 — no security-relevant code changes since that test run). Three activities were carried out: (1) Bandit static analysis, (2) OWASP API Security Top 10 automated tests, and (3) OWASP ZAP dynamic scanning (pending live deployment).

### 10.1 Bandit Static Analysis (CA-PEN-BAD-001)

**Tool:** Bandit v1.9.4  
**Scope:** main.py, auth.py, database.py, models.py, schemas.py  
**Date:** 2026-06-06  
**Command:** `python -m bandit -r main.py auth.py database.py models.py schemas.py -f txt`

**Findings:**

| Finding ID | Severity | Confidence | Rule | Location | Assessment |
|---|---|---|---|---|---|
| BAN-001 | Low | High | B404 — subprocess import | main.py:12 | False positive — subprocess is required to invoke ffmpeg for audio format conversion. The process is called with a fixed argument list (no shell=True), which mitigates injection risk. Accepted. |
| BAN-002 | Low | High | B603 — subprocess without shell=True | main.py:23 | This rule flags subprocess.run() even when shell=False. The call uses a hardcoded argument list; user-controlled input is never passed. Accepted — this pattern is safer than shell=True. |
| BAN-003 | Low | Medium | B105 — hardcoded password string | main.py:634 | False positive — "bearer" is the OAuth2 token type string in the login response (industry-standard), not a credential. Accepted. |

**Overall result:** 3 Low severity findings, all false positives. No Medium, High, or Critical findings. **PASS.**

### 10.2 OWASP API Security Top 10 — Automated Tests (CA-PEN-OWA-001)

**Tool:** pytest (tests/test_owasp.py)  
**Date:** 2026-06-06  
**Reference:** OWASP API Security Top 10 2023 edition  
**Command:** `python run_tests.py`

**Pre-test finding — BOLA vulnerability (fixed before re-test):**

During test development, three endpoints were found to lack clinician ownership checks:

| Endpoint | Vulnerability | Fix Applied |
|---|---|---|
| GET /assessments | Returned all clinicians' assessments (no clinician_id filter) | Added `.filter(models.Assessment.clinician_id == clinician.id)` |
| GET /assessments/{key} | Returned any assessment regardless of owning clinician | Added `clinician_id == clinician.id` to the query filter |
| GET /assessments/{key}/findings/history | Same as above | Added `clinician_id == clinician.id` to the query filter |

Note: PUT /assessments/{key}/findings already contained an ownership check (`if a.clinician_id != clinician.id: raise HTTPException(403)`). The read endpoints were the gap.

Patient records (GET /patients, GET /patients/{ref}) have no clinician_id column by design: CogAssess uses a single-site shared-patient model where any authenticated clinician at the site may look up any patient. This is an accepted architectural design for the clinical trial context; multi-site deployments would require a site_id column on the Patient model.

**Results after fix:**

| TC | OWASP Risk | Description | Result |
|---|---|---|---|
| TC-OWA-001 | API1 — BOLA | Clinician B cannot see Clinician A's assessments in list | PASS |
| TC-OWA-002 | API1 — BOLA | Clinician B cannot access Clinician A's assessment detail | PASS |
| TC-OWA-003 | API2 — Broken Auth | JWT alg:none token rejected | PASS |
| TC-OWA-004 | API2 — Broken Auth | JWT payload tampering rejected | PASS |
| TC-OWA-005 | API2 — Broken Auth | JWT wrong signature rejected | PASS |
| TC-OWA-006 | API3 — Data Exposure | Error responses do not leak internals | PASS |
| TC-OWA-007 | API3 — Mass Assignment | Extra fields ignored by Pydantic | PASS |
| TC-OWA-008 | API8 — Injection | SQL injection payloads do not cause 5xx | PASS |
| TC-OWA-009 | API4 — Resource Consumption | 100 KB oversized payload does not cause 5xx | PASS |
| TC-OWA-010 | API2 — Broken Auth | All 10 protected endpoints return 401 unauthenticated | PASS |

**Overall result: 10/10 PASS.**

### 10.3 OWASP ZAP Dynamic Scanning (Pending)

OWASP ZAP active scanning requires a running production-equivalent server accessible over HTTP/HTTPS. This activity is deferred until the system is deployed to a staging or production environment. The ZAP scan should be run as follows:

```bash
docker run -t owasp/zap2docker-stable zap-api-scan.py \
  -t https://<your-domain>/openapi.json \
  -f openapi \
  -r zap_report.html
```

Results must be documented in a supplementary CA-PEN-ZAP-001 addendum before first-patient-in.

---

## 11. References

| Reference | Description |
|---|---|
| IEC 62304:2006+AMD1:2015 §7.1 | Software configuration management — includes requirements for security within the SDLC |
| OWASP Top 10 (2021) | Open Web Application Security Project — ten most critical web application security risks |
| OWASP ASVS 4.0 | Application Security Verification Standard — detailed security requirements for web applications |
| ISO/IEC 27001:2022 | Information security management systems — general framework for organisational information security |
| GDPR Article 32 | Security of processing — obligation to implement appropriate technical and organisational measures |
| GDPR Article 33 | Notification of personal data breaches to supervisory authority |
| GDPR Article 34 | Communication of personal data breaches to data subjects |
| CA-RMF-001 | CogAssess Risk Management File |
| CA-SOUP-001 | CogAssess Software of Unknown Provenance Evaluation |
| CA-SRR-001 | CogAssess Software Release Record |
| CA-SVP-001 | CogAssess Software Verification Plan |
| CVE-2024-33663 | python-jose JWT algorithm confusion vulnerability |

---

*End of CA-SEC-001 v1.0.0 — Updated 2026-06-29*

*Document controlled under the CogAssess SDLC documentation suite. For the current revision, refer to the GitHub repository at https://github.com/niamh888/cogassess.*
