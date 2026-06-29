import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

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

const CHART_STAGES = ["stt", "acoustic", "morphology", "semantics", "emotion"];
const SCORE_COLS   = ["composite", "motor_speech", "semantic_memory", "episodic_memory", "emotional_processing"];

export default function MonitoringPage() {
  const { token } = useAuth();

  const [perf, setPerf]               = useState(null);
  const [drift, setDrift]             = useState(null);
  const [events, setEvents]           = useState([]);
  const [perfLoading, setPerfLoading] = useState(true);
  const [driftLoading, setDriftLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [perfError, setPerfError]     = useState(null);
  const [driftError, setDriftError]   = useState(null);
  const [computing, setComputing]     = useState(false);
  const [computeMsg, setComputeMsg]   = useState(null);
  const [reviewingId, setReviewingId] = useState(null);

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

  useEffect(() => { loadPerf();   }, [loadPerf]);
  useEffect(() => { loadDrift();  }, [loadDrift]);
  useEffect(() => { loadEvents(); }, [loadEvents]);

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
          <strong>{openEventCount} open change event{openEventCount > 1 ? "s" : ""}</strong> — one or more pipeline features have breached the change control plan thresholds. Formal change assessment required.
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
          No change events recorded. Events are created when a drift check detects a threshold breach.
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
                      {e.feature_path}
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
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
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
              Window: last {drift.window_n_actual} submissions
              <br />
              Baseline from {new Date(drift.baseline_computed_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>

          {/* Feature tables grouped by stage */}
          {orderedStages.map(stage => (
            <div key={stage} style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "10px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-primary)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {STAGE_DISPLAY[stage] ?? stage}
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid var(--color-border-primary)" }}>
                    {["Feature", "Baseline mean ± std", "Window mean", "Z-score", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "8px 14px", textAlign: i === 0 ? "left" : "right", fontWeight: 600, fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featuresByStage[stage].map(f => {
                    const st          = DRIFT_STATUS[f.status] ?? DRIFT_STATUS.insufficient_data;
                    const featureName = f.path.includes(".") ? f.path.split(".").slice(1).join(".") : f.path;
                    return (
                      <tr key={f.path} style={{ borderBottom: "0.5px solid var(--color-border-primary)" }}>
                        <td style={{ padding: "8px 14px", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-primary)" }}>
                          {featureName}
                        </td>
                        <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-secondary)" }}>
                          {f.baseline_mean !== undefined
                            ? `${f.baseline_mean} ± ${f.baseline_std}`
                            : "—"}
                        </td>
                        <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-primary)" }}>
                          {f.window_mean !== undefined ? f.window_mean : "—"}
                        </td>
                        <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-secondary)" }}>
                          {f.z_score !== undefined ? f.z_score : "—"}
                        </td>
                        <td style={{ padding: "8px 14px", textAlign: "right" }}>
                          <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
