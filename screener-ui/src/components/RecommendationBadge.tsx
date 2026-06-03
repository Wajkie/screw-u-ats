import styles from './RecommendationBadge.module.scss';

interface Props {
  recommendation: 'Interview' | 'Pass';
}

export default function RecommendationBadge({ recommendation }: Props) {
  return (
    <span className={recommendation === 'Interview' ? styles.badgeInterview : styles.badgePass}>
      {recommendation}
    </span>
  );
}
