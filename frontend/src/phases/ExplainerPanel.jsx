import { DOMAIN_COLORS } from "../data/tasks";

const SCORE_RANGES = [
  { range: "70–100", label: "Low risk",      desc: "Within typical range.",                   color: "var(--color-text-success)", bg: "var(--color-background-success)" },
  { range: "45–69",  label: "Moderate risk", desc: "Some markers present. Monitor.",          color: "var(--color-text-warning)", bg: "var(--color-background-warning)" },
  { range: "0–44",   label: "Elevated risk", desc: "Multiple markers. Consider referral.",    color: "var(--color-text-danger)",  bg: "var(--color-background-danger)" },
];

function MetricRow({ label, value, tip }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
        {value} <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>({tip})</span>
      </span>
    </div>
  );
}

export default function ExplainerPanel({ result, showExplainer, onToggle }) {
  const ac = result.pipeline.acoustic;
  const mo = result.pipeline.morphology;
  const se = result.pipeline.semantics;
  const em = result.pipeline.emotion;
  const sc = result.scores;

  return (
    <div className="explainer-panel" style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "12px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>
          <i className="ti ti-info-circle" aria-hidden="true" style={{ marginRight: 8 }} />How to read these scores
        </span>
        <button
          className="explainer-toggle"
          onClick={onToggle}
          aria-expanded={showExplainer}
          aria-controls="explainer-body"
          aria-label={showExplainer ? "Collapse score guide" : "Expand score guide"}
          style={{ padding: "2px 8px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)" }}
        >
          <i className={`ti ti-chevron-${showExplainer ? "up" : "down"}`} aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div id="explainer-body" className={`explainer-body${showExplainer ? "" : " explainer-body--hidden"}`}>

        {/* Score ranges */}
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Score ranges</p>
          {SCORE_RANGES.map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: "var(--border-radius-md)", background: r.bg, color: r.color, whiteSpace: "nowrap", marginTop: 1, flexShrink: 0 }}>{r.range}</span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}><strong>{r.label}</strong> — {r.desc}</span>
            </div>
          ))}
        </div>

        {/* Motor speech */}
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: DOMAIN_COLORS.motor_speech.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>Motor speech — {sc.motor_speech}</p>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Articulation rate, pause frequency, and voice clarity. Reduced scores may indicate dysarthria or psychomotor slowing.
          </p>
          <MetricRow label="Pauses (≥300ms)"   value={ac.pause_count}              tip="5–10/min normal" />
          <MetricRow label="Articulation rate"  value={`${ac.articulation_rate} syl/s`} tip="3.0–4.0 normal" />
          <MetricRow label="Mean pause"         value={`${ac.mean_pause_duration_ms}ms`} tip="200–600ms normal" />
        </div>

        {/* Semantic memory */}
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: DOMAIN_COLORS.semantic_memory.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>Semantic memory — {sc.semantic_memory}</p>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Vocabulary richness and topic diversity. Semantic memory loss often shows as over-reliance on generic words.
          </p>
          <MetricRow label="Unique / total words" value={`${mo.unique_words} / ${mo.word_count}`}                          tip="TTR >0.4 normal" />
          <MetricRow label="High-freq word use"   value={`${(se.high_frequency_word_ratio * 100).toFixed(0)}%`}            tip="<35% normal" />
          <MetricRow label="Topic coherence"      value={`${(se.topic_coherence * 100).toFixed(0)}%`}                      tip="higher = more focused" />
        </div>

        {/* Episodic memory */}
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: DOMAIN_COLORS.episodic_memory.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>Episodic memory — {sc.episodic_memory}</p>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Ability to narrate personal events. Reduced scores may show as fewer first-person references and more word-finding hesitations.
          </p>
          <MetricRow label="First-person refs"   value={`${(mo.first_person_ratio * 100).toFixed(0)}%`} tip=">60% normal" />
          <MetricRow label="Disfluencies"        value={mo.disfluency_count}                             tip="≤3 normal" />
          <MetricRow label="Vocab variety (TTR)" value={mo.type_token_ratio}                             tip=">0.4 normal" />
        </div>

        {/* Emotional processing */}
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: DOMAIN_COLORS.emotional_processing.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>Emotional processing — {sc.emotional_processing}</p>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Range of emotional expression. High neutral (flat affect) may indicate reduced engagement — an early marker in some neurodegenerative conditions.
          </p>
          <MetricRow label="Dominant emotion" value={em.dominant_emotion}                          tip="any non-neutral" />
          <MetricRow label="Neutral affect"   value={`${(em.neutral * 100).toFixed(0)}%`}         tip="<50% normal" />
          <MetricRow label="Valence"          value={em.valence}                                   tip="positive or mixed" />
        </div>

      </div>
    </div>
  );
}
