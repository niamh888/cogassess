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

  const [outcome, setOutcome]                       = useState("");
  const [confirmedDiagnosis, setConfirmedDiagnosis] = useState("");
  const [followUpDate, setFollowUpDate]             = useState("");
  const [internalNotes, setInternalNotes]           = useState("");
  const [patientSummary, setPatientSummary]         = useState("");
  const [changeReason, setChangeReason]             = useState("");
  const [history, setHistory]                       = useState([]);

  useEffect(() => {
    fetch(`${API}/assessments/${key}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        setAssessment(data);
        if (data.clinical_outcome)          setOutcome(data.clinical_outcome);
        if (data.clinical_outcome_label)    setConfirmedDiagnosis(data.clinical_outcome_label);
        if (data.follow_up_date)            setFollowUpDate(data.follow_up_date);
        if (data.clinical_notes_findings)   setInternalNotes(data.clinical_notes_findings);
        if (data.patient_summary)           setPatientSummary(data.patient_summary);
        // Load audit history
        return fetch(`${API}/assessments/${key}/findings/history`, { headers: { Authorization: `Bearer ${token}` } });
      })
      .then(r => r && r.ok ? r.json() : [])
      .then(h => setHistory(h))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [key, token]);

  const selectedOutcome = OUTCOMES.find(o => o.value === outcome);
  const needsFollowUp   = selectedOutcome?.followUp ?? false;
  const isAmendment     = !!assessment?.findings_recorded_at;

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
          change_reason: isAmendment ? changeReason : null,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${r.status}`);
      }
      // Save confirmed diagnosis label (for monitoring metrics)
      await fetch(`${API}/assessments/${key}/clinical-label`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ label: confirmedDiagnosis || null }),
      });
      setChangeReason("");
      setSaved(true);
      // Refresh history
      const h = await fetch(`${API}/assessments/${key}/findings/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (h.ok) setHistory(await h.json());
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
      <div style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", marginBottom: isAmendment ? 12 : 28, fontSize: 13, color: "var(--color-text-warning)", lineHeight: 1.5 }}>
        <strong>Clinician-only record.</strong> Internal notes and clinical outcome are not shared with the patient. The patient summary (if written) can be provided via the patient summary page.
      </div>

      {/* Amendment banner */}
      {isAmendment && (
        <div style={{ background: "#fdeaea", border: "0.5px solid #f5a0a0", borderRadius: "var(--border-radius-md)", padding: "12px 16px", marginBottom: 28, fontSize: 13, color: "#c62828", lineHeight: 1.6 }}>
          <strong>Amending signed findings.</strong> These findings were previously signed on {new Date(assessment.findings_recorded_at).toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "2-digit" })}. Every change is recorded in the audit trail below. A reason for amendment is required.
        </div>
      )}

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

        {/* Confirmed diagnosis for monitoring */}
        <section style={{ background: "var(--color-surface)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Confirmed diagnosis</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
            If a formal diagnosis has been reached, record it here. This is used by the system to measure its own accuracy over time — it never affects the assessment scores or the patient record.
            Leave blank if a diagnosis has not yet been confirmed.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { value: "normal",   label: "Cognitively normal",                 desc: "No significant cognitive impairment identified." },
              { value: "mci",      label: "Mild Cognitive Impairment (MCI)",    desc: "Noticeable decline beyond normal ageing; not meeting dementia criteria." },
              { value: "dementia", label: "Dementia",                           desc: "Significant cognitive impairment affecting daily functioning." },
              { value: "other",    label: "Other / unclear",                    desc: "Does not fit standard categories, or diagnosis is uncertain at this time." },
            ].map(opt => (
              <label key={opt.value} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", padding: "12px 14px", borderRadius: "var(--border-radius-md)", border: `1.5px solid ${confirmedDiagnosis === opt.value ? "var(--color-accent)" : "var(--color-border-primary)"}`, background: confirmedDiagnosis === opt.value ? "var(--color-background-info)" : "var(--color-surface)", transition: "border-color 0.15s, background 0.15s" }}>
                <input
                  type="radio"
                  name="confirmedDiagnosis"
                  value={opt.value}
                  checked={confirmedDiagnosis === opt.value}
                  onChange={() => setConfirmedDiagnosis(opt.value)}
                  style={{ marginTop: 2, accentColor: "var(--color-accent)", flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          {confirmedDiagnosis && (
            <button
              type="button"
              onClick={() => setConfirmedDiagnosis("")}
              style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-tertiary)", padding: 0, textDecoration: "underline" }}
            >
              Clear selection
            </button>
          )}
        </section>

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

        {/* Reason for amendment (required when editing signed findings) */}
        {isAmendment && (
          <section style={{ background: "#fdeaea", border: "0.5px solid #f5a0a0", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: 28 }}>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#c62828", display: "block", marginBottom: 2 }}>Reason for amendment <span style={{ fontWeight: 400 }}>(required)</span></span>
              <span style={{ fontSize: 12, color: "#c62828", opacity: 0.8, display: "block", marginBottom: 10 }}>This reason will be permanently recorded in the audit trail alongside the previous version of the findings.</span>
              <textarea
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
                rows={3}
                required
                placeholder="e.g. Outcome updated following specialist referral confirmation…"
                style={{ width: "100%", fontSize: 14, lineHeight: 1.6, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "1px solid #f5a0a0", color: "var(--color-text-primary)", background: "#fff", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </label>
          </section>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize: 13, color: "var(--color-text-danger)", marginBottom: 16 }}>Error: {error}</p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="submit"
            disabled={!outcome || saving || (isAmendment && !changeReason.trim())}
            style={{ padding: "10px 24px", borderRadius: "var(--border-radius-md)", background: (!outcome || (isAmendment && !changeReason.trim())) ? "var(--color-border-secondary)" : "var(--color-accent)", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: (!outcome || (isAmendment && !changeReason.trim())) ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving…" : isAmendment ? "Save amendment" : "Save findings"}
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

      {/* Audit trail */}
      {history.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Findings audit trail ({history.length} {history.length === 1 ? "entry" : "entries"})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((entry, i) => (
              <div key={i} style={{ background: "var(--color-surface)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-md)", padding: "14px 18px", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: entry.action === "initial" ? "#0f6e56" : "#854f0b", background: entry.action === "initial" ? "#e1f5ee" : "#faeeda", border: `0.5px solid ${entry.action === "initial" ? "#b8d4c0" : "#f5d08a"}`, borderRadius: 4, padding: "1px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {entry.action === "initial" ? "Initial findings" : "Amendment"}
                  </span>
                  <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>
                    {entry.clinician_name} · {new Date(entry.recorded_at).toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "2-digit" })} at {new Date(entry.recorded_at).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div style={{ color: "var(--color-text-primary)" }}>
                  <strong>Outcome:</strong> {outcomeLabel(entry.clinical_outcome)}
                  {entry.follow_up_date && <span> · <strong>Follow-up:</strong> {new Date(entry.follow_up_date + "T12:00:00").toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "2-digit" })}</span>}
                </div>
                {entry.change_reason && (
                  <p style={{ margin: "6px 0 0", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                    Reason: {entry.change_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
