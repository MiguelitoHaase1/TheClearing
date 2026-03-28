"use client";

interface TrendPoint {
  date: string;
  score: number;
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) return null;

  // SVG sparkline — no dependencies
  const width = 600;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const scores = points.map((p) => p.score);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 1);
  const range = maxScore - minScore || 1;

  const xScale = (i: number) =>
    padding.left + (i / Math.max(points.length - 1, 1)) * innerW;
  const yScale = (score: number) =>
    padding.top + innerH - ((score - minScore) / range) * innerH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(p.score)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      style={{ maxHeight: 120 }}
    >
      {/* Y-axis labels */}
      <text
        x={padding.left - 5}
        y={padding.top + 4}
        textAnchor="end"
        className="fill-muted"
        fontSize={10}
        fontFamily="var(--font-geist-mono)"
      >
        {maxScore.toFixed(2)}
      </text>
      <text
        x={padding.left - 5}
        y={padding.top + innerH + 4}
        textAnchor="end"
        className="fill-muted"
        fontSize={10}
        fontFamily="var(--font-geist-mono)"
      >
        {minScore.toFixed(2)}
      </text>

      {/* Grid line */}
      <line
        x1={padding.left}
        y1={padding.top + innerH}
        x2={padding.left + innerW}
        y2={padding.top + innerH}
        stroke="var(--border)"
        strokeWidth={1}
      />

      {/* Trend line */}
      <path
        d={pathD}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xScale(i)}
          cy={yScale(p.score)}
          r={3}
          fill="var(--accent)"
        />
      ))}

      {/* X-axis dates (first and last) */}
      <text
        x={padding.left}
        y={height - 2}
        className="fill-muted"
        fontSize={9}
        fontFamily="var(--font-geist-mono)"
      >
        {new Date(points[0].date).toLocaleDateString()}
      </text>
      {points.length > 1 && (
        <text
          x={padding.left + innerW}
          y={height - 2}
          textAnchor="end"
          className="fill-muted"
          fontSize={9}
          fontFamily="var(--font-geist-mono)"
        >
          {new Date(points[points.length - 1].date).toLocaleDateString()}
        </text>
      )}
    </svg>
  );
}
