import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ScoreRing from "../components/ScoreRing";
import { TASKS, DOMAIN_COLORS } from "../data/tasks";

const API = "http://localhost:8000";

// ── Bell curve helpers ─────────────────────────────────────────────────────
const MU = 70, SIGMA = 15;

function normalPDF(x) {
  return (1 / (SIGMA * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - MU) ** 2) / (2 * SIGMA ** 2));
}

function BellCurve({ domainScores }) {
  const W = 500, H = 130, PL = 24, PR = 24, PT = 16, PB = 24;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const peak  = normalPDF(MU);

  function toSVGX(score) { return PL + (score / 100) * plotW; }
  function toSVGY(score) { return PT + plotH - (normalPDF(score) / peak) * plotH; }

  // Curve path (score 0→100)
  const curvePts = [];
  for (let x = 0; x <= 100; x += 0.5) curvePts.push([toSVGX(x), toSVGY(x)]);
  const curvePath = curvePts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  // Filled region path between x=from and x=to
  function regionFill(from, to, fill) {
    const pts = [];
    const baseline = PT + plotH;
    for (let x = from; x <= to; x += 0.5) pts.push([toSVGX(x), toSVGY(x)]);
    const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
      + ` L${toSVGX(to).toFixed(1)},${baseline} L${toSVGX(from).toFixed(1)},${baseline} Z`;
    return <path key={fill} d={d} fill={fill} fillOpacity={0.22} />;
  }

  const MARKER_COLORS = ["#185fa5", "#0f6e56", "#534ab7", "#854f0b"];
  const entries = Object.entries(domainScores);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 500, display: "block" }} role="img" aria-label="Bell curve showing patient domain scores relative to population">
        {/* Baseline */}
        <line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke="var(--color-border-secondary)" strokeWidth={1} />

        {/* Region fills */}
        {regionFill(0, 44, "#e53935")}
        {regionFill(45, 69, "#f59e0b")}
        {regionFill(70, 100, "#16a34a")}

        {/* Bell curve line */}
        <path d={curvePath} fill="none" stroke="#9ca3af" strokeWidth={1.5} />

        {/* Domain score markers */}
        {entries.map(([domain, score], i) => {
          const x = toSVGX(score);
          const y = toSVGY(score);
          return (
            <g key={domain} aria-label={`${DOMAIN_COLORS[domain]?.label}: ${score}`}>
              <line x1={x} y1={y - 2} x2={x} y2={PT + plotH} stroke={MARKER_COLORS[i]} strokeWidth={2} strokeDasharray="3,2" />
              <circle cx={x} cy={y - 2} r={5} fill={MARKER_COLORS[i]} />
              <title>{DOMAIN_COLORS[domain]?.label}: {score}</title>
            </g>
          );
        })}

        {/* Region labels */}
        <text x={PL + 2}  y={H - 6} fontSize={9} fill="#e53935" fontFamily="sans-serif">Elevated</text>
        <text x={toSVGX(57)} y={H - 6} fontSize={9} fill="#b45309" fontFamily="sans-serif" textAnchor="middle">Moderate</text>
        <text x={W - PR - 36} y={H - 6} fontSize={9} fill="#16a34a" fontFamily="sans-serif">Low risk</text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        {entries.map(([domain, score], i) => (
          <div key={domain} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: MARKER_COLORS[i], flexShrink: 0 }} />
            <span style={{ color: "var(--color-text-secondary)" }}>{DOMAIN_COLORS[domain]?.label}</span>
            <strong style={{ color: "var(--color-text-primary)" }}>{score}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Score bar for a single domain ──────────────────────────────────────────
function DomainBar({ domainKey, score }) {
  const meta = DOMAIN_COLORS[domainKey];
  if (!meta || score == null) return null;

  const riskLevel = score >= 70 ? "Low risk" : score >= 45 ? "Moderate" : "Elevated";
  const riskColor = score >= 70 ? "#0f6e56"  : score >= 45 ? "#854f0b"  : "#c62828";
  const barColor  = score >= 70 ? "#16a34a"  : score >= 45 ? "#f59e0b"  : "#e53935";

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
        <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{meta.label}</span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{score}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: riskColor, background: `${riskColor}18`, border: `0.5px solid ${riskColor}40`, borderRadius: 100, padding: "1px 7px", letterSpacing: "0.04em" }}>
            {riskLevel}
          </span>
        </span>
      </div>
      <div style={{ height: 8, background: "var(--color-border-secondary)", borderRadius: 4, overflow: "hidden" }}>
        <div
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${meta.label}: ${score} — ${riskLevel}`}
          style={{ height: "100%", width: `${score}%`, background: barColor, borderRadius: 4, transition: "width 0.6s ease" }}
        />
      </div>
    </div>
  );
}

// ── Flag badge ─────────────────────────────────────────────────────────────
const SEVERITY_META = {
  note:  { bg: "#e6f1fb", border: "#a8cbf5", text: "#185fa5", badge: "NOTE" },
  watch: { bg: "#faeeda", border: "#f5c77a", text: "#854f0b", badge: "WATCH" },
  refer: { bg: "#fdeaea", border: "#f5a0a0", text: "#c62828", badge: "REFER" },
};

function FlagCard({ flag }) {
  const m = SEVERITY_META[flag.severity] || SEVERITY_META.note;
  return (
    <div style={{ background: m.bg, border: `0.5px solid ${m.border}`, borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: m.text, border: `0.5px solid ${m.border}`, borderRadius: 3, padding: "1px 5px", letterSpacing: "0.06em", flexShrink: 0, marginTop: 1 }}>
          {m.badge}
        </span>
        <div>
          <p style={{ fontWeight: 600, fontSize: 13, color: m.text, margin: "0 0 3px" }}>{flag.label}</p>
          {flag.detail && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>{flag.detail}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Task panel ─────────────────────────────────────────────────────────────
function TaskPanel({ taskResult, taskDef }) {
  const { scores, report } = taskResult;
  const composite = report?.composite_score ?? scores?.composite ?? 0;
  const riskLevel = composite >= 70 ? "Low risk" : composite >= 45 ? "Moderate" : "Elevated";
  const riskColor = composite >= 70 ? "#0f6e56" : composite >= 45 ? "#854f0b" : "#c62828";
  const riskBg    = composite >= 70 ? "#e1f5ee" : composite >= 45 ? "#faeeda" : "#fdeaea";

  const domains = ["motor_speech", "semantic_memory", "episodic_memory", "emotional_processing"];
  const flags = report?.flags ?? [];

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", margin: "0 0 3px", textTransform: "uppercase" }}>
            Task {taskResult.task_index + 1}
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
            {taskDef?.title ?? taskResult.task_id}
          </h3>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "3px 0 0" }}>{taskDef?.domain}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>{composite}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: riskColor, background: riskBg, padding: "2px 8px", borderRadius: 100, letterSpacing: "0.05em" }}>
            {riskLevel}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        {domains.map(d => <DomainBar key={d} domainKey={d} score={scores?.[d]} />)}
      </div>

      {flags.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
            Clinical flags
          </p>
          {flags.map((f, i) => <FlagCard key={i} flag={typeof f === "string" ? { label: f, severity: "note" } : f} />)}
        </div>
      )}
    </div>
  );
}

// ── Cumulative panel ───────────────────────────────────────────────────────
function CumulativePanel({ taskResults }) {
  const domains = ["motor_speech", "semantic_memory", "episodic_memory", "emotional_processing"];

  const avg = {};
  domains.forEach(d => {
    const vals = taskResults.map(t => t.scores?.[d]).filter(v => v != null);
    avg[d] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  });

  const compositeVals = taskResults.map(t => t.report?.composite_score ?? t.scores?.composite ?? 0);
  const composite = compositeVals.length ? Math.round(compositeVals.reduce((a, b) => a + b, 0) / compositeVals.length) : 0;

  const riskLevel = composite >= 70 ? "Low risk" : composite >= 45 ? "Moderate" : "Elevated";
  const riskColor = composite >= 70 ? "#0f6e56" : composite >= 45 ? "#854f0b" : "#c62828";
  const riskBg    = composite >= 70 ? "#e1f5ee" : composite >= 45 ? "#faeeda" : "#fdeaea";

  // Deduplicated flags (highest severity wins)
  const SEV_RANK = { refer: 2, watch: 1, note: 0 };
  const flagMap  = {};
  taskResults.forEach(t => {
    (t.report?.flags ?? []).forEach(f => {
      const flag = typeof f === "string" ? { label: f, severity: "note" } : f;
      const key  = flag.label;
      if (!flagMap[key] || SEV_RANK[flag.severity] > SEV_RANK[flagMap[key].severity]) {
        flagMap[key] = flag;
      }
    });
  });
  const uniqueFlags = Object.values(flagMap).sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", margin: "0 0 3px", textTransform: "uppercase" }}>
            Session summary
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
            Cumulative score
          </h3>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "3px 0 0" }}>
            Average across {taskResults.length} task{taskResults.length > 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>{composite}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: riskColor, background: riskBg, padding: "2px 8px", borderRadius: 100, letterSpacing: "0.05em" }}>
            {riskLevel}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        {domains.map(d => <DomainBar key={d} domainKey={d} score={avg[d]} />)}
      </div>

      {uniqueFlags.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
            Consolidated flags ({uniqueFlags.length})
          </p>
          {uniqueFlags.map((f, i) => <FlagCard key={i} flag={f} />)}
        </div>
      )}
    </div>
  );
}

// ── Population comparison section (full-width, below the 4-panel grid) ────
function PopulationSection({ taskResults }) {
  const domains = ["motor_speech", "semantic_memory", "episodic_memory", "emotional_processing"];
  const avg = {};
  domains.forEach(d => {
    const vals = taskResults.map(t => t.scores?.[d]).filter(v => v != null);
    avg[d] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  });

  const compositeVals = taskResults.map(t => t.report?.composite_score ?? t.scores?.composite ?? 0);
  const composite = compositeVals.length ? Math.round(compositeVals.reduce((a, b) => a + b, 0) / compositeVals.length) : 0;

  // Wide bell curve
  const W = 680, H = 160, PL = 32, PR = 32, PT = 20, PB = 32;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const peak  = normalPDF(MU);
  const toSVGX = score => PL + (score / 100) * plotW;
  const toSVGY = score => PT + plotH - (normalPDF(score) / peak) * plotH;

  const curvePts = [];
  for (let x = 0; x <= 100; x += 0.5) curvePts.push([toSVGX(x), toSVGY(x)]);
  const curvePath = curvePts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  function regionFill(from, to, fill) {
    const baseline = PT + plotH;
    const pts = [];
    for (let x = from; x <= to; x += 0.5) pts.push([toSVGX(x), toSVGY(x)]);
    const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
      + ` L${toSVGX(to).toFixed(1)},${baseline} L${toSVGX(from).toFixed(1)},${baseline} Z`;
    return <path key={fill} d={d} fill={fill} fillOpacity={0.2} />;
  }

  // Score markers: domains + composite
  const MARKER_COLORS = ["#185fa5", "#0f6e56", "#534ab7", "#854f0b"];
  const domainEntries = domains.map((d, i) => ({ domain: d, score: avg[d], color: MARKER_COLORS[i] }));

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", padding: "1.5rem 2rem", marginTop: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", margin: "0 0 3px", textTransform: "uppercase" }}>
          Population comparison
        </p>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px", color: "var(--color-text-primary)" }}>
          Where does this patient fall?
        </h3>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>
          The curve below represents the expected distribution of speech biomarker scores across the reference population (μ=70, σ=15). Coloured markers show where this patient's cumulative domain scores sit relative to that population. Scores toward the right indicate typical or above-typical performance; scores toward the left warrant closer clinical attention.
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, display: "block", minWidth: 320 }} role="img" aria-label="Bell curve showing patient domain scores relative to population distribution">
          <line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke="var(--color-border-secondary)" strokeWidth={1} />

          {regionFill(0, 44, "#e53935")}
          {regionFill(45, 69, "#f59e0b")}
          {regionFill(70, 100, "#16a34a")}

          <path d={curvePath} fill="none" stroke="#9ca3af" strokeWidth={2} />

          {/* Composite score marker (grey, larger) */}
          {(() => {
            const x = toSVGX(composite);
            const y = toSVGY(composite);
            return (
              <g aria-label={`Composite score: ${composite}`}>
                <line x1={x} y1={y - 2} x2={x} y2={PT + plotH} stroke="#374151" strokeWidth={2.5} />
                <circle cx={x} cy={y - 2} r={7} fill="#374151" />
                <text x={x} y={y - 14} textAnchor="middle" fontSize={10} fontWeight={700} fill="#374151" fontFamily="sans-serif">{composite}</text>
                <title>Composite: {composite}</title>
              </g>
            );
          })()}

          {/* Domain markers */}
          {domainEntries.map(({ domain, score, color }) => {
            const x = toSVGX(score);
            const y = toSVGY(score);
            return (
              <g key={domain} aria-label={`${DOMAIN_COLORS[domain]?.label}: ${score}`}>
                <line x1={x} y1={y - 2} x2={x} y2={PT + plotH} stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
                <circle cx={x} cy={y - 2} r={4} fill={color} />
                <title>{DOMAIN_COLORS[domain]?.label}: {score}</title>
              </g>
            );
          })}

          {/* Risk zone labels */}
          <text x={PL + 4}       y={H - 8} fontSize={10} fill="#c62828" fontFamily="sans-serif" fontWeight={600}>Elevated</text>
          <text x={toSVGX(57)}   y={H - 8} fontSize={10} fill="#92400e" fontFamily="sans-serif" fontWeight={600} textAnchor="middle">Moderate</text>
          <text x={W - PR - 46}  y={H - 8} fontSize={10} fill="#166534" fontFamily="sans-serif" fontWeight={600}>Low risk</text>

          {/* Score axis ticks */}
          {[0, 25, 50, 70, 100].map(v => (
            <g key={v}>
              <line x1={toSVGX(v)} y1={PT + plotH} x2={toSVGX(v)} y2={PT + plotH + 4} stroke="var(--color-border-secondary)" strokeWidth={1} />
              <text x={toSVGX(v)} y={PT + plotH + 13} fontSize={9} fill="#9ca3af" fontFamily="sans-serif" textAnchor="middle">{v}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "0.5px solid var(--color-border-primary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#374151", flexShrink: 0 }} />
          <span style={{ color: "var(--color-text-secondary)" }}>Composite (session average)</span>
          <strong style={{ color: "var(--color-text-primary)" }}>{composite}</strong>
        </div>
        {domainEntries.map(({ domain, score, color }) => (
          <div key={domain} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ color: "var(--color-text-secondary)" }}>{DOMAIN_COLORS[domain]?.label}</span>
            <strong style={{ color: "var(--color-text-primary)" }}>{score}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const { key }  = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
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

  if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading report…</div>;
  if (error)   return <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-danger)" }}>Could not load report: {error}</div>;
  if (!assessment) return null;

  const { patient, task_results, clinician_name, date_of_assessment, assessment_type, referral_source, reason, notes, assessment_ref, environment, had_interruptions, interruption_notes, l1_language, clinical_outcome, findings_recorded_at } = assessment;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <Link to="/dashboard" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Dashboard</Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "10px 0 4px", color: "var(--color-text-primary)" }}>
            Clinical Report
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "var(--color-text-secondary)" }}>
            {assessment_ref && <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-text-primary)", background: "var(--color-background-secondary)", padding: "1px 8px", borderRadius: 4, border: "0.5px solid var(--color-border-secondary)" }}>{assessment_ref}</span>}
            <span><strong>Patient:</strong> {patient.patient_ref}</span>
            <span><strong>Date:</strong> {date_of_assessment}</span>
            <span><strong>Clinician:</strong> {clinician_name}</span>
            <span style={{ textTransform: "capitalize" }}><strong>Type:</strong> {assessment_type}</span>
            {referral_source && <span><strong>Referral:</strong> {referral_source}</span>}
            {patient.age_band && <span><strong>Age band:</strong> {patient.age_band}</span>}
          </div>
          {reason && <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "6px 0 0" }}><strong>Reason:</strong> {reason}</p>}
          {notes  && <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}><strong>Notes:</strong> {notes}</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <button
            onClick={() => navigate(`/assessment/${key}/findings`)}
            style={{ padding: "9px 18px", borderRadius: "var(--border-radius-md)", background: "var(--color-accent)", color: "#fff", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {clinical_outcome ? "Edit findings" : "Record clinical findings"}
          </button>
          {clinical_outcome && (
            <button
              onClick={() => navigate(`/assessment/${key}/summary`)}
              style={{ padding: "7px 14px", borderRadius: "var(--border-radius-md)", background: "var(--color-surface)", color: "var(--color-accent)", border: "1.5px solid var(--color-accent)", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Patient summary
            </button>
          )}
          {findings_recorded_at && (
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Findings recorded {new Date(findings_recorded_at).toLocaleDateString("en-IE")}
            </span>
          )}
        </div>
      </div>

      {/* Session conditions */}
      {(() => {
        const nonEnglishL1 = l1_language && l1_language.trim().toLowerCase() !== "english";
        const noisyEnv     = environment && !environment.toLowerCase().startsWith("quiet clinical");
        const interrupted  = had_interruptions && had_interruptions !== "None";
        const hasFlags     = nonEnglishL1 || noisyEnv || interrupted;
        return (
          <div style={{ background: "var(--color-surface)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-md)", padding: "14px 18px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--color-text-tertiary)", textTransform: "uppercase", margin: "0 0 8px" }}>Session conditions</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  <strong>L1:</strong> {l1_language || "English"}
                </span>
                <span style={{ color: "var(--color-border-secondary)" }}>·</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  <strong>Environment:</strong> {environment || "Not recorded"}
                </span>
                <span style={{ color: "var(--color-border-secondary)" }}>·</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  <strong>Interruptions:</strong> {had_interruptions || "None"}
                  {interruption_notes && ` — ${interruption_notes}`}
                </span>
              </div>
            </div>
            {hasFlags && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {nonEnglishL1 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#854f0b", background: "#faeeda", border: "0.5px solid #f5d08a", borderRadius: 4, padding: "2px 8px" }}>
                    Non-English L1 — fluency scores may be affected
                  </span>
                )}
                {noisyEnv && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#854f0b", background: "#faeeda", border: "0.5px solid #f5d08a", borderRadius: 4, padding: "2px 8px" }}>
                    Suboptimal environment — acoustic scores may be affected
                  </span>
                )}
                {interrupted && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#c62828", background: "#fdeaea", border: "0.5px solid #f5a0a0", borderRadius: 4, padding: "2px 8px" }}>
                    Interruptions recorded — results should be interpreted with caution
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Clinical notice */}
      <div style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", marginBottom: 24, fontSize: 13, color: "var(--color-text-warning)", lineHeight: 1.5 }}>
        <strong>For clinician interpretation only.</strong> These are speech biomarker indicators — not a diagnosis. Results must be interpreted in clinical context and must not be communicated directly to patients.
      </div>

      {task_results.length === 0 && (
        <p style={{ color: "var(--color-text-secondary)" }}>No tasks have been completed yet for this assessment.</p>
      )}

      {/* 4-panel grid: 3 tasks + cumulative */}
      {task_results.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))", gap: 20 }}>
            {task_results.map(tr => {
              const taskDef = TASKS.find(t => t.id === tr.task_id);
              return (
                <div key={tr.task_index} style={{ alignSelf: "start" }}>
                  <TaskPanel taskResult={tr} taskDef={taskDef} />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 20 }}>
            <CumulativePanel taskResults={task_results} />
          </div>
          <PopulationSection taskResults={task_results} />
        </>
      )}

      {/* Transcript accordion */}
      {task_results.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <details>
            <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--color-text-secondary)", padding: "8px 0", userSelect: "none" }}>
              Transcripts ({task_results.length} task{task_results.length > 1 ? "s" : ""})
            </summary>
            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              {task_results.map(tr => (
                <div key={tr.task_index} style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", padding: "14px 18px" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-tertiary)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Task {tr.task_index + 1} — {TASKS.find(t => t.id === tr.task_id)?.title ?? tr.task_id}
                  </p>
                  <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.7, fontStyle: tr.transcript ? "normal" : "italic" }}>
                    {tr.transcript || "No transcript available"}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
