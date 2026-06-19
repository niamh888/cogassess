import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { TASKS } from "../data/tasks";
import { CONDITIONS } from "../data/conditions";

const API = "http://localhost:8000";

const AGE_BANDS     = ["Under 18","18–24","25–34","35–44","45–54","55–64","65–74","75–84","85+"];
const REFERRAL_SRCS = ["GP","Neurology","Psychiatry","Memory clinic","Psychology","Self-referral","Other"];
const REASONS       = ["Cognitive decline concern","Dementia assessment","Post-stroke","Post-COVID cognition","Routine monitoring","Research study","Other"];
const ENVIRONMENTS  = ["Quiet clinical room","Clinical setting — some background noise","Home visit — quiet","Home visit — noisy","Remote / video call","Noisy environment","Other"];

const STEP_LABELS = ["Patient", "Assessment", "Tasks"];

export default function IntakePage() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [step, setStep]       = useState(1);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 1 — patient
  const [patientRef,   setPatientRef]   = useState("");
  const [dob,          setDob]          = useState("");
  const [ageBand,      setAgeBand]      = useState("");
  const [language,     setLanguage]     = useState("en");
  const [l1Language,   setL1Language]   = useState("English");

  // Step 2 — assessment
  const [dateOfAssessment,  setDateOfAssessment]  = useState(new Date().toISOString().split("T")[0]);
  const [assessmentType,    setAssessmentType]    = useState("initial");
  const [referralSource,    setReferralSource]    = useState("");
  const [reason,            setReason]            = useState("");
  const [notes,             setNotes]             = useState("");
  const [environment,       setEnvironment]       = useState("Quiet clinical room");

  // Step 3 — task battery
  const [selectedCondition, setSelectedCondition] = useState("general_screen");
  const [selectedTaskIds,   setSelectedTaskIds]   = useState(["routine", "fluency", "memory"]);

  // Under-18 safeguard
  const [showUnder18Modal,    setShowUnder18Modal]    = useState(false);
  const [under18Acknowledged, setUnder18Acknowledged] = useState(false);

  // Unvalidated indication safeguard
  const [showUnvalidatedModal,    setShowUnvalidatedModal]    = useState(false);
  const [pendingCondition,        setPendingCondition]        = useState(null);

  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  function ageBandFromDob(dobStr) {
    if (!dobStr) return "";
    const age = Math.floor((Date.now() - new Date(dobStr).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18)  return "Under 18";
    if (age < 25)  return "18–24";
    if (age < 35)  return "25–34";
    if (age < 45)  return "35–44";
    if (age < 55)  return "45–54";
    if (age < 65)  return "55–64";
    if (age < 75)  return "65–74";
    if (age < 85)  return "75–84";
    return "85+";
  }

  function handleDobChange(val) {
    setDob(val);
    const band = ageBandFromDob(val);
    setAgeBand(band);
    if (band === "Under 18") {
      setUnder18Acknowledged(false);
      setShowUnder18Modal(true);
    }
  }

  function handleAgeBandChange(val) {
    setAgeBand(val);
    if (val === "Under 18") {
      setUnder18Acknowledged(false);
      setShowUnder18Modal(true);
    }
  }

  function applyConditionPreset(conditionId) {
    const condition = CONDITIONS.find(c => c.id === conditionId);
    if (!condition) return;
    if (!condition.validated) {
      setPendingCondition(condition);
      setShowUnvalidatedModal(true);
      return;
    }
    setSelectedCondition(conditionId);
    setSelectedTaskIds([...condition.tasks]);
  }

  function confirmUnvalidatedCondition() {
    if (!pendingCondition) return;
    setSelectedCondition(pendingCondition.id);
    setSelectedTaskIds([...pendingCondition.tasks]);
    setShowUnvalidatedModal(false);
    setPendingCondition(null);
  }

  function toggleTask(taskId) {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
    setSelectedCondition("custom");
  }

  async function handleStep1(e) {
    e.preventDefault();
    if (ageBand === "Under 18" && !under18Acknowledged) {
      setShowUnder18Modal(true);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/patients`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ patient_ref: patientRef || null, date_of_birth: dob || null, age_band: ageBand || null, language, l1_language: l1Language }),
      });
      if (res.ok) {
        const created = await res.json();
        setPatientRef(created.patient_ref);  // use the assigned ref (auto-generated or manual)
      } else {
        const err = await res.json().catch(() => ({}));
        if (!(res.status === 400 && err.detail?.includes("already exists"))) {
          throw new Error(err.detail || "Could not register patient");
        }
        // Patient already exists — patientRef stays as typed (repeat assessment)
      }
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleStep2(e) {
    e.preventDefault();
    setError(null);
    setStep(3);
  }

  async function handleStep3(e) {
    e.preventDefault();
    if (selectedTaskIds.length === 0) {
      setError("Please select at least one task.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/assessments`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          patient_ref: patientRef,
          date_of_assessment: dateOfAssessment,
          assessment_type: assessmentType,
          referral_source: referralSource || null,
          reason: reason || null,
          notes: notes || null,
          selected_tasks: selectedTaskIds,
          environment,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Could not create assessment");
      }
      const data = await res.json();
      navigate(`/assessment/${data.assessment_key}/record`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const fieldStyle = {
    width: "100%", padding: "10px 12px", fontSize: 14,
    border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)",
    outline: "none", boxSizing: "border-box", background: "var(--color-surface)", fontFamily: "var(--font-sans)",
  };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--color-text-primary)" };

  // ── Step indicator ─────────────────────────────────────────────────────────
  const StepBar = () => (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done   = step > n;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: done ? "var(--color-text-success)" : active ? "var(--color-accent)" : "var(--color-border-secondary)", color: (done || active) ? "#fff" : "var(--color-text-secondary)", flexShrink: 0 }}>
              {done ? "✓" : n}
            </div>
            <span style={{ fontSize: 12, color: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)", fontWeight: active ? 600 : 400 }}>{label}</span>
            {n < 3 && <span style={{ color: "var(--color-border-secondary)", fontSize: 12 }}>→</span>}
          </div>
        );
      })}
    </div>
  );

  const totalDuration = selectedTaskIds.reduce((sum, id) => {
    const t = TASKS.find(t => t.id === id);
    return sum + (t?.duration ?? 0);
  }, 0);

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ marginBottom: 24 }}>
        <Link to="/dashboard" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Dashboard</Link>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "12px 0 4px", color: "var(--color-text-primary)" }}>
          {{ 1: "Patient details", 2: "Assessment details", 3: "Select task battery" }[step]}
        </h1>
        <StepBar />
      </div>

      {error && (
        <div role="alert" style={{ background: "var(--color-background-danger)", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 16, color: "var(--color-text-danger)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Step 1: Patient ─────────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleStep1}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", padding: "1.5rem" }}>
            <div style={{ background: "var(--color-background-info)", border: "0.5px solid var(--color-border-info)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--color-text-info)", lineHeight: 1.5 }}>
              <strong>Data protection:</strong> Use a pseudonymised ID only. Do not enter the patient's name (GDPR Article 89).
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="patient-ref" style={labelStyle}>Patient reference ID</label>
              <input id="patient-ref" type="text" value={patientRef} onChange={e => setPatientRef(e.target.value)} placeholder="Leave blank to auto-generate (e.g. PT-2026-0001)" style={fieldStyle} />
              <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>Leave blank to auto-assign a unique ID. For repeat assessments enter the existing patient reference. Pseudonymised only — no names.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label htmlFor="dob" style={labelStyle}>Date of birth</label>
                <input id="dob" type="date" value={dob} onChange={e => handleDobChange(e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label htmlFor="age-band" style={labelStyle}>Age band <span style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}>(auto-set from DOB)</span></label>
                <select id="age-band" value={ageBand} onChange={e => handleAgeBandChange(e.target.value)} style={fieldStyle}>
                  <option value="">— Select —</option>
                  {AGE_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label htmlFor="language" style={labelStyle}>Assessment language</label>
                <select id="language" value={language} onChange={e => setLanguage(e.target.value)} style={fieldStyle}>
                  <option value="en">English</option>
                  <option value="ga">Irish (Gaeilge)</option>
                </select>
              </div>
              <div>
                <label htmlFor="l1-language" style={labelStyle}>Patient's first language</label>
                <input id="l1-language" type="text" value={l1Language} onChange={e => setL1Language(e.target.value)} placeholder="e.g. English, Polish, Arabic…" style={fieldStyle} />
                {l1Language && l1Language.trim().toLowerCase() !== "english" && (
                  <p style={{ fontSize: 12, color: "#854f0b", margin: "4px 0 0" }}>
                    Non-English L1 — fluency and word retrieval scores may be affected.
                  </p>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="button" onClick={() => navigate("/dashboard")} style={{ padding: "10px 20px", background: "transparent", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: "10px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, fontFamily: "var(--font-sans)" }}>
              {loading ? "Checking…" : "Continue →"}
            </button>
          </div>
        </form>
      )}

      {/* ── Step 2: Assessment details ───────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={handleStep2}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", padding: "1.5rem" }}>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
              Patient: <strong style={{ color: "var(--color-text-primary)" }}>{patientRef}</strong>
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label htmlFor="date-assessment" style={labelStyle}>Date of assessment <span style={{ color: "var(--color-text-danger)" }}>*</span></label>
                <input id="date-assessment" type="date" required value={dateOfAssessment} onChange={e => setDateOfAssessment(e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label htmlFor="assessment-type" style={labelStyle}>Assessment type <span style={{ color: "var(--color-text-danger)" }}>*</span></label>
                <select id="assessment-type" value={assessmentType} onChange={e => setAssessmentType(e.target.value)} style={fieldStyle}>
                  <option value="initial">Initial</option>
                  <option value="repeat">Repeat (follow-up)</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label htmlFor="referral" style={labelStyle}>Referral source</label>
                <select id="referral" value={referralSource} onChange={e => setReferralSource(e.target.value)} style={fieldStyle}>
                  <option value="">— Select —</option>
                  {REFERRAL_SRCS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="reason" style={labelStyle}>Reason for assessment</label>
                <select id="reason" value={reason} onChange={e => setReason(e.target.value)} style={fieldStyle}>
                  <option value="">— Select —</option>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="notes" style={labelStyle}>Clinical notes (optional)</label>
              <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Background, medications, relevant history…" style={{ ...fieldStyle, resize: "vertical" }} />
            </div>

            <div style={{ borderTop: "0.5px solid var(--color-border-primary)", paddingTop: 16, marginTop: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 12px" }}>Session conditions</p>
              <div>
                <label htmlFor="environment" style={labelStyle}>Assessment environment</label>
                <select id="environment" value={environment} onChange={e => setEnvironment(e.target.value)} style={fieldStyle}>
                  {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>
                  Any interruptions that occur during the session can be recorded on the report page afterwards.
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="button" onClick={() => setStep(1)} style={{ padding: "10px 20px", background: "transparent", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" }}>← Back</button>
            <button type="submit" style={{ flex: 1, padding: "10px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              Continue →
            </button>
          </div>
        </form>
      )}

      {/* ── Step 3: Task battery ─────────────────────────────────────────── */}
      {step === 3 && (
        <form onSubmit={handleStep3}>
          {/* Condition presets */}
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", padding: "1.5rem", marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 4px" }}>Suspected condition or referral reason</p>
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 14px" }}>Select a preset to auto-populate the recommended task battery. You can still adjust individual tasks below.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {CONDITIONS.map(c => {
                const active = selectedCondition === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => applyConditionPreset(c.id)}
                    style={{
                      textAlign: "left", padding: "10px 12px", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)",
                      border: active ? `1.5px solid ${c.color}` : "0.5px solid var(--color-border-secondary)",
                      background: active ? `${c.color}12` : "var(--color-surface)",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <i className={`ti ${c.icon}`} style={{ fontSize: 14, color: active ? c.color : "var(--color-text-tertiary)" }} aria-hidden="true" />
                      <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? c.color : "var(--color-text-primary)" }}>{c.label}</span>
                      {c.validated && <span style={{ fontSize: 10, fontWeight: 700, color: "#0f6e56", background: "#e1f5ee", padding: "1px 6px", borderRadius: 100, border: "0.5px solid #a7f3d0", flexShrink: 0 }}>CLINICAL USE</span>}
                      {!c.validated && <span style={{ fontSize: 10, fontWeight: 700, color: "#854f0b", background: "#faeeda", padding: "1px 6px", borderRadius: 100, border: "0.5px solid #f5d08a", flexShrink: 0 }}>IN DEVELOPMENT</span>}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0, lineHeight: 1.4 }}>{c.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task toggles */}
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", padding: "1.5rem", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 2px" }}>Assessment tasks</p>
                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>
                  {selectedTaskIds.length} task{selectedTaskIds.length !== 1 ? "s" : ""} selected · approx. {Math.ceil(totalDuration / 60)} min
                </p>
              </div>
              <button type="button" onClick={() => { setSelectedTaskIds([]); setSelectedCondition("custom"); }} style={{ fontSize: 12, color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)" }}>
                Clear all
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TASKS.map(task => {
                const selected = selectedTaskIds.includes(task.id);
                return (
                  <label
                    key={task.id}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: "var(--border-radius-md)", cursor: "pointer",
                      border: selected ? "1.5px solid var(--color-accent)" : "0.5px solid var(--color-border-secondary)",
                      background: selected ? "#e6f1fb" : "var(--color-surface)",
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleTask(task.id)}
                      style={{ marginTop: 2, flexShrink: 0, accentColor: "var(--color-accent)", width: 16, height: 16 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{task.title}</span>
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", background: "var(--color-background-secondary)", padding: "1px 6px", borderRadius: 100, border: "0.5px solid var(--color-border-secondary)", flexShrink: 0 }}>
                          {task.domain}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", flexShrink: 0 }}>
                          {task.duration}s
                        </span>
                        {task.clinicianNote && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#854f0b", background: "#faeeda", padding: "1px 6px", borderRadius: 100, border: "0.5px solid #f5d08a", flexShrink: 0 }}>
                            CLINICIAN PREP
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "3px 0 0", lineHeight: 1.4 }}>{task.measures}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {selectedTaskIds.length === 0 && (
            <div style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "var(--color-text-warning)" }}>
              Select at least one task to continue.
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setStep(2)} style={{ padding: "10px 20px", background: "transparent", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" }}>← Back</button>
            <button type="submit" disabled={loading || selectedTaskIds.length === 0} style={{ flex: 1, padding: "10px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 600, cursor: (loading || selectedTaskIds.length === 0) ? "not-allowed" : "pointer", opacity: (loading || selectedTaskIds.length === 0) ? 0.6 : 1, fontFamily: "var(--font-sans)" }}>
              {loading ? "Creating…" : `Start assessment (${selectedTaskIds.length} task${selectedTaskIds.length !== 1 ? "s" : ""}) →`}
            </button>
          </div>
        </form>
      )}

      {/* ── Unvalidated indication modal ────────────────────────────────── */}
      {showUnvalidatedModal && pendingCondition && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "2px solid var(--color-border-warning)", padding: "2rem", maxWidth: 500, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 26 }} aria-hidden="true">⚠️</span>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-warning)", margin: 0 }}>Warning — Not Validated for This Indication</h2>
            </div>
            <p style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.6, margin: "0 0 10px" }}>
              CogAssess is currently approved for clinical investigation use in <strong>Early / possible dementia</strong> only (per CA-IB-001).
            </p>
            <p style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.6, margin: "0 0 10px" }}>
              The <strong>{pendingCondition.label}</strong> preset has not been validated by the manufacturer and is not approved for use in the current clinical investigation.
            </p>
            <p style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.6, margin: "0 0 24px" }}>
              Proceeding is permitted for exploratory research purposes only and must not be used to inform clinical decisions. Any such use should be reported to the manufacturer: <strong>info@memorytell.com</strong>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={() => { setShowUnvalidatedModal(false); setPendingCondition(null); }}
                style={{ padding: "11px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                ← Go back and select an approved indication
              </button>
              <button
                type="button"
                onClick={confirmUnvalidatedCondition}
                style={{ padding: "11px 20px", background: "transparent", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, color: "var(--color-text-tertiary)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                Proceed anyway — exploratory research use only, not for clinical decisions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Under-18 warning modal ──────────────────────────────────────── */}
      {showUnder18Modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "2px solid var(--color-border-warning)", padding: "2rem", maxWidth: 480, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 26 }} aria-hidden="true">⚠️</span>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-warning)", margin: 0 }}>Warning — Outside Intended Use</h2>
            </div>
            <p style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.6, margin: "0 0 10px" }}>
              CogAssess is validated for use with adults aged <strong>18 years and over</strong>. This patient's age is below 18.
            </p>
            <p style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.6, margin: "0 0 24px" }}>
              Proceeding is outside the validated intended use of this software, is not advised, and may constitute misuse. Any such use should be reported to the manufacturer: <strong>info@memorytell.com</strong>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={() => { setDob(""); setAgeBand(""); setShowUnder18Modal(false); }}
                style={{ padding: "11px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                ← Go back and correct patient details
              </button>
              <button
                type="button"
                onClick={() => { setUnder18Acknowledged(true); setShowUnder18Modal(false); }}
                style={{ padding: "11px 20px", background: "transparent", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, color: "var(--color-text-tertiary)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                Proceed anyway — I acknowledge this is outside the validated intended use
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
