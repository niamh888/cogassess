import RecordingWave from "../components/RecordingWave";
import { TASKS } from "../data/tasks";

export default function TaskPhase({ task, taskIdx, isRecording, timeLeft, onStartRecording, onStopRecording }) {
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <section aria-label={`Task ${taskIdx + 1} of ${TASKS.length}`}>
      <div
        role="progressbar"
        aria-valuenow={taskIdx + 1}
        aria-valuemin={1}
        aria-valuemax={TASKS.length}
        aria-label={`Task ${taskIdx + 1} of ${TASKS.length}`}
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem" }}
      >
        {TASKS.map((t, i) => (
          <div
            key={t.id}
            aria-hidden="true"
            style={{ flex: 1, height: 4, borderRadius: 2, background: i < taskIdx ? "var(--color-text-success)" : i === taskIdx ? "var(--color-text-info)" : "var(--color-border-tertiary)" }}
          />
        ))}
      </div>

      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Task {taskIdx + 1} of {TASKS.length} · {task.domain}
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 1rem" }}>{task.title}</h2>

      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>{task.instruction}</p>
      </div>

      {!isRecording ? (
        <button onClick={onStartRecording} style={{ width: "100%", padding: "12px", fontSize: 15, cursor: "pointer" }}>
          <i className="ti ti-microphone" aria-hidden="true" style={{ marginRight: 8 }} />Start recording
        </button>
      ) : (
        <div>
          <div style={{ background: "var(--color-background-danger)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <RecordingWave active />
              <span style={{ fontSize: 14, color: "var(--color-text-danger)", fontWeight: 500 }}>Recording in progress</span>
            </div>
            <span
              role="timer"
              aria-live="polite"
              aria-label={`${Math.floor(timeLeft / 60)} minutes ${timeLeft % 60} seconds remaining`}
              style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-danger)", fontVariantNumeric: "tabular-nums" }}
            >
              {mm}:{ss}
            </span>
          </div>
          <button onClick={onStopRecording} style={{ width: "100%", padding: "12px", fontSize: 15, cursor: "pointer" }}>
            <i className="ti ti-player-stop" aria-hidden="true" style={{ marginRight: 8 }} />Stop &amp; analyse
          </button>
        </div>
      )}
    </section>
  );
}
