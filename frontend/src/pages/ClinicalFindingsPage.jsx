import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:8000";

const OUTCOMES = [
  { value: "no_issue",          label: "No issue found",                  description: "Speech biomarkers within typical range. No follow-up required at this time.", followUp: false },
  { value: "monitor_3m",        label: "Monitor — review in 3 months",    description: "Mild indicators noted. Recommend reassessment in 3 months.", followUp: true },
  { value: "monitor_6m",        label: "Monitor — review in 6 months",    description: "Some indicators warrant monitoring. Reassess in 6 months.", followUp: true },
  { value: "monitor_12m",       label: "Monitor — review in 12 months",   description: "Low-level indicators. Annual monitoring recommended.", followUp: true },
  { value: "refer_specialist",  label: "Refer for specialist review",      description: "Findings suggest referral to relevant specialist.", followUp: false },
  { value: "refer_urgent",      label: "Refer urgently",                  description: "Results require prompt specialist assessment.", followUp: false },
];

function outcomeLabel(value) {
  return OUTCOMES.find(o => o.value === value)?.label ?? value;
}

export default function ClinicalFindingsPage() {
  const { key } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState(null);

  const [outcome, setOutcome]           = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [patientSummary, setPatientSummary] = useState("");

  useEffect(() => {
    fetch(`${API}/assessments/${key}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        setAssessment(data);
        if (data.clinical_outcome)          setOutcome(data.clinical_outcome);
        if (data.follow_up_date)            setFollowUpDate(data.follow_up_date);
        if (data.clinical_notes_findings)   setInternalNotes(data.clinical_notes_findings);
        if (data.patient_summary)           setPatientSummary(data.patient_summary);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [key, token]);

  const selectedOutcome = OUTCOMES.find(o => o.value === outcome);
  const needsFollowUp   = selectedOutcome?.followUp ?? false;

  async function handleSave(e) {
    e.preventDefault();
    if (!outcome) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`${API}/assessments/${key}/findings`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          clinical_outcome: outcome,
          follow_up_period: selectedOutcome?.label ?? null,
          follow_up_date: needsFollowUp ? followUpDate : null,
          clinical_notes_findings: internalNotes || null,
          patient_summary: patientSummary || null,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading…</div>;
  if (!assessment) return null;

  const { assessment_ref, patient, date_of_assessment } = assessment;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link to={`/assessment/${key}/report`} style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Back to report</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "10px 0 4px", color: "var(--color-text-primary)" }}>
          Clinical Findings
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "var(--color-text-secondary)", alignItems: "center" }}>
          {assessment_ref && (
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-text-primary)", background: "var(--color-background-secondary)", padding: "1px 8px", borderRadius: 4, border: "0.5px solid var(--color-border-secondary)" }}>
              {assessment_ref}
            </span>
          )}
          <span><strong>Patient:</strong> {patient.patient_ref}</span>
          <span><strong>Date:</strong> {date_of_assessment}</span>
        </div>
      </div>

      {/* Clinician notice */}
      <div style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", marginBottom: 28, fontSize: 13, color: "var(--color-text-warning)", lineHeight: 1.5 }}>
        <strong>Clinician-only record.</strong> Internal notes and clinical outcome are not shared with the patient. The patient summary (if written) can be provided via the patient summary page.
      </div>

      <form onSubmit={handleSave}>
        {/* Outcome selection */}
        <section style={{ background: "var(--color-surface)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Clinical outcome</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>Select the outcome that best reflects your clinical judgement after reviewing the results.</p>

          <div style={{ display: "grid", gap: 10 }}>
            {OUTCOMES.map(opt => (
              <label key={opt.value} style={{ display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer", padding: "12px 14px", borderRadius: "var(--border-radius-md)", border: `1.5px solid ${outcome === opt.value ? "var(--color-accent)" : "var(--color-border-primary)"}`, background: outcome === opt.value ? "var(--color-background-info)" : "var(--color-surface)", transition: "border-color 0.15s, background 0.15s" }}>
                <input
                  type="radio"
                  name="outcome"
                  value={opt.value}
                  checked={outcome === opt.value}
                  onChange={() => setOutcome(opt.value)}
                  style={{ marginTop: 2, accentColor: "var(--color-accent)", flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Follow-up date (conditional) */}
        {needsFollowUp && (
          <section style={{ background: "var(--color-surface)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: 20 }}>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", display: "block", marginBottom: 6 }}>Follow-up date</span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 10 }}>Planned date for review or next appointment.</span>
              <input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                style={{ fontSize: 14, padding: "8px 12px", borderRadius: "var(--border-radius-md)", border: "1px solid var(--color-border-primary)", color: "var(--color-text-primary)", background: "var(--color-surface)", width: "100%", maxWidth: 280, boxSizing: "border-box" }}
              />
            </label>
          </section>
        )}

        {/* Internal clinical notes */}
        <section style={{ background: "var(--color-surface)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: 20 }}>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", display: "block", marginBottom: 2 }}>Internal clinical notes</span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 10 }}>For clinical record only. Not visible to the patient.</span>
            <textarea
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              rows={5}
              placeholder="Add clinical observations, differential considerations, or context relevant to this assessment…"
              style={{ width: "100%", fontSize: 14, lineHeight: 1.6, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "1px solid var(--color-border-primary)", color: "var(--color-text-primary)", background: "var(--color-surface)", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </label>
        </section>

        {/* Patient summary */}
        <section style={{ background: "var(--color-surface)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: 28 }}>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", display: "block", marginBottom: 2 }}>Patient summary</span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 10 }}>Plain-language summary suitable for sharing with the patient. No scores or clinical scores included. Leave blank if no patient-facing communication is needed.</span>
            <textarea
              value={patientSummary}
              onChange={e => setPatientSummary(e.target.value)}
              rows={6}
              placeholder="e.g. Your speech assessment today was completed successfully. Based on the results, no immediate concerns were identified. Your clinician will review these results and be in touch…"
              style={{ width: "100%", fontSize: 14, lineHeight: 1.6, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "1px solid var(--color-border-primary)", color: "var(--color-text-primary)", background: "var(--color-surface)", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </label>
        </section>

        {/* Error */}
        {error && (
          <p style={{ fontSize: 13, color: "var(--color-text-danger)", marginBottom: 16 }}>Error: {error}</p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="submit"
            disabled={!outcome || saving}
            style={{ padding: "10px 24px", borderRadius: "var(--border-radius-md)", background: !outcome ? "var(--color-border-secondary)" : "var(--color-accent)", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: !outcome ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving…" : "Save findings"}
          </button>

          {saved && patientSummary && (
            <button
              type="button"
              onClick={() => navigate(`/assessment/${key}/summary`)}
              style={{ padding: "10px 20px", borderRadius: "var(--border-radius-md)", background: "var(--color-surface)", color: "var(--color-accent)", border: "1.5px solid var(--color-accent)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              View patient summary →
            </button>
          )}

          {saved && (
            <span style={{ fontSize: 13, color: "#0f6e56", fontWeight: 600 }}>Findings saved</span>
          )}
        </div>
      </form>
    </div>
  );
}
