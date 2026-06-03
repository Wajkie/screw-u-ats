import { useState } from 'react';
import apiDocs from '../../data/apiDocs.json';
import styles from '../Docs.module.scss';

const METHOD_STYLE: Record<string, string> = {
  GET: styles.methodGet,
  POST: styles.methodPost,
  PATCH: styles.methodPatch,
  DELETE: styles.methodDelete,
  PUT: styles.methodPut,
};

const GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Candidates', ids: ['create-candidate', 'list-candidates', 'get-candidate', 'update-candidate', 'delete-candidate'] },
  { label: 'Analysis jobs', ids: ['trigger-job', 'get-job', 'stream-job'] },
  { label: 'Reports', ids: ['list-candidate-reports', 'get-report', 'fit-history', 'role-leaderboard'] },
  { label: 'Openings', ids: ['create-opening', 'batch-openings', 'list-openings', 'get-opening', 'update-opening', 'delete-opening'] },
  { label: 'Sourcing', ids: ['trigger-sourcing', 'get-sourcing-job', 'stream-sourcing-job', 'list-opening-candidates'] },
];

const endpointMap = Object.fromEntries(apiDocs.endpoints.map(e => [e.id, e]));

function EndpointRow({ id }: { id: string }) {
  const ep = endpointMap[id];
  const [open, setOpen] = useState(false);
  if (!ep) return null;
  return (
    <div className={styles.endpoint}>
      <button
        type="button"
        className={styles.endpointHeader}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={`${styles.method} ${METHOD_STYLE[ep.method] ?? ''}`}>{ep.method}</span>
        <code className={styles.path}>{ep.path}</code>
        <span className={styles.epSummary}>{ep.summary}</span>
        <span className={styles.chevron} aria-hidden>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={styles.endpointDetail}>
          {'body' in ep && ep.body && (
            <div className={styles.detailBlock}>
              <p className={styles.detailLabel}>Request body</p>
              <pre className={styles.codeBlock}>{JSON.stringify(ep.body, null, 2)}</pre>
            </div>
          )}
          {'params' in ep && ep.params && (
            <div className={styles.detailBlock}>
              <p className={styles.detailLabel}>Path params</p>
              <pre className={styles.codeBlock}>{JSON.stringify(ep.params, null, 2)}</pre>
            </div>
          )}
          <div className={styles.detailBlock}>
            <p className={styles.detailLabel}>Responses</p>
            <pre className={styles.codeBlock}>{JSON.stringify(ep.responses, null, 2)}</pre>
          </div>
          {'example' in ep && ep.example && (
            <div className={styles.detailBlock}>
              <p className={styles.detailLabel}>Example</p>
              <pre className={styles.codeBlock}>{JSON.stringify(ep.example, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div>
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Middleware stack</h2>
        <p className={styles.metaDesc}>{apiDocs.middleware.description}</p>
        <table className={styles.mwTable}>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Summary</th>
              <th>Config</th>
            </tr>
          </thead>
          <tbody>
            {apiDocs.middleware.layers.map(layer => (
              <tr key={layer.id}>
                <td><code>{layer.id}</code></td>
                <td>{layer.summary}</td>
                <td><code>{'config' in layer ? layer.config : '—'}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {GROUPS.map(group => (
        <section key={group.label} className={styles.section}>
          <h2 className={styles.sectionHeading}>{group.label}</h2>
          <div className={styles.endpointList}>
            {group.ids.map(id => <EndpointRow key={id} id={id} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
