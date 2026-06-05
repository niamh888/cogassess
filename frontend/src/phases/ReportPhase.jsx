import { useRef, useEffect } from "react";
import ScoreRing from "../components/ScoreRing";
import ExplainerPanel from "./ExplainerPanel";
import { DOMAIN_COLORS, TASKS } from "../data/tasks";

const RISK_COLORS = { low: "#0f6e56", moderate: "#854f0b", elevated: "#993c1d" };
const RISK_BG     = { low: "#e1f5ee", moderate: "#faeeda", elevated: "#faece7" };

const SEVERITY_META = {
  note:  { border: "var(--color-border-secondary)", bg: "var(--color-background-secondary)", text: "var(--color-text-secondary)", headingColor: "var(--color-text-info)",    iconName: "ti-info-circle",    badgeLabel: "Note" },
  watch: { border: "var(--color-border-warning)",   bg: "var(--color-background-warning)",   text: "var(--color-text-warning)", headingColor: "var(--color-text-warning)", iconName: "ti-alert-triangle", badgeLabel: "Watch" },
  refer: { border: "var(--color-border-danger)",    bg: "var(--color-background-danger)",    text: "var(--color-text-danger)",  headingColor: "var(--color-text-danger)",  iconName: "ti-alert-circle",   badgeLabel: "Refer" },
};

const EMOTION_KEYS = ["joy", "sadness", "anger", "fear", "disgust", "surprise", "neutral"];

export default function ReportPhase({ result, taskIdx, showExplainer, setShowExplainer, onNextTask, onViewSummary, onReset }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const risk = result.report.overall_risk;

  return (
    <section aria-label="Assessment results" aria-live="polite">

      {/* Full-width header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 11, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>Assessment complete</p>
          <h2 ref={headingRef} tabIndex={-1} style={{ fontSize: 20, fontWeight: 500, margin: 0, outline: "none" }}>Session report</h2>
        </div>
        <span role="status" aria-label={`Overall risk: ${risk}`} style={{ fontSize: 12, padding: "4px 12px", borderRadius: "var(--border-radius-md)", background: RISK_BG[risk], color: RISK_COLORS[risk], fontWeight: 500 }}>
          {risk.charAt(0).toUpperCase() + risk.slice(1)} risk
        </span>
      </div>

      {/* Two-column grid */}
      <div className="report-grid">

        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          {/* Composite score */}
          <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", display: "flex", alignItems: "center", gap: 20 }}>
            <ScoreRing value={result.scores.composite} size={80} stroke={7} color="#185fa5" label="Composite cognitive score" />
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--color-text-secondary)" }}>Composite cognitive score</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-tertiary)" }}>Session ID: {result.session_id?.slice(0, 8)}</p>
            </div>
          </div>

          {/* Domain scores */}
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
            {Object.entries(DOMAIN_COLORS).map(([k, v]) => (
              <li key={k} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem", display: "flex", alignItems: "center", gap: 12 }}>
                <ScoreRing value={result.scores[k]} size={52} stroke={5} color={v.text} label={v.label} />
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{v.label}</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }} aria-hidden="true">{result.scores[k]}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Transcript */}
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-file-text" aria-hidden="true" style={{ fontSize: 14 }} />Transcript
            </p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>{result.transcript}</p>
          </div>

          {/* Clinical flags */}
          {result.report.flags?.length > 0 && (
            <section aria-label="Clinical findings">
              <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
                {result.report.flags.map((f, i) => {
                  const s = SEVERITY_META[f.severity] || SEVERITY_META.note;
                  return (
                    <li key={i} style={{ border: `0.5px solid ${s.border}`, borderRadius: "var(--border-radius-lg)", padding: "0.875rem 1rem", background: s.bg }}>
                      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: s.headingColor, display: "flex", alignItems: "center", gap: 6 }}>
                        <i className={`ti ${s.iconName}`} aria-hidden="true" style={{ fontSize: 14 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "1px 5px", borderRadius: 3, border: `1px solid ${s.headingColor}`, color: s.headingColor, lineHeight: 1.4 }}>
                          {s.badgeLabel}
                        </span>
                        {f.label}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: s.text, lineHeight: 1.6 }}>{f.detail}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Emotion distribution */}
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
            <p id="emotion-heading" style={{ margin: "0 0 10px", fontSize: 12, color: "var(--color-text-tertiary)" }}>
              <i className="ti ti-mood-happy" aria-hidden="true" style={{ fontSize: 14, marginRight: 6 }} />Emotion distribution
            </p>
            <dl aria-labelledby="emotion-heading">
              {Object.entries(result.pipeline?.emotion || {})
                .filter(([k]) => EMOTION_KEYS.includes(k))
                .map(([k, v]) => {
                  const pct = Math.round(v * 100);
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <dt style={{ fontSize: 12, color: "var(--color-text-secondary)", width: 70, textTransform: "capitalize", margin: 0 }}>{k}</dt>
                      <dd style={{ flex: 1, margin: 0 }}>
                        <div role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${k} ${pct}%`} style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-text-info)", borderRadius: 3, transition: "width 1s ease" }} />
                        </div>
                      </dd>
                      <span aria-hidden="true" style={{ fontSize: 12, color: "var(--color-text-secondary)", width: 36, textAlign: "right" }}>{pct}%</span>
                    </div>
                  );
                })}
            </dl>
          </div>

          {/* Disclaimer */}
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.6, margin: 0 }}>
            <i className="ti ti-info-circle" aria-hidden="true" style={{ fontSize: 13, marginRight: 6 }} />
            {result.report.note}
          </p>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            {taskIdx < TASKS.length - 1 ? (
              <button onClick={onNextTask} style={{ flex: 1, padding: "11px", fontSize: 14, cursor: "pointer" }}>
                Next task <i className="ti ti-arrow-right" aria-hidden="true" />
              </button>
            ) : (
              <button
                onClick={onViewSummary}
                style={{ flex: 1, padding: "11px", fontSize: 14, cursor: "pointer", background: "var(--color-background-success)", color: "var(--color-text-success)", border: "0.5px solid #a7dfc8" }}
              >
                <i className="ti ti-chart-bar" aria-hidden="true" style={{ marginRight: 8 }} />View session summary
              </button>
            )}
            <button onClick={onReset} style={{ flex: 1, padding: "11px", fontSize: 14, cursor: "pointer" }}>
              <i className="ti ti-refresh" aria-hidden="true" style={{ marginRight: 8 }} />New session
            </button>
          </div>
        </div>

        {/* ── Right column: explainer ── */}
        <ExplainerPanel
          result={result}
          showExplainer={showExplainer}
          onToggle={() => setShowExplainer(s => !s)}
        />

      </div>
    </section>
  );
}
