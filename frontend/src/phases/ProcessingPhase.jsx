const PIPELINE_STEPS = [
  "Transcribing via Chirp STT",
  "Extracting acoustic features",
  "Morphological tagging",
  "Semantic analysis",
  "Emotion detection",
];

export default function ProcessingPhase() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analysing speech, please wait"
      style={{ textAlign: "center", padding: "3rem 0" }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid var(--color-border-tertiary)", borderTopColor: "var(--color-text-info)", margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>Analysing speech</h2>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 14, margin: "0 0 1.5rem" }}>
        Running pipeline across all cognitive domains…
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 280, margin: "0 auto", textAlign: "left" }}>
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--color-text-secondary)", animation: `fadein 0.4s ease ${i * 0.4}s both` }}>
            <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: 14, animation: "spin 1s linear infinite" }} />
            {step}
          </div>
        ))}
        <style>{`@keyframes fadein { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:none } }`}</style>
      </div>
    </div>
  );
}
