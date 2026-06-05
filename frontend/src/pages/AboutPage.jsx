import { Link } from "react-router-dom";

const VERSION = "0.5.0-beta";
const BUILD_DATE = "2026-06-05";

const PIPELINE_COMPONENTS = [
  { name: "Google Cloud Speech-to-Text V2", version: "Chirp model", purpose: "Automatic speech recognition" },
  { name: "librosa", version: "0.10.x", purpose: "Acoustic feature extraction (pitch, HNR, pauses)" },
  { name: "spaCy", version: "3.x (en_core_web_sm)", purpose: "Morphological and syntactic analysis" },
  { name: "sentence-transformers", version: "all-mpnet-base-v2", purpose: "Semantic memory scoring" },
  { name: "j-hartmann/emotion-english-distilroberta-base", version: "HuggingFace", purpose: "Emotion classification (7 classes)" },
  { name: "FastAPI", version: "0.111+", purpose: "Backend API and pipeline orchestration" },
  { name: "SQLite / SQLAlchemy", version: "2.x", purpose: "Local encrypted-at-rest data storage" },
];

const SECURITY = [
  { icon: "ti-lock", title: "Authentication", body: "JWT tokens (HS256) with 8-hour expiry. Passwords hashed with bcrypt (12 rounds)." },
  { icon: "ti-shield-lock", title: "Data minimisation", body: "Patient records use pseudonymised references only. No names are stored in CogAssess." },
  { icon: "ti-database", title: "Local storage", body: "All data is stored in a local SQLite file (cogassess.db). No data leaves your network unless you configure cloud backup." },
  { icon: "ti-eye-off", title: "Patient confidentiality", body: "The patient-facing UI shows no scores or biomarker data. Results are visible to authenticated clinicians only." },
  { icon: "ti-certificate", title: "Compliance", body: "Designed to support GDPR (EU 2016/679) and the Health Research Regulations 2018 (Ireland). Always obtain appropriate consent." },
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
      <Link to="/dashboard" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Dashboard</Link>

      <div style={{ marginTop: 24, marginBottom: 36 }}>
        <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-text-tertiary)", margin: "0 0 6px", textTransform: "uppercase" }}>
          About CogAssess
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "var(--color-text-primary)" }}>
          Cognitive Speech Biomarker Platform
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>
          Version <strong>{VERSION}</strong> · Built {BUILD_DATE} · Modelled on the TELL architecture (Universidad de San Andrés)
        </p>
      </div>

      {/* Clinical disclaimer */}
      <div style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", padding: "14px 18px", marginBottom: 32, fontSize: 14, color: "var(--color-text-warning)", lineHeight: 1.6 }}>
        <strong>Clinical use notice:</strong> CogAssess is a research and clinical support tool. All outputs are biomarker indicators and must be interpreted by a qualified clinician. They do not constitute a diagnosis and must not be communicated directly to patients.
      </div>

      {/* Pipeline components */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "var(--color-text-primary)" }}>
          Pipeline components
        </h2>
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-primary)" }}>
                <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Component</th>
                <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Version</th>
                <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE_COMPONENTS.map(c => (
                <tr key={c.name} style={{ borderBottom: "0.5px solid var(--color-border-primary)" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", fontFamily: "monospace", fontSize: 12 }}>{c.version}</td>
                  <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)" }}>{c.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Security */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "var(--color-text-primary)" }}>
          Security &amp; privacy
        </h2>
        <div style={{ display: "grid", gap: 12 }}>
          {SECURITY.map(s => (
            <div key={s.title} style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", padding: "14px 18px", display: "flex", gap: 14 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 20, color: "var(--color-accent)", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 4px", color: "var(--color-text-primary)" }}>{s.title}</p>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Patching & updates */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "var(--color-text-primary)" }}>
          Patching &amp; updates
        </h2>
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", padding: "16px 18px", fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 10px" }}>CogAssess is under active development. To update:</p>
          <ol style={{ margin: 0, paddingLeft: "1.4rem" }}>
            <li>Pull the latest version from your repository.</li>
            <li>Run <code style={{ background: "var(--color-background-secondary)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>pip install -r requirements.txt</code> to update Python dependencies.</li>
            <li>Run <code style={{ background: "var(--color-background-secondary)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>npm install</code> in the <code style={{ background: "var(--color-background-secondary)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>frontend/</code> directory.</li>
            <li>Run <code style={{ background: "var(--color-background-secondary)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>python init_db.py</code> to apply any schema migrations.</li>
            <li>Restart both the FastAPI server and the frontend dev server.</li>
          </ol>
        </div>
      </section>

      {/* Feedback */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "var(--color-text-primary)" }}>
          Feedback &amp; support
        </h2>
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", padding: "16px 18px", fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 12px" }}>
            To report a bug or suggest an improvement, email <a href="mailto:support@cogassess.ie" style={{ color: "var(--color-accent)" }}>support@cogassess.ie</a> with:
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.4rem" }}>
            <li>A description of the issue or suggestion</li>
            <li>Steps to reproduce (for bugs)</li>
            <li>CogAssess version: <strong>{VERSION}</strong></li>
            <li>Browser and operating system</li>
          </ul>
          <p style={{ margin: "12px 0 0" }}>
            Do not include patient data or recordings in feedback submissions.
          </p>
        </div>
      </section>

      {/* Credits */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "var(--color-text-primary)" }}>Credits</h2>
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", padding: "16px 18px", fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>
            Developed by <strong>St John Lynch &amp; Co. Ltd</strong><br />
            © {new Date().getFullYear()} MemoryTell Ltd. All rights reserved.<br />
            Architecture inspired by the TELL framework — Universidad de San Andrés, Argentina.
          </p>
        </div>
      </section>
    </div>
  );
}
