import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:8000";

const STATUS_COLOR = { in_progress: "#854f0b", complete: "#0f6e56" };
const STATUS_BG    = { in_progress: "#faeeda", complete: "#e1f5ee" };

export default function DashboardPage() {
  const { token, clinicianName } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    fetch(`${API}/assessments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setAssessments)
      .catch(() => setError("Could not load assessments. Is the server running?"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-text-tertiary)", margin: "0 0 4px", textTransform: "uppercase" }}>
            CogAssess · Clinician dashboard
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
            Welcome, {clinicianName || "Clinician"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => navigate("/intake")}
            style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            + New assessment
          </button>
        </div>
      </div>

      {/* Clinical notice */}
      <div style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", marginBottom: 24, fontSize: 13, color: "var(--color-text-warning)", lineHeight: 1.5 }}>
        <strong>Clinical notice:</strong> CogAssess results are biomarker indicators only. All outputs require clinician interpretation and must not be communicated directly to patients.
      </div>

      {/* Content */}
      {loading && <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading assessments…</p>}
      {error   && <p style={{ color: "var(--color-text-danger)", fontSize: 14 }}>{error}</p>}

      {!loading && !error && assessments.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-secondary)" }}>
          <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8, color: "var(--color-text-primary)" }}>No assessments yet</p>
          <p style={{ fontSize: 14, marginBottom: 24 }}>Create a patient record and start the first assessment.</p>
          <button
            onClick={() => navigate("/intake")}
            style={{ padding: "12px 28px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Start assessment
          </button>
        </div>
      )}

      {assessments.length > 0 && (
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid var(--color-border-primary)", background: "var(--color-background-secondary)" }}>
                {["Ref","Patient ref","Date","Type","Clinician","Tasks","Status",""].map((h, i) => (
                  <th key={i} style={{ textAlign: i < 5 ? "left" : "right", padding: "10px 14px", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessments.map(a => (
                <tr key={a.id} style={{ borderBottom: "0.5px solid var(--color-border-primary)" }}>
                  <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>{a.assessment_ref ?? "—"}</td>
                  <td style={{ padding: "12px 14px", fontWeight: 500 }}>{a.patient_ref}</td>
                  <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)" }}>{a.date_of_assessment}</td>
                  <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{a.assessment_type}</td>
                  <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)" }}>{a.clinician_name}</td>
                  <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {Array.from({ length: 3 }, (_, i) => (
                        <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < a.task_count ? "var(--color-text-success)" : "var(--color-border-secondary)" }} />
                      ))}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ background: STATUS_BG[a.status], color: STATUS_COLOR[a.status], fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {a.status === "in_progress" ? "In progress" : "Complete"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {a.status === "complete" ? (
                      <Link to={`/assessment/${a.assessment_key}/report`} style={{ fontSize: 13, color: "var(--color-accent)", textDecoration: "none", fontWeight: 500 }}>
                        View report →
                      </Link>
                    ) : (
                      <Link to={`/assessment/${a.assessment_key}/record`} style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>
                        Continue →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
