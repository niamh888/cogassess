import { useState, useRef, useEffect } from "react";

const API_URL = "http://localhost:8000";

const TASKS = [
  {
    id: "routine",
    domain: "Episodic memory",
    icon: "ti-calendar",
    title: "Describe your typical morning",
    instruction: "Please describe what you usually do from the moment you wake up until midday. Take as much time as you need.",
    duration: 60,
  },
  {
    id: "fluency",
    domain: "Semantic memory",
    icon: "ti-category",
    title: "Name as many animals as you can",
    instruction: "For the next 60 seconds, please say as many different animals as you can think of.",
    duration: 60,
  },
  {
    id: "memory",
    domain: "Emotional processing",
    icon: "ti-heart",
    title: "Describe a pleasant memory",
    instruction: "Please describe a happy or pleasant memory from your life in as much detail as you can.",
    duration: 45,
  },
];

const DOMAIN_COLORS = {
  motor_speech: { bg: "#e1f5ee", text: "#0f6e56", label: "Motor speech" },
  semantic_memory: { bg: "#e6f1fb", text: "#185fa5", label: "Semantic memory" },
  episodic_memory: { bg: "#eeedfe", text: "#534ab7", label: "Episodic memory" },
  emotional_processing: { bg: "#faeeda", text: "#854f0b", label: "Emotional processing" },
};

function ScoreRing({ value, size = 72, stroke = 6, color }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border-tertiary)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text
        x="50%" y="50%"
        textAnchor="middle" dominantBaseline="central"
        fill="var(--color-text-primary)"
        style={{ fontSize: 16, fontWeight: 500, transform: "rotate(90deg)", transformOrigin: "center", fontFamily: "var(--font-sans)" }}
      >
        {value}
      </text>
    </svg>
  );
}

