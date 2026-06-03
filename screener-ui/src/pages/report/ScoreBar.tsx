import styles from '../ReportDetail.module.scss';

export default function ScoreBar({ score }: { score: number }) {
  return (
    <div
      className={styles.scoreBar}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${styles.scoreFill} ${score >= 50 ? styles.scoreFillInterview : ''}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}
