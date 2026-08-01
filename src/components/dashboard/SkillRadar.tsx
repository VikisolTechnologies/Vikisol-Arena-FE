"use client";

/** Simple SVG radar — axes derived from real profile stats, never fabricated scores. */
export function SkillRadar({ axes }: { axes: { label: string; value: number }[] }) {
  const size = 220;
  const center = size / 2;
  const radius = size / 2 - 34;
  const n = axes.length;

  const pointAt = (i: number, fraction: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius * fraction,
      y: center + Math.sin(angle) * radius * fraction,
    };
  };

  const ringLevels = [0.25, 0.5, 0.75, 1];
  const polygon = axes.map((a, i) => pointAt(i, Math.max(0.06, a.value))).map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size + 20}`} className="w-full max-w-[260px]">
      {ringLevels.map((level) => (
        <polygon
          key={level}
          points={axes.map((_, i) => pointAt(i, level)).map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
        />
      ))}
      {axes.map((_, i) => {
        const p = pointAt(i, 1);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" />;
      })}
      <polygon points={polygon} fill="rgba(255,107,53,0.22)" stroke="var(--primary-soft)" strokeWidth={1.5} />
      {axes.map((a, i) => {
        const p = pointAt(i, 1.24);
        return (
          <text
            key={a.label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10 }}
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
