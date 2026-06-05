import { useRef, useEffect } from "react";

export default function PolicyModal({ policy, onClose }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    closeButtonRef.current?.focus();

    function handleKey(e) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{ background: "#fff", borderRadius: "var(--border-radius-lg)", maxWidth: 680, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
          <div>
            <h2 id="modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{policy.title}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-tertiary)" }}>Last updated: {policy.updated}</p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", flexShrink: 0 }}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {policy.sections.map(s => (
            <div key={s.heading}>
              <h3 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{s.heading}</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{ padding: "1rem 1.5rem", borderTop: "0.5px solid var(--color-border-tertiary)", flexShrink: 0, textAlign: "right" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", fontSize: 14, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
