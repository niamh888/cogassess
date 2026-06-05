import { Link } from "react-router-dom";

const VERSION    = "0.5.0-beta";
const BUILD_DATE = "2026-06-05";

const PIPELINE_COMPONENTS = [
  { name: "Speech recognition",       version: "Google Cloud Chirp",        purpose: "Converts spoken audio to text" },
  { name: "Audio analysis",           version: "librosa 0.10",              purpose: "Measures speech rate, pauses, and voice quality" },
  { name: "Language analysis",        version: "spaCy 3.x",                 purpose: "Examines grammar, vocabulary, and sentence structure" },
  { name: "Meaning & memory scoring", version: "sentence-transformers",     purpose: "Assesses semantic relevance and memory recall" },
  { name: "Emotion detection",        version: "HuggingFace / distilroberta", purpose: "Classifies emotional content across 7 categories" },
  { name: "Data storage",             version: "SQLite / SQLAlchemy",       purpose: "Stores assessment records securely on-device" },
];

const SECURITY = [
  { icon: "ti-lock",         title: "Login & access",         body: "Clinician accounts are password-protected. Sessions expire automatically after 8 hours." },
  { icon: "ti-shield-lock",  title: "Patient privacy",        body: "Patients are identified by a reference code only. No names are stored in CogAssess." },
  { icon: "ti-database",     title: "Local data",             body: "All data is stored on this device. Nothing is sent to external servers except for speech transcription." },
  { icon: "ti-eye-off",      title: "Patient-facing screens", body: "Scores and biomarker data are never shown to patients. The patient sees only the recording interface." },
  { icon: "ti-certificate",  title: "Compliance",             body: "Designed to support GDPR and the Health Research Regulations 2018 (Ireland). Obtain appropriate consent before use." },
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
      <Link to="/dashboard" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Dashboard</Link>

      <div style={{ marginTop: 24, marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px", color: "var(--color-text-primary)" }}>About CogAssess</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0 }}>Version {VERSION} · {new Date(BUILD_DATE + "T12:00:00").toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "2-digit" })}</p>
      </div>

      {/* Clinical disclaimer */}
      <div style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", padding: "14px 18px", marginBottom: 32, fontSize: 14, color: "var(--color-text-warning)", lineHeight: 1.6 }}>
        <strong>For clinician use only.</strong> Results are speech biomarker indicators — not a diagnosis. They must be interpreted by a qualified clinician and must not be shared directly with patients.
      </div>

      {/* How it works */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "var(--color-text-primary)" }}>How it works</h2>
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-primary)" }}>
                <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Stage</th>
                <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>What it does</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE_COMPONENTS.map((c, i) => (
                <tr key={c.name} style={{ borderBottom: i < PIPELINE_COMPONENTS.length - 1 ? "0.5px solid var(--color-border-primary)" : "none" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{c.name}</td>
                  <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)" }}>{c.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Security */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "var(--color-text-primary)" }}>Security &amp; privacy</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {SECURITY.map(s => (
            <div key={s.title} style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", padding: "12px 16px", display: "flex", gap: 14 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: "var(--color-accent)", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div>
                <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 2px", color: "var(--color-text-primary)" }}>{s.title}</p>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
