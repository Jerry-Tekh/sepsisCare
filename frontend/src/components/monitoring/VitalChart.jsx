import { useEffect, useRef, useState } from "react";
import { formatDateTime } from "./vitals.js";
import styles from "./VitalChart.module.css";

const HEIGHT = 130;
const PAD = { top: 12, right: 12, bottom: 22, left: 34 };

function fieldLevel(reading, key) {
  return reading.alerts?.find((a) => a.field === key)?.level || "NORMAL";
}

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * Single-series trend for one vital sign. The shaded band is the normal
 * range; markers outside it take the status color of their server-side
 * alert and the tooltip names the level, so color is never the only cue.
 */
export default function VitalChart({ vital, readings }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [hover, setHover] = useState(null);

  const points = readings
    .filter((r) => r[vital.key] !== null && r[vital.key] !== undefined)
    .map((r) => ({ t: new Date(r.recordedAt).getTime(), v: r[vital.key], level: fieldLevel(r, vital.key), at: r.recordedAt }))
    .sort((a, b) => a.t - b.t)
    .slice(-30);

  const latest = points[points.length - 1];

  // Zoom to the data. A band edge is pulled into view only when it's near
  // the readings, so a wide band (e.g. systolic 101–219) can't flatten the line.
  const data = points.map((p) => p.v);
  const dMin = Math.min(...data);
  const dMax = Math.max(...data);
  const reach = Math.max(dMax - dMin, (vital.normal[1] - vital.normal[0]) * 0.25);
  const nearEdges = vital.normal.filter((edge) => edge >= dMin - reach && edge <= dMax + reach);
  const lo = Math.min(dMin, ...nearEdges);
  const hi = Math.max(dMax, ...nearEdges);
  const span = hi - lo || Math.abs(hi) * 0.1 || 1;
  const yMin = lo - span * 0.15;
  const yMax = hi + span * 0.15;
  const bandTop = Math.min(vital.normal[1], yMax);
  const bandBottom = Math.max(vital.normal[0], yMin);
  const tMin = points[0]?.t ?? 0;
  const tMax = latest?.t ?? 1;

  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (t) => PAD.left + (tMax === tMin ? plotW / 2 : ((t - tMin) / (tMax - tMin)) * plotW);
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let nearest = null;
    for (const p of points) {
      if (!nearest || Math.abs(x(p.t) - mx) < Math.abs(x(nearest.t) - mx)) nearest = p;
    }
    setHover(nearest);
  }

  const fmt = (v) => (vital.step === "0.1" ? v.toFixed(1) : String(v));

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.header}>
        <span className={styles.title}>{vital.shortLabel || vital.label}</span>
        {latest ? (
          <span className={styles.latest}>
            <strong>{fmt(latest.v)}</strong> {vital.unit}
          </span>
        ) : (
          <span className={styles.none}>No readings</span>
        )}
      </figcaption>

      <div ref={wrapRef} className={styles.plot}>
        {width > 0 && points.length > 0 && (
          <svg width={width} height={HEIGHT} role="img"
            aria-label={`${vital.label} trend, ${points.length} readings, latest ${fmt(latest.v)} ${vital.unit}`}>
            {/* Normal range band */}
            <rect
              x={PAD.left} width={plotW}
              y={y(bandTop)} height={Math.max(y(bandBottom) - y(bandTop), 0)}
              className={styles.band}
            />
            {/* Axis labels: visible band edges */}
            {nearEdges.map((v) => (
              <text key={v} x={PAD.left - 6} y={y(v) + 3} className={styles.axisLabel} textAnchor="end">{v}</text>
            ))}
            <line x1={PAD.left} x2={PAD.left + plotW} y1={HEIGHT - PAD.bottom} y2={HEIGHT - PAD.bottom} className={styles.baseline} />
            {points.length > 1 && (
              <>
                <text x={PAD.left} y={HEIGHT - 6} className={styles.axisLabel}>
                  {new Date(tMin).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </text>
                <text x={PAD.left + plotW} y={HEIGHT - 6} className={styles.axisLabel} textAnchor="end">
                  {new Date(tMax).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </text>
              </>
            )}

            {hover && <line x1={x(hover.t)} x2={x(hover.t)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className={styles.crosshair} />}

            <path d={path} className={styles.line} />
            {points.map((p, i) => (
              <circle
                key={`${p.t}-${i}`}
                cx={x(p.t)} cy={y(p.v)}
                r={hover?.t === p.t ? 5.5 : 4}
                className={`${styles.marker} ${styles[`marker_${p.level}`]}`}
              />
            ))}

            {/* Hit area larger than the marks */}
            <rect
              x={PAD.left - 8} y={0} width={plotW + 16} height={HEIGHT}
              fill="transparent"
              onMouseMove={handleMove}
              onMouseLeave={() => setHover(null)}
            />
          </svg>
        )}

        {hover && (
          <div
            className={styles.tooltip}
            style={{ left: Math.min(Math.max(x(hover.t), 70), width - 70), top: Math.max(y(hover.v) - 12, 0) }}
            role="status"
          >
            <strong>{fmt(hover.v)} {vital.unit}</strong>
            {hover.level !== "NORMAL" && (
              <span className={styles[`tip_${hover.level}`]}>{hover.level === "URGENT" ? "Urgent" : "Watch"}</span>
            )}
            <span className={styles.tipDate}>{formatDateTime(hover.at)}</span>
          </div>
        )}
      </div>
      <p className={styles.legend}>
        <span className={styles.legendBand} aria-hidden="true" /> Normal range {vital.normal[0]}–{vital.normal[1]} {vital.unit}
      </p>
    </figure>
  );
}
