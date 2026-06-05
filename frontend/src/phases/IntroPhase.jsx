import { TASKS, DOMAIN_COLORS } from "../data/tasks";

export default function IntroPhase({ onStart }) {
  return (
    <section aria-label="Assessment introduction">
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <p style={{ margin: "0 0 1rem", color: "var(--color-text-secondary)", fontSize: 15, lineHeight: 1.7 }}>
          This assessment records brief speech samples and analyses them across four cognitive domains using an automated pipeline. The session takes approximately 3–4 minutes.
        </p>
        <ul style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
          {Object.entries(DOMAIN_COLORS).map(([k, v]) => (
            <li key={k} style={{ background: v.bg, borderRadius: "var(--border-radius-md)", padding: "10px 14px" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: v.text }}>{v.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <p id="task-list-label" style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "0 0 4px" }}>
          Tasks in this session
        </p>
        <ol aria-labelledby="task-list-label" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {TASKS.map((t, i) => (
            <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                {i + 1}
              </span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{t.title}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-tertiary)" }}>{t.domain} · {t.duration}s</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <button onClick={onStart} style={{ width: "100%", padding: "12px", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
        Begin assessment <i className="ti ti-arrow-right" aria-hidden="true" />
      </button>
    </section>
  );
}
