import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { clinicianName, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header
      className="no-print"
      style={{
        borderBottom: "0.5px solid var(--color-border-primary)",
        background: "var(--color-surface)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 1rem",
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Logo → home */}
        <Link
          to="/dashboard"
          style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}
          aria-label="CogAssess home"
        >
          <img
            src="/sjl_transparent.png"
            alt="St John Lynch"
            style={{ height: 28, width: "auto", display: "block" }}
          />
        </Link>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <Link
            to="/about"
            style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}
          >
            About
          </Link>
          {clinicianName && (
            <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
              {clinicianName}
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{
              fontSize: 13,
              color: "var(--color-text-secondary)",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
