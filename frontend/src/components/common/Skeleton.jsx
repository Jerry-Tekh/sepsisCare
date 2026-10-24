import styles from "./Skeleton.module.css";

/**
 * Generic shimmer block. Compose these to match the shape of the content
 * that will replace them once data loads (avoids layout jump).
 */
export default function Skeleton({ width = "100%", height = "1rem", radius, circle = false, className = "" }) {
  const style = {
    width,
    height,
    borderRadius: circle ? "50%" : radius,
  };
  return <span className={`${styles.skeleton} ${className}`} style={style} aria-hidden="true" />;
}
