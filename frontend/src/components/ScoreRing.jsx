export default function ScoreRing({ value, size = 72, stroke = 6, color, label }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const titleId = label ? `ring-title-${label.replace(/\s+/g, "-")}` : undefined;

  return (
    <svg
      width={size} height={size}
      style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
      role="img"
      aria-labelledby={titleId}
    >
      {titleId && <title id={titleId}>{label}: {value} out of 100</title>}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border-tertiary)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
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
        aria-hidden="true"
      >
        {value}
      </text>
    </svg>
  );
}
