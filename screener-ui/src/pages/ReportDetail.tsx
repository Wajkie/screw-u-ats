import { useParams, Link } from 'react-router-dom';
import { useReportDetail } from '../hooks/useReportDetail';
import RecommendationBadge from '../components/RecommendationBadge';
import CopyButton from '../components/CopyButton';
import TrackSection from './report/TrackSection';
import TrajectoryCurve from './report/TrajectoryCurve';
import LighthousePanel from './report/LighthousePanel';
import ActivityPanel from './report/ActivityPanel';
import TopReposForReview from './report/TopReposForReview';
import ConceptsSection from './report/ConceptsSection';
import { buildAIPrompt, downloadAsPDF } from '../lib/reportExport';
import styles from './ReportDetail.module.scss';

export default function ReportDetail() {
  const { id, reportId } = useParams<{ id: string; reportId: string }>();
  const { report, bestRole, recommendation } = useReportDetail(reportId!);
  const data = report.data;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.backLink}>
            <Link to={`/candidates/${id}`}>← Back to candidate</Link>
          </div>
          <h1 className={styles.heading}>
            <a
              href={`https://github.com/${data.candidate}`}
              target="_blank"
              rel="noreferrer"
              className={styles.ghLink}
            >
              {data.candidate}
            </a>
          </h1>
          <div className={styles.meta}>
            {new Date(report.created_at).toLocaleString()} · Best fit: <strong>{data.best_fit}</strong>
          </div>
        </div>
        <div className={styles.headerActions}>
          {recommendation && (
            <RecommendationBadge recommendation={recommendation as 'Interview' | 'Pass'} />
          )}
          <CopyButton text={buildAIPrompt(data)} label="Copy AI prompt" copiedLabel="Copied!" />
          <button type="button" className={styles.pdfBtn} onClick={() => downloadAsPDF(data)}>
            Download PDF
          </button>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Role fit by track</h2>
        <div className={styles.tracks}>
          {data.tracks.map(group => (
            <TrackSection key={group.track} group={group} bestFit={data.best_fit} />
          ))}
        </div>
      </section>

      <TrajectoryCurve trajectory={data.trajectory} />

      {data.lighthouse && <LighthousePanel lighthouse={data.lighthouse} />}

      {data.activity && <ActivityPanel activity={data.activity} />}

      {data.top_repos_for_review && data.top_repos_for_review.length > 0 && (
        <TopReposForReview repos={data.top_repos_for_review} />
      )}

      {bestRole && <ConceptsSection role={bestRole} />}
    </div>
  );
}
