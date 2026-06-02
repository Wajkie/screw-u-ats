import type { FitHistoryEntry } from '../api/candidates';
import styles from './FitHistoryChart.module.scss';

interface Props {
  history: FitHistoryEntry[];
}

const W = 600;
const H = 140;
const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

export default function FitHistoryChart({ history }: Props) {
  if (history.length === 0) return null;

  const toX = (i: number) =>
    history.length === 1
      ? PAD.left + INNER_W / 2
      : PAD.left + (i / (history.length - 1)) * INNER_W;

  const toY = (score: number) =>
    PAD.top + INNER_H - (score / 100) * INNER_H;

  const points = history.map((e, i) => ({ x: toX(i), y: toY(e.fit_score), entry: e }));

  const polyline =
    history.length > 1
      ? points.map(p => `${p.x},${p.y}`).join(' ')
      : null;

  const yLabels = [0, 25, 50, 75, 100];

  return (
    <div className={styles.wrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        aria-label="Fit score over time"
      >
        {/* Grid lines */}
        {yLabels.map(v => {
          const y = toY(v);
          return (
            <g key={v}>
              <line
                x1={PAD.left} y1={y} x2={PAD.left + INNER_W} y2={y}
                className={v === 0 || v === 100 ? styles.gridEdge : styles.grid}
              />
              <text x={PAD.left - 6} y={y + 4} className={styles.axisLabel} textAnchor="end">
                {v}
              </text>
            </g>
          );
        })}

        {/* 70-point interview threshold */}
        <line
          x1={PAD.left} y1={toY(70)} x2={PAD.left + INNER_W} y2={toY(70)}
          className={styles.threshold}
        />
        <text x={PAD.left + INNER_W + 4} y={toY(70) + 4} className={styles.thresholdLabel}>
          70
        </text>

        {/* Line */}
        {polyline && (
          <polyline
            points={polyline}
            className={styles.line}
          />
        )}

        {/* Dots + x-axis labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} className={styles.dot} />
            <title>{`${new Date(p.entry.created_at).toLocaleDateString()} — ${p.entry.fit_score} (${p.entry.best_fit})`}</title>
            {(history.length <= 6 || i === 0 || i === history.length - 1) && (
              <text x={p.x} y={H - 4} className={styles.xLabel} textAnchor="middle">
                {new Date(p.entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
