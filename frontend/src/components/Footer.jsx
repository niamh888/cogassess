export default function Footer({ onPrivacy, onTerms }) {
  return (
    <footer style={{ borderTop: "0.5px solid var(--color-border-tertiary)", marginTop: "3rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.25rem 1rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img
            src="/memorytell-logo.png"
            alt="MemoryTell"
            style={{ height: 28, width: "auto", display: "block" }}
          />
          <div style={{ borderLeft: "0.5px solid var(--color-border-secondary)", paddingLeft: "1rem" }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>
              CogAssess — Speech Biomarker Analysis
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Developed by <strong style={{ color: "var(--color-text-secondary)" }}>St John Lynch &amp; Co. Ltd</strong>
              &ensp;·&ensp;
              &copy; {new Date().getFullYear()} <strong style={{ color: "var(--color-text-secondary)" }}>MemoryTell Ltd</strong>. All rights reserved.
            </p>
          </div>
        </div>
        <nav aria-label="Legal links" style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={onPrivacy}
            style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "var(--color-accent)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            Privacy Policy
          </button>
          <button
            onClick={onTerms}
            style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "var(--color-accent)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            Terms of Use
          </button>
        </nav>
      </div>
    </footer>
  );
}
