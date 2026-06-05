import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { TASKS } from "../data/tasks";
import RecordingWave from "../components/RecordingWave";

const API = "http://localhost:8000";

export default function PatientPage() {
  const { key }    = useParams();
  const { token }  = useAuth();
  const navigate   = useNavigate();

  const [selectedTasks, setSelectedTasks] = useState([]);  // TASKS objects in order
  const [taskIdx,   setTaskIdx]   = useState(null);
  const [phase,     setPhase]     = useState("loading");  // loading | clinician_prep | ready | recording | processing | done | error
  const [timeLeft,  setTimeLeft]  = useState(0);
  const [errorMsg,  setErrorMsg]  = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);

  // Load assessment — get selected tasks and resume from correct index
  useEffect(() => {
    fetch(`${API}/assessments/${key}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.status === "complete") {
          navigate(`/assessment/${key}/report`, { replace: true });
          return;
        }
        const taskIds = data.selected_tasks ?? ["routine", "fluency", "memory"];
        const ordered = taskIds.map(id => TASKS.find(t => t.id === id)).filter(Boolean);
        setSelectedTasks(ordered);
        const nextIdx = data.task_results?.length ?? 0;
        setTaskIdx(nextIdx < ordered.length ? nextIdx : 0);
      })
      .catch(() => {
        setSelectedTasks(TASKS.slice(0, 3));
        setTaskIdx(0);
        setPhase("ready");
      });
  }, [key, token]);

  // When task advances, check if it needs clinician prep
  useEffect(() => {
    if (taskIdx === null || selectedTasks.length === 0) return;
    const task = selectedTasks[taskIdx];
    if (task?.clinicianNote) {
      setPhase("clinician_prep");
    } else {
      setPhase("ready");
    }
  }, [taskIdx, selectedTasks]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const task = taskIdx !== null && selectedTasks.length > 0 ? selectedTasks[taskIdx] : null;

  async function startRecording() {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        submitRecording(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setPhase("recording");
      setTimeLeft(task.duration);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { stopRecording(); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setErrorMsg("Microphone access was denied. Please allow microphone access and try again.");
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setPhase("processing");
  }

  async function submitRecording(blob) {
    try {
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      const res = await fetch(`${API}/assessments/${key}/tasks/${taskIdx}?task_id=${task.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(`Submission error (${res.status})`);
      if (taskIdx + 1 >= selectedTasks.length) {
        setPhase("done");
      } else {
        setTaskIdx(i => i + 1);
      }
    } catch (e) {
      setErrorMsg(e.message);
      setPhase("error");
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === "loading" || taskIdx === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-secondary)" }}>
        <div role="status" aria-live="polite" aria-label="Loading assessment">
          <div style={{ width: 36, height: 36, border: "3px solid var(--color-border-secondary)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      </div>
    );
  }

  // ── Clinician prep (for tasks like story_retell) ───────────────────────────
  if (phase === "clinician_prep" && task?.clinicianNote) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", background: "var(--color-background-secondary)" }}>
        <div style={{ width: "100%", maxWidth: 620 }}>
          <div style={{ background: "#faeeda", border: "1.5px solid #f5d08a", borderRadius: "var(--border-radius-lg)", padding: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <i className="ti ti-user-check" style={{ fontSize: 22, color: "#854f0b" }} aria-hidden="true" />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#854f0b", margin: 0, textTransform: "uppercase" }}>Clinician action required</p>
                <h2 style={{ fontSize: 17, fontWeight: 600, margin: "2px 0 0", color: "#5a3300" }}>{task.title}</h2>
              </div>
            </div>
            <div style={{ fontSize: 14, color: "#5a3300", lineHeight: 1.8, whiteSpace: "pre-line", background: "rgba(255,255,255,0.5)", borderRadius: "var(--border-radius-md)", padding: "14px 16px", marginBottom: 20 }}>
              {task.clinicianNote}
            </div>
            <button
              onClick={() => setPhase("ready")}
              style={{ width: "100%", padding: "14px", background: "#854f0b", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              Patient is ready — start recording →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Complete ───────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center", background: "var(--color-background-secondary)" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--color-background-success)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
          <i className="ti ti-check" style={{ fontSize: 32, color: "var(--color-text-success)" }} aria-hidden="true" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 14px", color: "var(--color-text-primary)" }}>Assessment complete</h1>
        <p style={{ fontSize: 16, color: "var(--color-text-secondary)", maxWidth: 420, lineHeight: 1.7, margin: "0 0 48px" }}>
          Thank you — all tasks are finished. Please return the device to your clinician now.
        </p>
        <Link to="/dashboard" style={{ fontSize: 13, color: "var(--color-text-tertiary)", textDecoration: "none", borderBottom: "0.5px solid var(--color-border-secondary)", paddingBottom: 2 }}>
          Clinician: return to dashboard →
        </Link>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 15, marginBottom: 8 }}>Something went wrong. Your clinician will assist you.</p>
        {errorMsg && (
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontFamily: "monospace", background: "var(--color-background-secondary)", padding: "6px 12px", borderRadius: "var(--border-radius-md)", marginBottom: 20, maxWidth: 480 }}>
            {errorMsg}
          </p>
        )}
        <button onClick={() => setPhase("ready")} style={{ padding: "10px 28px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          Try again
        </button>
      </div>
    );
  }

  // ── Recording UI ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", background: "var(--color-background-secondary)" }}>
      <div style={{ width: "100%", maxWidth: 580 }}>

        {/* Progress dots */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 10 }}>
            {selectedTasks.map((_, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", transition: "background 0.3s", background: i < taskIdx ? "var(--color-text-success)" : i === taskIdx ? "var(--color-accent)" : "var(--color-border-secondary)" }} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            Task {taskIdx + 1} of {selectedTasks.length}
          </p>
        </div>

        {/* Task card */}
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", padding: "2.5rem 2rem", textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 16px", color: "var(--color-text-primary)" }}>{task.title}</h2>

          <p style={{ fontSize: 16, color: "var(--color-text-secondary)", lineHeight: 1.75, margin: "0 0 20px", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            {task.instruction}
          </p>

          {/* Stimulus text (read-aloud passage) */}
          {task.stimulus && (
            <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "16px 20px", marginBottom: 24, textAlign: "left", fontSize: 17, lineHeight: 1.9, color: "var(--color-text-primary)" }}>
              {task.stimulus}
            </div>
          )}

          {/* Ready */}
          {phase === "ready" && (
            <button onClick={startRecording} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 36px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 100, fontSize: 17, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", marginTop: task.stimulus ? 0 : 16 }}>
              <i className="ti ti-microphone" aria-hidden="true" />
              Start speaking
            </button>
          )}

          {/* Recording */}
          {phase === "recording" && (
            <div>
              <RecordingWave />
              <div role="timer" aria-live="polite" aria-label={`${timeLeft} seconds remaining`} style={{ fontSize: 48, fontWeight: 300, letterSpacing: "0.04em", margin: "20px 0 8px", color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>
                {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={task.duration} aria-valuenow={task.duration - timeLeft} aria-label="Recording progress" style={{ width: "100%", height: 6, background: "var(--color-border-secondary)", borderRadius: 3, marginBottom: 28 }}>
                <div style={{ width: `${((task.duration - timeLeft) / task.duration) * 100}%`, height: "100%", background: "var(--color-accent)", borderRadius: 3, transition: "width 1s linear" }} />
              </div>
              <button onClick={stopRecording} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 30px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", border: "0.5px solid var(--color-border-danger)", borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                <i className="ti ti-player-stop-filled" aria-hidden="true" />
                Finish speaking
              </button>
            </div>
          )}

          {/* Processing */}
          {phase === "processing" && (
            <div style={{ padding: "1rem 0" }}>
              <div role="status" aria-live="polite" aria-label="Saving your response">
                <p style={{ color: "var(--color-text-secondary)", fontSize: 15, margin: "0 0 20px" }}>Saving your response…</p>
                <div style={{ width: "100%", height: 8, background: "var(--color-border-secondary)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "40%", background: "var(--color-accent)", borderRadius: 4, animation: "indeterminate 1.4s ease-in-out infinite" }} />
                </div>
              </div>
            </div>
          )}

          {errorMsg && <p style={{ color: "var(--color-text-danger)", fontSize: 13, marginTop: 16 }}>{errorMsg}</p>}
        </div>
      </div>
    </div>
  );
}
