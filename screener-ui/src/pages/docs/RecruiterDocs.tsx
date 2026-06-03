import { Link } from 'react-router-dom';
import styles from '../Docs.module.scss';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.sectionHeading}>{title}</h2>
      {children}
    </section>
  );
}

export default function RecruiterDocs() {
  return (
    <div className={styles.prose}>
      <Section id="what" title="What is this?">
        <p>Screw U, ATS is a proof-of-concept hiring tool that screens junior developer candidates by analysing their public GitHub activity instead of their CV. Junior candidates and career-changers often have little or no work history to put on a CV — this tool bypasses that entirely.</p>
        <p>Give it a GitHub username and it tells you: a fit score (0–100), whether to interview, which technical concepts they've demonstrated, which are missing, and a plain-English summary of how their skills have grown over time.</p>
        <div className={styles.callout}>
          Scoped to junior and early-career candidates. Scoring deliberately rewards learning trajectory — a candidate who is clearly improving is often a stronger long-term hire than one with a static skill set.
        </div>
      </Section>

      <Section id="scoring" title="How scoring works">
        <p>Each analysis produces a <strong>fit score (0–100)</strong> built from three signals:</p>
        <div className={styles.signalGrid}>
          <div className={styles.signalCard}>
            <span className={styles.signalWeight}>45%</span>
            <strong>Trajectory</strong>
            <p>Are their recent projects more complex than earlier ones? A positive learning curve is weighted heavily.</p>
          </div>
          <div className={styles.signalCard}>
            <span className={styles.signalWeight}>35%</span>
            <strong>Concept match</strong>
            <p>Which role-specific concepts (e.g. React hooks, REST integration, TypeScript) appear in their repos, and how many times?</p>
          </div>
          <div className={styles.signalCard}>
            <span className={styles.signalWeight}>20%</span>
            <strong>Complexity</strong>
            <p>How structurally complex is their code? Measured from folder depth, file count, and dependency breadth.</p>
          </div>
        </div>
        <p>A score of <strong>50 or above</strong> yields an <em>Interview</em> recommendation. Below 50 is <em>Pass</em>.</p>
      </Section>

      <Section id="roles" title="Role tiers">
        <p>Roles are defined as <strong>tier × track</strong>. Each combination has its own concept checklist and complexity expectations.</p>
        <div className={styles.roleGrid}>
          {['Junior', 'Mid', 'Senior'].map(tier => (
            <div key={tier} className={styles.roleRow}>
              <span className={styles.roleTier}>{tier}</span>
              {['Frontend', 'Fullstack', 'Backend', 'C#'].map(track => (
                <span key={track} className={styles.roleChip}>{track}</span>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section id="workflow" title="How to use the app">
        <ol className={styles.stepList}>
          <li><strong>Add a candidate</strong> — enter their GitHub username plus optional metadata (display name, graduation date, location, work preference).</li>
          <li><strong>Run analysis</strong> — click Re-analyse on the candidate page. The job runs in the background; the page streams live status updates.</li>
          <li><strong>Read the report</strong> — see scores for every role tier, trajectory curve, matched and missing concepts, activity signals, and top repos to review manually.</li>
          <li><strong>Use openings</strong> — create a job opening tied to a role slug. Use the Sourcing feature to automatically search GitHub for matching candidates and analyse them in bulk.</li>
          <li><strong>Compare candidates</strong> — the Role Leaderboard ranks all candidates for any given role by fit score.</li>
        </ol>
      </Section>

      <Section id="data" title="Your data">
        <p>This tool stores publicly available GitHub profile data and recruiter-entered notes. No data is sold or shared with third parties. Candidates can request removal at any time.</p>
        <div className={styles.dataLinks}>
          <Link to="/privacy" className={styles.dataLink}>Privacy policy →</Link>
          <Link to="/data-removal" className={styles.dataLink}>Request data removal →</Link>
        </div>
      </Section>
    </div>
  );
}