function RecordingWave({ active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
      {[0,1,2,3,4,5,6].map(i => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: active ? "var(--color-text-danger)" : "var(--color-border-tertiary)",
          height: active ? undefined : 6,
          animation: active ? `wave 1s ease-in-out ${i * 0.12}s infinite` : "none",
          minHeight: 6,
        }} />
      ))}
      <style>{`
        @keyframes wave {
          0%,100%{height:6px} 50%{height:24px}
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState("intro"); // intro | task | recording | processing | report
  const [taskIdx, setTaskIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [useMock, setUseMock] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const task = TASKS[taskIdx];

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setTimeLeft(task.duration);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { stopRecording(); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setPhase("processing");
  }

  useEffect(() => {
    if (audioBlob && phase === "processing") {
      submitAudio(audioBlob);
    }
  }, [audioBlob]);

  async function submitAudio(blob) {
    if (useMock) {
      await new Promise(r => setTimeout(r, 2200));
      setResult(MOCK_RESULT);
      setPhase("report");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      const res = await fetch(`${API_URL}/assess`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setResult(data);
      setPhase("report");
    } catch (e) {
      setError(`Analysis failed: ${e.message}`);
      setPhase("task");
    }
  }

  function reset() {
    setPhase("intro");
    setTaskIdx(0);
    setResult(null);
    setAudioBlob(null);
    setError(null);
  }

  const riskColors = { low: "#0f6e56", moderate: "#854f0b", elevated: "#993c1d" };
  const riskBg = { low: "#e1f5ee", moderate: "#faeeda", elevated: "#faece7" };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1rem", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-text-tertiary)", margin: "0 0 4px", textTransform: "uppercase" }}>
          Cognitive Assessment Platform
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>
          Speech biomarker analysis
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Pipeline mode:</span>
          <button
            onClick={() => setUseMock(m => !m)}
            style={{ fontSize: 12, padding: "2px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", background: useMock ? "var(--color-background-warning)" : "var(--color-background-success)", color: useMock ? "var(--color-text-warning)" : "var(--color-text-success)" }}
          >
            {useMock ? "Mock data (demo)" : "Live API"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--color-background-danger)", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", padding: "12px 16px", marginBottom: 16, color: "var(--color-text-danger)", fontSize: 14 }}>
          <i className="ti ti-alert-circle" aria-hidden style={{ marginRight: 8 }} />{error}
        </div>
      )}

      {/* ── INTRO ── */}
      {phase === "intro" && (
        <div>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <p style={{ margin: "0 0 1rem", color: "var(--color-text-secondary)", fontSize: 15, lineHeight: 1.7 }}>
              This assessment records brief speech samples and analyses them across four cognitive domains using an automated pipeline. The session takes approximately 3–4 minutes.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {Object.entries(DOMAIN_COLORS).map(([k, v]) => (
                <div key={k} style={{ background: v.bg, borderRadius: "var(--border-radius-md)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: v.text }}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "0 0 4px" }}>Tasks in this session</p>
            {TASKS.map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{t.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-tertiary)" }}>{t.domain} · {t.duration}s</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setPhase("task")} style={{ width: "100%", padding: "12px", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
            Begin assessment <i className="ti ti-arrow-right" aria-hidden />
          </button>
        </div>
      )}

      {/* ── TASK ── */}
      {phase === "task" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem" }}>
            {TASKS.map((t, i) => (
              <div key={t.id} style={{ flex: 1, height: 4, borderRadius: 2, background: i < taskIdx ? "var(--color-text-success)" : i === taskIdx ? "var(--color-text-info)" : "var(--color-border-tertiary)" }} />
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
            <button onClick={startRecording} style={{ width: "100%", padding: "12px", fontSize: 15, cursor: "pointer" }}>
              <i className="ti ti-microphone" aria-hidden style={{ marginRight: 8 }} />Start recording
            </button>
          ) : (
            <div>
              <div style={{ background: "var(--color-background-danger)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <RecordingWave active={isRecording} />
                  <span style={{ fontSize: 14, color: "var(--color-text-danger)", fontWeight: 500 }}>Recording</span>
                </div>
                <span style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-danger)", fontVariantNumeric: "tabular-nums" }}>
                  {String(Math.floor(timeLeft / 60)).padStart(2,"0")}:{String(timeLeft % 60).padStart(2,"0")}
                </span>
              </div>
              <button onClick={stopRecording} style={{ width: "100%", padding: "12px", fontSize: 15, cursor: "pointer" }}>
                <i className="ti ti-player-stop" aria-hidden style={{ marginRight: 8 }} />Stop &amp; analyse
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PROCESSING ── */}
      {phase === "processing" && (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid var(--color-border-tertiary)", borderTopColor: "var(--color-text-info)", margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>Analysing speech</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14, margin: "0 0 1.5rem" }}>Running pipeline across all cognitive domains…</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 280, margin: "0 auto", textAlign: "left" }}>
            {["Transcribing via Chirp STT", "Extracting acoustic features", "Morphological tagging", "Semantic analysis", "Emotion detection"].map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--color-text-secondary)", animation: `fadein 0.4s ease ${i * 0.4}s both` }}>
                <i className="ti ti-loader-2" aria-hidden style={{ fontSize: 14, animation: "spin 1s linear infinite" }} />
                {s}
              </div>
            ))}
            <style>{`@keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
          </div>
        </div>
      )}

      {/* ── REPORT ── */}
      {phase === "report" && result && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 11, letterSpacing: "0.1em", color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>Assessment complete</p>
              <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Session report</h2>
            </div>
            <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: "var(--border-radius-md)", background: riskBg[result.report.overall_risk], color: riskColors[result.report.overall_risk], fontWeight: 500 }}>
              {result.report.overall_risk.charAt(0).toUpperCase() + result.report.overall_risk.slice(1)} risk
            </span>
          </div>

          {/* Composite score */}
          <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 20 }}>
            <ScoreRing value={result.scores.composite} size={80} stroke={7} color="#185fa5" />
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--color-text-secondary)" }}>Composite cognitive score</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-tertiary)" }}>Session ID: {result.session_id?.slice(0, 8)}</p>
            </div>
          </div>

          {/* Domain scores */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: "1rem" }}>
            {Object.entries(DOMAIN_COLORS).map(([k, v]) => (
              <div key={k} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem", display: "flex", alignItems: "center", gap: 12 }}>
                <ScoreRing value={result.scores[k]} size={52} stroke={5} color={v.text} />
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{v.label}</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{result.scores[k]}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Transcript */}
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-file-text" aria-hidden style={{ fontSize: 14 }} />Transcript
            </p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
              {result.transcript}
            </p>
          </div>

          {/* Flags */}
          {result.report.flags?.length > 0 && (
            <div style={{ border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginBottom: "1rem", background: "var(--color-background-warning)" }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-warning)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-flag" aria-hidden style={{ fontSize: 14 }} />Clinical flags
              </p>
              {result.report.flags.map((f, i) => (
                <p key={i} style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-warning)", paddingLeft: 4 }}>· {f}</p>
              ))}
            </div>
          )}

          {/* Emotion breakdown */}
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--color-text-tertiary)" }}>
              <i className="ti ti-mood-happy" aria-hidden style={{ fontSize: 14, marginRight: 6 }} />Emotion distribution
            </p>
            {Object.entries(result.pipeline?.emotion || {})
              .filter(([k]) => ["joy","sadness","anger","fear","disgust","surprise","neutral"].includes(k))
              .map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", width: 70, textTransform: "capitalize" }}>{k}</span>
                  <div style={{ flex: 1, height: 6, background: "var(--color-background-secondary)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(v * 100).toFixed(0)}%`, background: "var(--color-text-info)", borderRadius: 3, transition: "width 1s ease" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", width: 36, textAlign: "right" }}>{(v * 100).toFixed(0)}%</span>
                </div>
              ))}
          </div>

          {/* Disclaimer */}
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
            <i className="ti ti-info-circle" aria-hidden style={{ fontSize: 13, marginRight: 6 }} />
            {result.report.note}
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            {taskIdx < TASKS.length - 1 ? (
              <button onClick={() => { setTaskIdx(i => i + 1); setPhase("task"); setAudioBlob(null); }} style={{ flex: 1, padding: "11px", fontSize: 14, cursor: "pointer" }}>
                Next task <i className="ti ti-arrow-right" aria-hidden />
              </button>
            ) : null}
            <button onClick={reset} style={{ flex: 1, padding: "11px", fontSize: 14, cursor: "pointer" }}>
              <i className="ti ti-refresh" aria-hidden style={{ marginRight: 8 }} />New session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const MOCK_RESULT = {
  session_id: "a3f8b1c2-demo",
  transcript: "I usually wake up around seven in the morning and then I make breakfast. Sometimes I forget where I put my keys. Yesterday I went to the... the place where you buy things. The shop. I had a good day.",
  duration_seconds: 2.1,
  pipeline: {
    stt: { transcript: "...", words_per_minute: 112, confidence: 0.94, model: "chirp" },
    acoustic: { speech_rate_syllables_per_sec: 3.8, pause_count: 4, mean_pause_duration_ms: 820, hnr_db: 18.6 },
    morphology: { noun_ratio: 0.31, verb_ratio: 0.22, first_person_ratio: 0.71, disfluency_count: 2, type_token_ratio: 0.61 },
    semantics: { semantic_variability: 0.18, high_frequency_word_ratio: 0.44, semantic_granularity_score: 0.61, topic_coherence: 0.73 },
    emotion: { joy: 0.31, sadness: 0.18, anger: 0.04, fear: 0.09, disgust: 0.03, surprise: 0.07, neutral: 0.28, dominant_emotion: "joy", valence: "positive" },
  },
  scores: { motor_speech: 62, semantic_memory: 58, episodic_memory: 71, emotional_processing: 83, composite: 69 },
  report: {
    overall_risk: "moderate",
    flags: ["High-frequency word preference — possible semantic memory reduction", "Word-finding difficulty markers detected (2 disfluencies)"],
    recommendations: ["Administer formal semantic fluency task", "Monitor for anomia progression"],
    note: "This output is indicative only and requires clinical validation. Not for use as standalone diagnostic tool.",
  },
};
