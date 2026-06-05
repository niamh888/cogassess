import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:8000";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = new URLSearchParams({ username, password });
      const res  = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Login failed");
      }
      const data = await res.json();
      login(data.access_token, data.clinician_name);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const field = { width: "100%", padding: "10px 12px", fontSize: 14, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", outline: "none", boxSizing: "border-box", background: "var(--color-surface)", fontFamily: "var(--font-sans)" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-secondary)", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 400, background: "var(--color-surface)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-primary)", padding: "2.5rem 2rem" }}>
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <img
            src="/memorytell-logo.png"
            alt="MemoryTell"
            style={{ height: 36, width: "auto", display: "block", margin: "0 auto 20px" }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "var(--color-brand)", letterSpacing: "-0.01em" }}>
            CogAssess
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4, marginBottom: 0 }}>
            Clinician portal — speech biomarker assessment
          </p>
        </div>

        {error && (
          <div role="alert" style={{ background: "var(--color-background-danger)", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 16, color: "var(--color-text-danger)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="username" style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--color-text-primary)" }}>
              Username
            </label>
            <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" autoFocus style={field} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="password" style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--color-text-primary)" }}>
              Password
            </label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" style={field} />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px", fontSize: 15, fontWeight: 600, background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "var(--font-sans)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center", marginTop: "2rem", lineHeight: 1.7, marginBottom: 0 }}>
          For authorised clinicians only.<br />
          CogAssess outputs require clinician interpretation and should not be communicated directly to patients.
        </p>
      </div>
    </div>
  );
}
