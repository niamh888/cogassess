import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

function MetricBadge({ status }) {
  const MAP = {
    stable:            { label: "Stable",   bg: "#e5f4f5", color: "#1d666e" },
    watch:             { label: "Watch",    bg: "#faeeda", color: "#854f0b" },
    drift:             { label: "Drift",    bg: "#fee2e2", color: "#991b1b" },
    insufficient_data: { label: "No data", bg: "#f3f4f6", color: "#6b7280" },
  };
  const s = MAP[status] ?? MAP.insufficient_data;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700,
                   padding: "2px 7px", borderRadius: 100, letterSpacing: "0.06em",
                   textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

const API = "http://localhost:8000";

const STAGE_LABELS = {
  stt:        "Speech-to-Text (Chirp)",
  acoustic:   "Acoustic Features",
  morphology: "Morphological Analysis",
  semantics:  "Semantic Analysis",
  emotion:    "Emotion Detection",
};

const STAGE_DISPLAY = {
  stt:        "Speech-to-Text",
  acoustic:   "Acoustic",
  morphology: "Morphology",
  semantics:  "Semantics",
  emotion:    "Emotion",
  scores:     "Scores",
};

const FEATURE_PATH_DISPLAY = {
  "clinical.sensitivity": "Clinical — Sensitivity",
  "clinical.specificity": "Clinical — Specificity",
};

function featurePathLabel(path) {
  return FEATURE_PATH_DISPLAY[path] ?? path;
}

const SCORE_LABELS = {
  composite:            "Composite",
  motor_speech:         "Motor Speech",
  semantic_memory:      "Semantic Memory",
  episodic_memory:      "Episodic Memory",
  emotional_processing: "Emotional Processing",
};

const DRIFT_STATUS = {
  stable:            { label: "Stable",   bg: "#e5f4f5", color: "#1d666e" },
  watch:             { label: "Watch",    bg: "#faeeda", color: "#854f0b" },
  drift:             { label: "Drift",    bg: "#fee2e2", color: "#991b1b" },
  insufficient_data: { label: "No data", bg: "#f3f4f6", color: "#6b7280" },
};

const DRIFT_COLS = [
  { key: "feature",  label: "Feature" },
  { key: "baseline", label: "Baseline μ ± σ" },
  { key: "window",   label: "Window μ" },
  { key: "zscore",   label: "Z-score" },
  { key: "psi",      label: "PSI" },
  { key: "ks",       label: "K-S stat" },
  { key: "cusum",    label: "CUSUM" },
  { key: "overall",  label: "Overall" },
];

const METRIC_HELP = {
  feature: {
    title: "Feature",
    body: "The name of the speech biomarker being tracked, grouped by pipeline stage (Speech-to-Text, Acoustic, Morphology, Semantics, Emotion, Scores). Each feature is monitored independently so a change in one area can be identified precisely.",
  },
  baseline: {
    title: "Baseline μ ± σ",
    body: "The average (μ) and standard deviation (σ) of this feature from the baseline period — the reference distribution the system learned when you first pressed Compute Baseline. All drift detection compares current values against this reference. Re-computing the baseline will update this reference.",
  },
  window: {
    title: "Window μ",
    body: "The average value of this feature across the most recent assessments (up to the last 20 submissions). This is the current window being compared against baseline. If a feature is trending, you'll see this diverge from the Baseline μ.",
  },
  zscore: {
    title: "Z-score (Mean Shift)",
    body: "Measures how far the current window average has moved from baseline, in units of standard deviations.\n\n• Below 1.5 — Stable: normal variation\n• 1.5–2.5 — Watch: moderate shift, monitor at next review\n• Above 2.5 — Drift: clinically notable shift\n\nA high Z-score with a stable PSI suggests the mean has shifted but the overall distribution shape is unchanged (e.g. all patients are speaking slightly faster). A high Z-score with high PSI suggests a more fundamental change.",
  },
  psi: {
    title: "PSI — Population Stability Index",
    body: "Measures whether the overall spread and shape of the distribution has changed, not just the average. PSI detects changes a Z-score can miss — e.g. if low scorers are improving but high scorers are declining, the average stays the same but PSI rises.\n\n• Below 0.10 — Stable\n• 0.10–0.25 — Watch\n• Above 0.25 — Drift\n\nRequires at least 20 baseline assessments to compute reliably. Shown as — until that threshold is reached.",
  },
  ks: {
    title: "K-S Stat — Kolmogorov–Smirnov Test",
    body: "A statistical test that compares the full distribution of current values against baseline without assuming a particular shape. It is sensitive to shifts anywhere in the distribution — top, bottom, or middle.\n\n• Below 0.20 — Stable\n• 0.20–0.40 — Watch\n• Above 0.40 — Drift\n\nThe hover tooltip shows the p-value: a small p-value (e.g. < 0.05) means the difference is statistically unlikely to be random variation.",
  },
  cusum: {
    title: "CUSUM — Cumulative Sum",
    body: "Detects slow, sustained trends that might not trigger a Z-score alert on any single comparison. CUSUM accumulates small but consistent deviations over time.\n\n• Below 2 — Stable\n• 2–5 — Watch\n• Above 5 — Drift (in standard deviation units)\n\nA high CUSUM with a stable Z-score suggests gradual drift rather than a sudden step change — for example, a microphone slowly degrading or a gradual shift in the patient population being assessed.",
  },
  overall: {
    title: "Overall Status",
    body: "The most concerning status across all four metrics for this feature. A feature is Stable only if all metrics agree.\n\n• Stable — no action needed\n• Watch — a possible change has been detected; review at your next monitoring cycle (monthly is typical)\n• Drift — a statistically significant departure from baseline has been detected; formal change assessment is required per the change control plan before continuing routine use",
  },
};

const CHART_STAGES = ["stt", "acoustic", "morphology", "semantics", "emotion"];
const SCORE_COLS   = ["composite", "motor_speech", "semantic_memory", "episodic_memory", "emotional_processing"];

export default function MonitoringPage() {
  const { token } = useAuth();

  const [perf, setPerf]               = useState(null);
  const [drift, setDrift]             = useState(null);
  const [events, setEvents]           = useState([]);
  const [clinical, setClinical]       = useState(null);
  const [perfLoading, setPerfLoading] = useState(true);
  const [driftLoading, setDriftLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [perfError, setPerfError]     = useState(null);
  const [driftError, setDriftError]   = useState(null);
  const [computing, setComputing]     = useState(false);
  const [computeMsg, setComputeMsg]   = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [helpTopic, setHelpTopic]     = useState(null);

  const loadPerf = useCallback(() => {
    setPerfLoading(true);
    setPerfError(null);
    fetch(`${API}/monitoring/performance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPerf)
      .catch(() => setPerfError("Could not load performance data. Is the server running?"))
      .finally(() => setPerfLoading(false));
  }, [token]);

  const loadDrift = useCallback(() => {
    setDriftLoading(true);
    fetch(`${API}/monitoring/drift`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 400) return r.json().then(d => { throw new Error(d.detail); });
        if (!r.ok) throw new Error("Could not load drift data.");
        return r.json();
      })
      .then(data => { setDrift(data); setDriftError(null); })
      .catch(e => setDriftError(e.message))
      .finally(() => setDriftLoading(false));
  }, [token]);

  const loadEvents = useCallback(() => {
    setEventsLoading(true);
    fetch(`${API}/monitoring/change-events`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setEvents)
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, [token]);

  const loadClinical = useCallback(() => {
    fetch(`${API}/monitoring/performance/clinical`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setClinical(d);
        // If the endpoint generated new change events, reload the events list so
        // the red banner and change events table update without a manual refresh.
        if (d.new_change_events > 0) loadEvents();
      })
      .catch(() => {});
  }, [token, loadEvents]);

  useEffect(() => { loadPerf();    }, [loadPerf]);
  useEffect(() => { loadDrift();   }, [loadDrift]);
  useEffect(() => { loadEvents();  }, [loadEvents]);
  useEffect(() => { loadClinical(); }, [loadClinical]);

  function handleComputeBaseline() {
    setComputing(true);
    setComputeMsg(null);
    fetch(`${API}/monitoring/baseline/compute`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.detail || "Failed."); });
        return r.json();
      })
      .then(d => {
        setComputeMsg(d.message ?? "Baseline computed.");
        loadDrift();
        loadEvents();
      })
      .catch(e => setComputeMsg(e.message ?? "Failed to compute baseline."))
      .finally(() => setComputing(false));
  }

  function handleReview(eventId, action) {
    const notes = action === "reviewed"
      ? window.prompt("Enter review notes (optional):", "") ?? ""
      : "";
    setReviewingId(eventId);
    fetch(`${API}/monitoring/change-events/${eventId}/review`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, review_notes: notes }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(() => loadEvents())
      .catch(() => {})
      .finally(() => setReviewingId(null));
  }

  const openEventCount = events.filter(e => e.status === "open").length;

  // Max avg_ms across chart stages, used to scale bars
  const maxAvgMs = perf
    ? Math.max(...CHART_STAGES.map(s => perf.stage_timings?.[s]?.avg_ms ?? 0), 1)
    : 1;

  // Group drift features by stage
  const featuresByStage = drift
    ? Object.entries(drift.features).reduce((acc, [path, data]) => {
        const stage = data.stage ?? path.split(".")[0];
        if (!acc[stage]) acc[stage] = [];
        acc[stage].push({ path, ...data });
        return acc;
      }, {})
    : {};

  const stageOrder = ["stt", "acoustic", "morphology", "semantics", "emotion", "scores"];
  const orderedStages = stageOrder.filter(s => featuresByStage[s]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>

      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-text-tertiary)", margin: "0 0 4px", textTransform: "uppercase" }}>
          CogAssess · Change management
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
          Pipeline Monitoring
        </h1>
      </div>

      {/* ── Section 0: Change Events ─────────────────────────────────────── */}
      {openEventCount > 0 && (
        <div style={{ background: "#fee2e2", border: "0.5px solid #fca5a5", borderRadius: "var(--border-radius-md)", padding: "10px 16px", marginBottom: 24, fontSize: 13, color: "#991b1b", lineHeight: 1.6 }}>
          <strong>{openEventCount} open change event{openEventCount > 1 ? "s" : ""}</strong> — one or more metrics have breached a threshold in the change control plan. Formal review is required before continued clinical use.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
          Change Events
        </h2>
        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
          Logged to <code>logs/change_events.md</code>
        </span>
      </div>

      {eventsLoading && <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>Loading…</p>}

      {!eventsLoading && events.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 32 }}>
          No change events recorded. Events are created automatically when a data drift check or clinical performance metric breaches a threshold.
        </p>
      )}

      {events.length > 0 && (
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", overflow: "hidden", marginBottom: 36 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid var(--color-border-primary)", background: "var(--color-background-secondary)" }}>
                {["Opened", "Feature", "Breach", "Detail", "Status", "Reviewed by", ""].map((h, i) => (
                  <th key={i} style={{ padding: "9px 14px", textAlign: i >= 5 ? "right" : "left", fontWeight: 600, fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(e => {
                const isOpen   = e.status === "open";
                const statusBg = isOpen ? "#fee2e2" : e.status === "reviewed" ? "#e5f4f5" : "#f3f4f6";
                const statusCl = isOpen ? "#991b1b" : e.status === "reviewed" ? "#1d666e" : "#6b7280";
                return (
                  <tr key={e.id} style={{ borderBottom: "0.5px solid var(--color-border-primary)" }}>
                    <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                      {new Date(e.opened_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-primary)" }}>
                      {featurePathLabel(e.feature_path)}
                    </td>
                    <td style={{ padding: "9px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {e.breach_type.replace("_", " ")}
                    </td>
                    <td style={{ padding: "9px 14px", fontSize: 12, color: "var(--color-text-secondary)", maxWidth: 280 }}>
                      {e.detail?.detail ?? "—"}
                    </td>
                    <td style={{ padding: "9px 14px" }}>
                      <span style={{ background: statusBg, color: statusCl, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ padding: "9px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {e.reviewed_by
                        ? <span>{e.reviewed_by}<br /><span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{e.review_notes || "No notes"}</span></span>
                        : "—"}
                    </td>
                    <td style={{ padding: "9px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {isOpen && (
                        <span style={{ display: "inline-flex", gap: 8 }}>
                          <button
                            onClick={() => handleReview(e.id, "reviewed")}
                            disabled={reviewingId === e.id}
                            style={{ fontSize: 12, padding: "3px 10px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600 }}
                          >
                            Mark reviewed
                          </button>
                          <button
                            onClick={() => handleReview(e.id, "dismissed")}
                            disabled={reviewingId === e.id}
                            style={{ fontSize: 12, padding: "3px 10px", background: "none", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
                          >
                            Dismiss
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Section 1: Performance ────────────────────────────────────────── */}
      <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>
        Pipeline Performance
      </h2>

      {perfLoading && (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Loading performance data…</p>
      )}
      {perfError && (
        <p style={{ fontSize: 14, color: "var(--color-text-danger)" }}>{perfError}</p>
      )}

      {perf && (
        <>
          {/* Stage latency bar chart */}
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", padding: "20px 24px", marginBottom: 20 }}>
            <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Stage Latency — average milliseconds per submission
            </p>
            {CHART_STAGES.map(stage => {
              const t      = perf.stage_timings?.[stage];
              const avg    = t?.avg_ms ?? null;
              const barPct = avg !== null ? Math.round((avg / maxAvgMs) * 100) : 0;
              return (
                <div key={stage} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                      {STAGE_LABELS[stage]}
                    </span>
                    <span style={{ color: "var(--color-text-tertiary)", fontFamily: "monospace", fontSize: 12 }}>
                      {avg !== null
                        ? `avg ${avg} ms · min ${t.min_ms} · max ${t.max_ms} · n=${t.n}`
                        : "No data yet"}
                    </span>
                  </div>
                  <div style={{ height: 8, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${barPct}%`, background: "var(--color-accent)", borderRadius: 4, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              );
            })}
            {perf.stage_timings?.total?.n > 0 && (
              <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--color-text-tertiary)" }}>
                Total pipeline avg:{" "}
                <strong style={{ color: "var(--color-text-secondary)" }}>
                  {perf.stage_timings.total.avg_ms} ms
                </strong>{" "}
                across {perf.stage_timings.total.n} submissions
              </p>
            )}
          </div>

          {/* Score distributions table */}
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", overflow: "hidden", marginBottom: 36 }}>
            <div style={{ padding: "12px 18px", borderBottom: "0.5px solid var(--color-border-primary)", background: "var(--color-background-secondary)" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Score Distributions (0–100)
              </p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--color-border-primary)" }}>
                  {["Domain", "Mean", "Std Dev", "Min", "Max", "N"].map((h, i) => (
                    <th key={i} style={{ padding: "9px 16px", textAlign: i === 0 ? "left" : "right", fontWeight: 600, fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCORE_COLS.map(field => {
                  const s = perf.score_distributions?.[field];
                  return (
                    <tr key={field} style={{ borderBottom: "0.5px solid var(--color-border-primary)" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {SCORE_LABELS[field]}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-primary)" }}>
                        {s?.mean ?? "—"}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {s?.stdev ?? "—"}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {s?.min ?? "—"}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {s?.max ?? "—"}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-tertiary)" }}>
                        {s?.n ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Section 2: Drift ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
          Data Drift Monitoring
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {computeMsg && (
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{computeMsg}</span>
          )}
          <button
            onClick={handleComputeBaseline}
            disabled={computing}
            style={{
              padding: "7px 16px",
              background: computing ? "var(--color-background-secondary)" : "var(--color-accent)",
              color: computing ? "var(--color-text-secondary)" : "#fff",
              border: "none",
              borderRadius: "var(--border-radius-md)",
              fontSize: 13,
              fontWeight: 600,
              cursor: computing ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            {computing ? "Computing…" : "Compute baseline"}
          </button>
        </div>
      </div>

      {driftLoading && (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Loading drift data…</p>
      )}

      {!driftLoading && driftError && (
        <div style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "var(--color-text-warning)", lineHeight: 1.6 }}>
          {driftError}
        </div>
      )}

      {drift && (
        <>
          {/* Summary badges */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { key: "stable", label: "Stable", bg: "#e5f4f5", color: "#1d666e" },
              { key: "watch",  label: "Watch",  bg: "#faeeda", color: "#854f0b" },
              { key: "drift",  label: "Drift",  bg: "#fee2e2", color: "#991b1b" },
            ].map(({ key, label, bg, color }) => (
              <div key={key} style={{ background: bg, borderRadius: "var(--border-radius-md)", padding: "10px 18px", display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontWeight: 700, color, fontSize: 24 }}>{drift.drift_summary[key]}</span>
                <span style={{ color, fontSize: 13, fontWeight: 500 }}>{label}</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-tertiary)", alignSelf: "center", textAlign: "right" }}>
              Window: last {drift.window_n_actual} task recording{drift.window_n_actual !== 1 ? "s" : ""}
              {drift.window_session_count != null && (
                <span> across {drift.window_session_count} session{drift.window_session_count !== 1 ? "s" : ""}</span>
              )}
              <br />
              Baseline from {new Date(drift.baseline_computed_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}
              {" "}({drift.baseline_n_min} task recording{drift.baseline_n_min !== 1 ? "s" : ""})
            </div>
          </div>

          {/* Low-sample warning */}
          {drift.baseline_n_min < 20 && (
            <div style={{ background: "#fffbeb", border: "0.5px solid #fcd34d", borderRadius: "var(--border-radius-md)", padding: "10px 16px", marginBottom: 20, fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
              <strong>Too few recordings for reliable drift detection</strong> — the baseline was computed from only {drift.baseline_n_min} task recording{drift.baseline_n_min !== 1 ? "s" : ""}.
              Drift metrics (particularly PSI) are unreliable below 20 recordings and may show false alerts.
              PSI is suppressed until that threshold is reached.
              Continue running assessments and press <strong>Compute baseline</strong> again once you have at least 20 task recordings.
            </div>
          )}

          {/* Metric help panel */}
          {helpTopic && METRIC_HELP[helpTopic] && (
            <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-md)", padding: "14px 18px", marginBottom: 20, fontSize: 13, lineHeight: 1.7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <strong style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{METRIC_HELP[helpTopic].title}</strong>
                <button onClick={() => setHelpTopic(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-tertiary)", padding: "0 2px", lineHeight: 1 }}>✕</button>
              </div>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", whiteSpace: "pre-line" }}>{METRIC_HELP[helpTopic].body}</p>
            </div>
          )}

          {/* Feature tables grouped by stage */}
          {orderedStages.map(stage => (
            <div key={stage} style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "10px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-primary)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {STAGE_DISPLAY[stage] ?? stage}
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 820 }}>
                  <thead>
                    <tr style={{ borderBottom: "0.5px solid var(--color-border-primary)" }}>
                      {DRIFT_COLS.map(({ key, label }, i) => (
                        <th key={key} style={{ padding: "8px 12px", textAlign: i === 0 ? "left" : "right", fontWeight: 600, fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            {label}
                            <button
                              onClick={() => setHelpTopic(helpTopic === key ? null : key)}
                              style={{ background: helpTopic === key ? "var(--color-accent)" : "none", border: helpTopic === key ? "none" : "0.5px solid var(--color-border-primary)", cursor: "pointer", padding: "1px 4px", color: helpTopic === key ? "white" : "var(--color-text-tertiary)", fontSize: 9, lineHeight: 1.4, borderRadius: 3, fontFamily: "var(--font-sans)", fontWeight: 600 }}
                              title={`Explain ${label}`}
                            >?</button>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {featuresByStage[stage].map(f => {
                      const featureName = f.path.includes(".") ? f.path.split(".").slice(1).join(".") : f.path;
                      const mono = { fontFamily: "monospace", fontSize: 11 };
                      return (
                        <tr key={f.path} style={{ borderBottom: "0.5px solid var(--color-border-primary)" }}>
                          <td style={{ padding: "7px 12px", ...mono, color: "var(--color-text-primary)" }}>
                            {featureName}
                          </td>
                          <td style={{ padding: "7px 12px", textAlign: "right", ...mono, color: "var(--color-text-secondary)" }}>
                            {f.baseline_mean !== undefined ? `${f.baseline_mean} ± ${f.baseline_std}` : "—"}
                          </td>
                          <td style={{ padding: "7px 12px", textAlign: "right", ...mono, color: "var(--color-text-primary)" }}>
                            {f.window_mean !== undefined ? f.window_mean : "—"}
                          </td>
                          <td style={{ padding: "7px 12px", textAlign: "right", ...mono, color: "var(--color-text-secondary)" }}>
                            <span title={`Status: ${f.z_status ?? "—"}`}>{f.z_score ?? "—"}</span>
                          </td>
                          <td style={{ padding: "7px 12px", textAlign: "right", ...mono, color: "var(--color-text-secondary)" }}>
                            {f.psi != null
                              ? <span title={`PSI: <0.10 stable · 0.10–0.25 watch · ≥0.25 drift`}>{f.psi}</span>
                              : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
                          </td>
                          <td style={{ padding: "7px 12px", textAlign: "right", ...mono, color: "var(--color-text-secondary)" }}>
                            {f.ks_stat != null
                              ? <span title={`K-S stat: <0.20 stable · 0.20–0.40 watch · ≥0.40 drift · p=${f.ks_pval}`}>{f.ks_stat}</span>
                              : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
                          </td>
                          <td style={{ padding: "7px 12px", textAlign: "right", ...mono, color: "var(--color-text-secondary)" }}>
                            <span title="CUSUM: <2 stable · 2–5 watch · ≥5 drift (std units)">{f.cusum ?? "—"}</span>
                          </td>
                          <td style={{ padding: "7px 12px", textAlign: "right" }}>
                            <MetricBadge status={f.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Section 3: Clinical Performance ──────────────────────────────── */}
      <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "36px 0 6px" }}>
        Clinical Performance Metrics
      </h2>
      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 16px", lineHeight: 1.6 }}>
        Sensitivity, specificity, F1, and AUC-ROC against clinician-confirmed diagnoses.
        Once 10 or more assessments have been labelled with a confirmed clinical outcome, these metrics will populate automatically.
      </p>

      {!clinical && (
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Loading…</p>
      )}

      {clinical?.status === "insufficient_labels" && (
        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-md)", padding: "14px 18px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          <strong>{clinical.n_labeled}</strong> labeled assessment{clinical.n_labeled !== 1 ? "s" : ""} recorded
          — <strong>{clinical.required}</strong> required to compute metrics.
          {clinical.n_labeled > 0 && (
            <span style={{ marginLeft: 8, color: "var(--color-text-tertiary)" }}>
              ({clinical.required - clinical.n_labeled} more needed)
            </span>
          )}
        </div>
      )}

      {clinical?.status === "single_class" && (
        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-md)", padding: "14px 18px", fontSize: 13, color: "var(--color-text-secondary)" }}>
          {clinical.message}
        </div>
      )}

      {clinical?.status === "ok" && (
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", overflow: "hidden" }}>
          <div style={{ padding: "10px 18px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Performance (n={clinical.n_labeled} labeled)
            </span>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Threshold: composite ≥ 65 → normal · &lt; 65 → impaired
              &nbsp;·&nbsp; Normal: {clinical.label_distribution?.normal ?? 0} &nbsp;·&nbsp;
              Impaired: {clinical.label_distribution?.impaired ?? 0}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 0 }}>
            {[
              { label: "Sensitivity",  value: clinical.sensitivity, note: "TP rate" },
              { label: "Specificity",  value: clinical.specificity, note: "TN rate" },
              { label: "PPV",          value: clinical.ppv,         note: "Precision" },
              { label: "NPV",          value: clinical.npv,         note: "Neg. pred. value" },
              { label: "F1 score",     value: clinical.f1,          note: "Harmonic mean" },
              { label: "AUC-ROC",      value: clinical.auc_roc,     note: "Discrimination" },
            ].map(({ label, value, note }) => (
              <div key={label} style={{ padding: "18px 20px", borderRight: "0.5px solid var(--color-border-primary)", borderBottom: "0.5px solid var(--color-border-primary)" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                <p style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "monospace" }}>
                  {value != null ? value.toFixed(3) : "—"}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>{note}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 18px", fontSize: 12, color: "var(--color-text-tertiary)", borderTop: "0.5px solid var(--color-border-primary)" }}>
            Confusion matrix: TP={clinical.confusion_matrix?.tp} · FP={clinical.confusion_matrix?.fp} · FN={clinical.confusion_matrix?.fn} · TN={clinical.confusion_matrix?.tn}
          </div>
        </div>
      )}
    </div>
  );
}
