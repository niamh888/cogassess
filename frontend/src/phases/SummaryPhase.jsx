import { useRef, useEffect } from "react";
import ScoreRing from "../components/ScoreRing";
import { DOMAIN_COLORS, TASKS } from "../data/tasks";

const RISK_COLORS = { low: "#0f6e56", moderate: "#854f0b", elevated: "#993c1d" };
const RISK_BG     = { low: "#e1f5ee", moderate: "#faeeda", elevated: "#faece7" };

const SEVERITY_META = {
  note:  { border: "var(--color-border-secondary)", bg: "var(--color-background-secondary)", text: "var(--color-text-secondary)", headingColor: "var(--color-text-info)",    iconName: "ti-info-circle",    badgeLabel: "Note" },
  watch: { border: "var(--color-border-warning)",   bg: "var(--color-background-warning)",   text: "var(--color-text-warning)", headingColor: "var(--color-text-warning)", iconName: "ti-alert-triangle", badgeLabel: "Watch" },
  refer: { border: "var(--color-border-danger)",    bg: "var(--color-background-danger)",    text: "var(--color-text-danger)",  headingColor: "var(--color-text-danger)",  iconName: "ti-alert-circle",   badgeLabel: "Refer" },
};

function avg(results, key) {
  const vals = results.map(r => r.scores[key]).filter(v => v != null);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

function overallRisk(composite) {
  if (composite >= 70) return "low";
  if (composite >= 45) return "moderate";
  return "elevated";
}

export default function SummaryPhase({ results, onReset }) {
  const headingRef = useRef(null);

  useEffect(() => { headingRef.current?.focus(); }, []);

  // Combined scores averaged across all tasks
  const combined = {
    motor_speech:         avg(results, "motor_speech"),
    semantic_memory:      avg(results, "semantic_memory"),
    episodic_memory:      avg(results, "episodic_memory"),
    emotional_processing: avg(results, "emotional_processing"),
  };
  combined.composite = Math.round(
    Object.values(combined).reduce((a, b) => a + b, 0) / Object.keys(combined).length
  );
  const risk = overallRisk(combined.composite);

  // All flags across tasks, tagged with which task they came from
  const allFlags = results.flatMap((r, i) =>
    (r.report.flags || []).map(f => ({ ...f, taskTitle: TASKS[i]?.title ?? `Task ${i + 1}` }))
  );

  // Deduplicate by label — keep highest severity if same label appears in multiple tasks
  const severityRank = { refer: 3, watch: 2, note: 1 };
  const flagMap = new Map();
  allFlags.forEach(f => {
    const existing = flagMap.get(f.label);
    if (!existing || severityRank[f.severity] > severityRank[existing.severity]) {
      flagMap.set(f.label, f);
    }
  });
  const uniqueFlags = [...flagMap.values()].sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity]
  );

  return (
    <section aria-label="Session summary" aria-live="polite">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 11, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>
            All tasks complete
          </p>
          <h2 ref={headingRef} tabIndex={-1} style={{ fontSize: 20, fontWeight: 500, margin: 0, outline: "none" }}>
            Session summary
          </h2>
        </div>
        <span
          role="status"
          aria-label={`Overall session risk: ${risk}`}
          style={{ fontSize: 12, padding: "4px 12px", borderRadius: "var(--border-radius-md)", background: RISK_BG[risk], color: RISK_COLORS[risk], fontWeight: 500 }}
        >
          {risk.charAt(0).toUpperCase() + risk.slice(1)} risk
        </span>
      </div>

      {/* Combined composite ring */}
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 20 }}>
        <ScoreRing value={combined.composite} size={80} stroke={7} color="#185fa5" label="Combined composite score" />
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 500 }}>Combined composite score</p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)" }}>
            Averaged across {results.length} task{results.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Combined domain scores */}
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, listStyle: "none", margin: "0 0 1rem", padding: 0 }}>
        {Object.entries(DOMAIN_COLORS).map(([k, v]) => (
          <li key={k} style={{ background: "#fff", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem", display: "flex", alignItems: "center", gap: 12 }}>
            <ScoreRing value={combined[k]} size={52} stroke={5} color={v.text} label={v.label} />
            <div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{v.label}</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }} aria-hidden="true">{combined[k]}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Per-task breakdown */}
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", marginBottom: "1rem" }}>
        <p style={{ margin: 0, padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Per-task scores
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} aria-label="Scores by task">
            <thead>
              <tr style={{ background: "var(--color-background-secondary)" }}>
                <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 500, color: "var(--color-text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>Task</th>
                {Object.values(DOMAIN_COLORS).map(v => (
                  <th key={v.label} style={{ padding: "8px 12px", textAlign: "center", fontWeight: 500, color: "var(--color-text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    {v.label.split(" ")[0]}
                  </th>
                ))}
                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  Composite
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderBottom: i < results.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                  <td style={{ padding: "10px 16px", color: "var(--color-text-secondary)" }}>
                    <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{TASKS[i]?.title ?? `Task ${i + 1}`}</span>
                    <br />
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{TASKS[i]?.domain}</span>
                  </td>
                  {Object.keys(DOMAIN_COLORS).map(k => {
                    const score = r.scores[k];
                    const scoreRisk = overallRisk(score);
                    return (
                      <td key={k} style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ fontWeight: 600, color: RISK_COLORS[scoreRisk], fontSize: 15 }}>{score}</span>
                      </td>
                    );
                  })}
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: RISK_COLORS[overallRisk(r.scores.composite)] }}>{r.scores.composite}</span>
                  </td>
                </tr>
              ))}
              {/* Average row */}
              <tr style={{ background: "var(--color-background-secondary)", borderTop: "1px solid var(--color-border-secondary)" }}>
                <td style={{ padding: "10px 16px", fontWeight: 600, fontSize: 12, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Session average
                </td>
                {Object.keys(DOMAIN_COLORS).map(k => (
                  <td key={k} style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, fontSize: 15, color: RISK_COLORS[overallRisk(combined[k])] }}>
                    {combined[k]}
                  </td>
                ))}
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, fontSize: 15, color: RISK_COLORS[risk] }}>
                  {combined.composite}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Consolidated flags */}
      {uniqueFlags.length > 0 && (
        <section aria-label="Consolidated clinical findings" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Clinical findings across session
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
            {uniqueFlags.map((f, i) => {
              const s = SEVERITY_META[f.severity] || SEVERITY_META.note;
              return (
                <li key={i} style={{ border: `0.5px solid ${s.border}`, borderRadius: "var(--border-radius-lg)", padding: "0.875rem 1rem", background: s.bg }}>
                  <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: s.headingColor, display: "flex", alignItems: "center", gap: 6 }}>
                    <i className={`ti ${s.iconName}`} aria-hidden="true" style={{ fontSize: 14 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "1px 5px", borderRadius: 3, border: `1px solid ${s.headingColor}`, color: s.headingColor, lineHeight: 1.4 }}>
                      {s.badgeLabel}
                    </span>
                    {f.label}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                      {f.taskTitle}
                    </span>
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: s.text, lineHeight: 1.6 }}>{f.detail}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Disclaimer */}
      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
        <i className="ti ti-info-circle" aria-hidden="true" style={{ fontSize: 13, marginRight: 6 }} />
        These scores are indicative only and require clinical validation. Not for use as a standalone diagnostic tool.
      </p>

      <button onClick={onReset} style={{ width: "100%", padding: "12px", fontSize: 15, cursor: "pointer" }}>
        <i className="ti ti-refresh" aria-hidden="true" style={{ marginRight: 8 }} />Start new session
      </button>

    </section>
  );
}
