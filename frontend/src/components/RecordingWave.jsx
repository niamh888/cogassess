export default function RecordingWave({ active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: active ? "var(--color-text-danger)" : "var(--color-border-tertiary)",
            height: active ? undefined : 6,
            animation: active ? `wave 1s ease-in-out ${i * 0.12}s infinite` : "none",
            minHeight: 6,
          }}
        />
      ))}
      <style>{`
        @keyframes wave { 0%,100%{height:6px} 50%{height:24px} }
      `}</style>
    </div>
  );
}
