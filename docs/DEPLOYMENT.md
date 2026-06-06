# CogAssess Production Deployment Guide

| Field | Detail |
|-------|--------|
| Document reference | CA-DEP-001 |
| Version | 1.0 |
| Date | 2026-06-06 |
| Audience | System administrator or IT contact responsible for clinical trial deployment |
| Companion documents | CA-SRS-001, CA-SAD-001, CA-RMF-001, CA-SEC-001, CA-SVP-001 |

---

> **Important:** CogAssess is a Software as a Medical Device (SaMD) intended for use in a regulated clinical investigation. Before going live, the person completing this deployment must read Sections 1 and 9 of this document in full. Do not skip steps marked **[REGULATORY]** — they are required for EU MDR Article 62 compliance.

---

## Table of Contents

1. [Who should do this](#1-who-should-do-this)
2. [What you will need before you start](#2-what-you-will-need-before-you-start)
3. [Choosing your deployment path](#3-choosing-your-deployment-path)
4. [Path A — AWS Deployment (recommended)](#4-path-a--aws-deployment-recommended)
5. [Path B — Linux Server (VPS or bare-metal)](#5-path-b--linux-server-vps-or-bare-metal)
6. [Shared steps (both paths)](#6-shared-steps-both-paths)
7. [Pre-go-live verification](#7-pre-go-live-verification)
8. [Ongoing operations](#8-ongoing-operations)
9. [Regulatory sign-off](#9-regulatory-sign-off)

---

## 1. Who should do this

This guide is written for a **system administrator** — someone comfortable with Linux command-line and basic cloud infrastructure. You do not need to understand the AI pipeline or clinical workflow.

If you are not sure whether you are the right person, contact the study sponsor (MemoryTell Ltd) before proceeding. Incorrect deployment of a medical device is a regulatory and patient safety matter.

**What you need to know before starting:**
- How to SSH into a Linux server
- Basic command-line navigation
- How to set environment variables
- (For Path A) How to use the AWS Console or AWS CLI

---

## 2. What you will need before you start

Gather all of the following before starting. Missing any item will block you partway through.

| Item | Notes |
|------|-------|
| Access to the CogAssess git repository | GitHub: niamh888/cogassess |
| A Google Cloud project with Speech-to-Text API enabled | See Section 6.4 |
| A GCP service account JSON key file | Downloaded from GCP Console — keep this secret |
| A domain name or static IP address for the server | Used for HTTPS certificate |
| An SSL/TLS certificate | Via AWS Certificate Manager (Path A) or Let's Encrypt (Path B) |
| A strong JWT secret key | Generate with: `python -c "import secrets; print(secrets.token_hex(32))"` — write it down securely |
| An initial clinician username and password | Decided in advance; password must be changed on first login |
| (Path A only) AWS account with EC2 and RDS access | |
| (Path A only) AWS Secrets Manager access | For secure credential storage |

---

## 3. Choosing your deployment path

| | Path A — AWS | Path B — Linux Server |
|--|--|--|
| **Best for** | Trials where AWS was already provisioned | Trials using a dedicated VPS or institutional server |
| **Database** | RDS PostgreSQL (managed, automated backups) | PostgreSQL installed on the server |
| **HTTPS** | AWS Certificate Manager + ALB or CloudFront | Let's Encrypt / Certbot |
| **Secrets** | AWS Secrets Manager | `.env` file (secure it carefully) |
| **Backups** | Automatic via RDS | Manual or cron job |
| **Effort** | Higher initial setup, lower ongoing maintenance | Lower initial setup, higher ongoing maintenance |

If you have AWS infrastructure already provisioned, use **Path A**. If you have a VPS (e.g. from a university or a provider like DigitalOcean, Linode, Hetzner), use **Path B**.

---

## 4. Path A — AWS Deployment (recommended)

### A1. EC2 Instance

Launch an EC2 instance with the following minimum specification:

| Setting | Value |
|---------|-------|
| AMI | Ubuntu 22.04 LTS |
| Instance type | t3.large (2 vCPU, 8 GB RAM) — required for CPU ML inference |
| Storage | 30 GB gp3 EBS minimum (HuggingFace models use ~2 GB) |
| Security group — inbound | Port 22 (SSH, your IP only), Port 80 (HTTP, ALB only), Port 443 (HTTPS, ALB only) |
| Security group — outbound | Port 443 (HTTPS, for GCP STT API and HuggingFace downloads) |

> **t3.medium (4 GB RAM) is borderline.** The sentence-transformers and emotion models load into memory simultaneously. Use t3.large or larger to avoid out-of-memory errors mid-pipeline.

Assign an **Elastic IP** to the instance so the address does not change on reboot.

### A2. RDS PostgreSQL

Launch an RDS instance:

| Setting | Value |
|---------|-------|
| Engine | PostgreSQL 15 or 16 |
| Instance class | db.t3.micro (sufficient for a single-site trial) |
| Storage | 20 GB gp2, with auto-scaling enabled |
| Multi-AZ | Not required for a trial; enable for production |
| VPC | Same VPC as your EC2 instance |
| Security group — inbound | Port 5432 from the EC2 security group only |
| Automated backups | Enable — 7-day retention minimum |
| Deletion protection | Enable |

Note the RDS **endpoint**, **database name**, **username**, and **password** — you will need these for the `DATABASE_URL` environment variable.

**`DATABASE_URL` format:**
```
postgresql://username:password@your-rds-endpoint.rds.amazonaws.com:5432/cogassess
```

### A3. HTTPS via Application Load Balancer

1. Request a certificate in **AWS Certificate Manager** for your domain (e.g. `cogassess.yourtrial.com`).
2. Create an **Application Load Balancer** (ALB):
   - Listener on port 443 (HTTPS) → forward to EC2 on port 8000
   - Listener on port 80 (HTTP) → redirect to HTTPS
   - Attach the ACM certificate
3. Point your domain DNS to the ALB DNS name.

> If you do not have a domain name and the trial is internal-only, you can use the Elastic IP directly with a self-signed certificate for testing — but this is not suitable for clinical use. Obtain a real domain.

### A4. Secrets Manager

Store the following secrets in **AWS Secrets Manager** (not in a `.env` file):

| Secret name | Value |
|-------------|-------|
| `cogassess/jwt-secret` | Your 32-byte hex JWT secret key |
| `cogassess/gcp-credentials` | Contents of your GCP service account JSON key file |
| `cogassess/database-url` | The full PostgreSQL connection string |

You can retrieve these in your startup script using the AWS CLI:

```bash
export JWT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id cogassess/jwt-secret --query SecretString --output text)

export DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id cogassess/database-url --query SecretString --output text)

# Write GCP credentials to a temp file
aws secretsmanager get-secret-value \
  --secret-id cogassess/gcp-credentials \
  --query SecretString --output text > /tmp/gcp-credentials.json
export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcp-credentials.json
```

> Attach an **IAM role** to your EC2 instance with `secretsmanager:GetSecretValue` permission scoped to the `cogassess/*` secrets. Do not use long-lived IAM user credentials on the server.

### A5. EC2 — Application Setup

SSH into your EC2 instance and run the following:

```bash
# System dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.11 python3.11-venv python3-pip ffmpeg git nodejs npm

# Clone the repository
git clone https://github.com/niamh888/cogassess.git
cd cogassess

# Python virtual environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# spaCy English model
python -m spacy download en_core_web_sm

# Build the React frontend
cd frontend
npm install
npm run build
cd ..
```

The `npm run build` command creates a `frontend/dist/` directory of static files. These need to be served — see Section 6.2.

### A6. Running the Backend as a Service

Create a systemd service so the backend starts automatically on reboot:

```bash
sudo nano /etc/systemd/system/cogassess.service
```

Paste the following (adjust paths as needed):

```ini
[Unit]
Description=CogAssess FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/cogassess
EnvironmentFile=/home/ubuntu/cogassess/.env
ExecStart=/home/ubuntu/cogassess/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> Use `--workers 1`. The ML models are loaded once per worker; multiple workers multiply memory usage. One worker is appropriate for a clinical trial.

```bash
sudo systemctl daemon-reload
sudo systemctl enable cogassess
sudo systemctl start cogassess
sudo systemctl status cogassess
```

---

## 5. Path B — Linux Server (VPS or bare-metal)

### B1. Server Requirements

| Requirement | Minimum |
|-------------|---------|
| OS | Ubuntu 22.04 LTS |
| RAM | 8 GB (4 GB borderline — avoid) |
| CPU | 2 vCPU |
| Disk | 30 GB |
| Open ports | 80 (HTTP), 443 (HTTPS), 22 (SSH, your IP only) |

### B2. System Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.11 python3.11-venv python3-pip ffmpeg git \
                    postgresql postgresql-contrib nginx nodejs npm certbot \
                    python3-certbot-nginx
```

### B3. PostgreSQL Database

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo -u postgres psql

# Inside psql:
CREATE USER cogassess WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE cogassess OWNER cogassess;
\q
```

`DATABASE_URL` will be:
```
postgresql://cogassess:choose-a-strong-password@localhost:5432/cogassess
```

### B4. Application Setup

```bash
git clone https://github.com/niamh888/cogassess.git
cd cogassess

python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Frontend
cd frontend
npm install
npm run build
cd ..
```

### B5. Environment Variables

Create a `.env` file in the project root:

```bash
nano /home/ubuntu/cogassess/.env
```

```env
JWT_SECRET=your-32-byte-hex-secret-here
GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/home/ubuntu/cogassess/gcp-credentials.json
DATABASE_URL=postgresql://cogassess:password@localhost:5432/cogassess
```

**Secure the file:**
```bash
chmod 600 /home/ubuntu/cogassess/.env
chmod 600 /home/ubuntu/cogassess/gcp-credentials.json
```

> Never commit `.env` or `gcp-credentials.json` to git. Confirm `.gitignore` includes both.

### B6. HTTPS with Let's Encrypt

```bash
sudo certbot --nginx -d cogassess.yourdomain.com
```

This automatically configures nginx with a valid TLS certificate. Certificates renew automatically via a cron job that certbot installs.

### B7. nginx Reverse Proxy

Create `/etc/nginx/sites-available/cogassess`:

```nginx
server {
    listen 80;
    server_name cogassess.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name cogassess.yourdomain.com;

    # SSL managed by certbot
    ssl_certificate /etc/letsencrypt/live/cogassess.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cogassess.yourdomain.com/privkey.pem;

    # Serve React static files
    location / {
        root /home/ubuntu/cogassess/frontend/dist;
        try_files $uri /index.html;
    }

    # Proxy API requests to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cogassess /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### B8. Systemd Service

Follow the same systemd instructions as Path A (Section A6), adjusting paths for your server user.

---

## 6. Shared Steps (Both Paths)

### 6.1 Database Migration

After the first startup, run the database migration script to create all tables:

```bash
source venv/bin/activate
python migrate.py
```

Confirm the output shows all tables created without errors before proceeding.

### 6.2 Serving the React Frontend

The React frontend is compiled to static files (`frontend/dist/`). These must be served by a web server:

- **Path A (AWS):** Serve via nginx on the EC2 instance (same as Path B), or upload `frontend/dist/` to an S3 bucket and serve via CloudFront.
- **Path B:** nginx serves `frontend/dist/` directly (see nginx config above).

> Do not use `npm run dev` in production. That is a development server with no security hardening.

### 6.3 CORS Configuration

**[REGULATORY — SRS-SEC requirement]**

The backend currently allows all origins (`allow_origins=["*"]`). Before go-live, restrict this to your frontend domain:

In `main.py`, find the CORS middleware configuration and change:
```python
allow_origins=["*"]
```
to:
```python
allow_origins=["https://cogassess.yourdomain.com"]
```

Restart the backend after this change.

### 6.4 Google Cloud Credentials (Production)

For production, use a **service account key** rather than Application Default Credentials:

1. Go to GCP Console → IAM & Admin → Service Accounts
2. Create a new service account: `cogassess-stt@your-project.iam.gserviceaccount.com`
3. Grant it the role: **Cloud Speech Client** (`roles/speech.client`)
4. Create and download a JSON key
5. Store the JSON file securely (Path A: Secrets Manager; Path B: `.env` + `chmod 600`)
6. Set `GOOGLE_APPLICATION_CREDENTIALS` to the file path

> **Never share the service account JSON key** and never commit it to git.

### 6.5 spaCy Model and HuggingFace Model Cache

```bash
# spaCy model (must be downloaded once per server)
python -m spacy download en_core_web_sm

# HuggingFace models download automatically on first pipeline run
# (~670 MB total). On a server with limited outbound internet, pre-download:
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-mpnet-base-v2')"
python -c "from transformers import pipeline; pipeline('text-classification', model='j-hartmann/emotion-english-distilroberta-base')"
```

This caches models to `~/.cache/huggingface/`. The first clinical assessment run will be slow if this pre-download has not been done — do it before the first patient session.

### 6.6 Create the First Clinician Account

```bash
source venv/bin/activate
python init_db.py
```

This creates a default `admin` / `changeme` account. **Change the password immediately:**

```bash
# Option 1: Run the backend and use the API
curl -X POST https://cogassess.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "changeme"}'

# Then use the returned token to update the password via the API
# (or use init_db.py with a different password before first run)
```

For a clinical trial, create individual named accounts for each clinician rather than sharing the admin account. Each clinician account creates an audit trail linked to that person's identity.

---

## 7. Pre-Go-Live Verification

**[REGULATORY]** The following checks must be completed and documented before the first clinical session. Keep a record of who performed each check and when.

### 7.1 Run the Full Test Suite

```bash
source venv/bin/activate
python run_tests.py
```

**Required outcome:** `Passed: 18, Failed: 0`

Save the generated `logs/test_log_YYYYMMDD-HHMMSS.md` file. This is the software verification evidence required under IEC 62304 and EU MDR. Label it as the **production go-live test run** and store it with the trial master file.

If any test fails — stop. Do not proceed with clinical use until the failure is investigated and resolved.

### 7.2 Health Check

```bash
curl https://cogassess.yourdomain.com/api/health
```

Expected:
```json
{"status": "ok", "pipeline_stages": ["chirp_stt", "acoustic", "morphology", "semantics", "emotion"]}
```

### 7.3 End-to-End Pipeline Check

Perform a complete assessment with a test patient before any real clinical sessions:

1. Log in as a clinician
2. Create a test patient (`PT-TEST-001`)
3. Create an assessment and complete at least one speech task
4. Confirm scores appear on the report page
5. Confirm the patient summary contains no numerical scores
6. Delete the test patient record after verification

### 7.4 Security Checks

| Check | How to verify |
|-------|--------------|
| HTTPS enforced | Visit `http://` — confirm redirect to `https://` |
| HTTP 401 on unauthenticated API request | `curl https://cogassess.yourdomain.com/api/patients/` — expect `{"detail":"Not authenticated"}` |
| CORS restricted | Confirm `allow_origins` is not `["*"]` in main.py |
| `.env` / credentials not accessible via browser | Visit `https://cogassess.yourdomain.com/.env` — expect 404 |
| Default password changed | Confirm `admin` / `changeme` no longer works |

### 7.5 GCP Pipeline Check

Confirm the GCP STT API is reachable from the server:

```bash
curl -X POST \
  "https://speech.googleapis.com/v2/projects/YOUR_PROJECT_ID/locations/global/recognizers/_:recognize" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"config": {"language_codes": ["en-US"], "model": "chirp"}, "content": ""}'
```

If this returns a 200 or 400 (not a network error or 403), GCP connectivity is confirmed.

---

## 8. Ongoing Operations

### 8.1 Database Backups

| Path | Backup method |
|------|--------------|
| Path A (RDS) | Automated daily snapshots — verify these are enabled in RDS settings |
| Path B | Set up a daily cron job: `pg_dump cogassess > /backups/cogassess_$(date +%Y%m%d).sql` |

Test the restore process before the trial begins. A backup that has never been tested is not a backup.

### 8.2 Log Monitoring

Monitor the backend service logs for errors:

```bash
# Path A / B (systemd)
sudo journalctl -u cogassess -f

# Look for: pipeline errors, GCP auth failures, database connection errors
```

### 8.3 SOUP CVE Review

Per CA-SOUP-001, review installed packages for new CVEs at least every 6 months during the trial, and immediately if a relevant CVE is published. To run the automated CVE check:

```bash
pip install pip-audit
# Then remove the @pytest.mark.skip from TC-SOUP-003 in tests/test_soup.py
python run_tests.py
```

Any HIGH or CRITICAL finding must be investigated and resolved before the next clinical session.

### 8.4 Software Updates

Do not update Python packages during an active clinical trial without:
1. Updating `requirements.txt` with the new pinned version
2. Updating `docs/SOUP.md` with the new version and re-running the anomaly list review
3. Re-running the full test suite (`python run_tests.py`)
4. Documenting the change in `docs/SRR.md` (Software Release Record)

This is a regulatory requirement under IEC 62304 §8.1.2.

---

## 9. Regulatory Sign-Off

**[REGULATORY]** Before the first clinical session, the following must be completed and documented:

| Item | Completed by | Date | Signature |
|------|-------------|------|-----------|
| Deployment checklist completed | | | |
| Pre-go-live test suite run — PASS (18/18) | | | |
| Test log saved to trial master file | | | |
| End-to-end pipeline check passed | | | |
| Security checks passed | | | |
| Default password changed | | | |
| CORS restricted to production domain | | | |
| GCP service account credentials secured | | | |
| Database backup verified | | | |
| Site IT contact briefed on incident reporting | | | |

The completed sign-off table should be printed, signed, and filed in the **Trial Master File** alongside the test log from Section 7.1.

**Incident reporting:** If at any point during the trial the software behaves unexpectedly, produces an error during a clinical session, or is suspected to have contributed to a clinical decision, contact the Sponsor immediately:

| | |
|--|--|
| Sponsor | MemoryTell Ltd |
| Contact | clinical@memorytell.com |
| Serious incident reporting deadline | 24 hours |
| Non-serious incident reporting deadline | 7 days |

---

*CA-DEP-001 v1.0 — CogAssess Production Deployment Guide — MemoryTell Ltd © 2026*
