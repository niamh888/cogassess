import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:8000";

const OUTCOME_DISPLAY = {
  no_issue:         { label: "No issue found",                 color: "#0f6e56", bg: "#e1f5ee" },
  monitor_3m:       { label: "Monitor — review in 3 months",   color: "#854f0b", bg: "#faeeda" },
  monitor_6m:       { label: "Monitor — review in 6 months",   color: "#854f0b", bg: "#faeeda" },
  monitor_12m:      { label: "Monitor — review in 12 months",  color: "#854f0b", bg: "#faeeda" },
  refer_specialist: { label: "Refer for specialist review",    color: "#1e40af", bg: "#e6f1fb" },
  refer_urgent:     { label: "Refer urgently",                 color: "#c62828", bg: "#fdeaea" },
};

export default function PatientSummaryPage() {
  const { key } = useParams();
  const { token } = useAuth();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    fetch(`${API}/assessments/${key}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setAssessment)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [key, token]);

  if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading…</div>;
  if (error)   return <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-danger)" }}>Could not load summary: {error}</div>;
  if (!assessment) return null;

  const { assessment_ref, patient, date_of_assessment, clinician_name, clinical_outcome, follow_up_date, patient_summary, findings_recorded_at } = assessment;

  const outcomeDisplay = OUTCOME_DISPLAY[clinical_outcome] ?? null;

  const hasSummary = patient_summary || clinical_outcome;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Navigation — not printed */}
      <div className="no-print" style={{ marginBottom: 28 }}>
        <Link to={`/assessment/${key}/findings`} style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Clinical findings</Link>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "8px 20px", borderRadius: "var(--border-radius-md)", background: "var(--color-accent)", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            Print / Save as PDF
          </button>
          <Link
            to={`/assessment/${key}/report`}
            style={{ padding: "8px 20px", borderRadius: "var(--border-radius-md)", background: "var(--color-surface)", color: "var(--color-accent)", border: "1.5px solid var(--color-accent)", fontWeight: 600, fontSize: 14, cursor: "pointer", textDecoration: "none", display: "inline-block" }}
          >
            Full clinical report
          </Link>
        </div>
      </div>

      {/* Printable card */}
      <div style={{ background: "var(--color-surface)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-lg)", padding: "2.5rem 2.5rem 3rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {/* Letterhead */}
        <div style={{ borderBottom: "2px solid var(--color-border-primary)", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <img src="/memorytell-logo.png" alt="MemoryTell" style={{ height: 30, width: "auto", display: "block", marginBottom: 4 }} />
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>CogAssess — Speech Biomarker Assessment</div>
            </div>
            {assessment_ref && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Assessment reference</div>
                <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)" }}>{assessment_ref}</div>
              </div>
            )}
          </div>
        </div>

        {/* Patient and assessment info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 2rem", marginBottom: "1.75rem", fontSize: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Patient</div>
            <div style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{patient.patient_ref}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Date of assessment</div>
            <div style={{ color: "var(--color-text-primary)" }}>{date_of_assessment}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Clinician</div>
            <div style={{ color: "var(--color-text-primary)" }}>{clinician_name}</div>
          </div>
          {findings_recorded_at && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Findings recorded</div>
              <div style={{ color: "var(--color-text-primary)" }}>{new Date(findings_recorded_at).toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
          )}
        </div>

        {!hasSummary ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>
            No clinical findings have been recorded for this assessment yet.{" "}
            <Link to={`/assessment/${key}/findings`} style={{ color: "var(--color-accent)" }}>Record findings</Link>
          </div>
        ) : (
          <>
            {/* Outcome badge */}
            {outcomeDisplay && (
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Outcome</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: "var(--border-radius-md)", background: outcomeDisplay.bg, color: outcomeDisplay.color, fontWeight: 700, fontSize: 14 }}>
                  {outcomeDisplay.label}
                </div>
                {follow_up_date && (
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "8px 0 0" }}>
                    Follow-up date: <strong>{new Date(follow_up_date + "T12:00:00").toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "numeric" })}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Patient summary text */}
            {patient_summary ? (
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Summary</div>
                <p style={{ fontSize: 15, color: "var(--color-text-primary)", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
                  {patient_summary}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)", fontStyle: "italic", margin: "0 0 1.5rem" }}>
                No patient-facing summary was provided for this assessment.
              </p>
            )}

            {/* Disclaimer */}
            <div style={{ borderTop: "0.5px solid var(--color-border-primary)", paddingTop: "1.25rem", marginTop: "1.25rem" }}>
              <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", lineHeight: 1.6, margin: 0 }}>
                This summary is provided by your clinician following a speech biomarker assessment using the CogAssess platform. It does not constitute a medical diagnosis. If you have questions about your results, please speak with your clinician.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
