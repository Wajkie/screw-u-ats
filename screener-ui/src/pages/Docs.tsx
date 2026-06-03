import { useState } from 'react';
import RecruiterDocs from './docs/RecruiterDocs';
import ApiDocs from './docs/ApiDocs';
import styles from './Docs.module.scss';

type Tab = 'recruiter' | 'api';

export default function Docs() {
  const [tab, setTab] = useState<Tab>('recruiter');

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Documentation</h1>
      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          type="button"
          aria-selected={tab === 'recruiter'}
          className={`${styles.tab} ${tab === 'recruiter' ? styles.tabActive : ''}`}
          onClick={() => setTab('recruiter')}
        >
          For Recruiters
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={tab === 'api'}
          className={`${styles.tab} ${tab === 'api' ? styles.tabActive : ''}`}
          onClick={() => setTab('api')}
        >
          API Reference
        </button>
      </div>

      {tab === 'recruiter' ? <RecruiterDocs /> : <ApiDocs />}
    </div>
  );
}
