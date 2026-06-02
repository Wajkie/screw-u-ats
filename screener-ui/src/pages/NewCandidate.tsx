import { useNewCandidateForm } from '../hooks/useNewCandidateForm';
import styles from './NewCandidate.module.scss';

export default function NewCandidate() {
  const { fields, setField, fieldError, apiError, isPending, submit } = useNewCandidateForm();

  return (
    <div>
      <h1 className={styles.heading}>Add Candidate</h1>
      <form onSubmit={submit} className={styles.form}>
        <label className={styles.label}>
          GitHub username *
          <input
            className={styles.input}
            value={fields.githubUsername}
            onChange={(e) => setField('githubUsername', e.target.value)}
            placeholder="octocat"
            autoFocus
          />
          {fieldError && <span className={styles.fieldError}>{fieldError}</span>}
        </label>

        <label className={styles.label}>
          Display name
          <input
            className={styles.input}
            value={fields.displayName}
            onChange={(e) => setField('displayName', e.target.value)}
            placeholder="Jane Smith"
          />
        </label>

        <label className={styles.label}>
          Graduation date
          <input
            className={styles.input}
            type="date"
            value={fields.graduationDate}
            onChange={(e) => setField('graduationDate', e.target.value)}
          />
        </label>

        <label className={styles.label}>
          Notes
          <textarea
            className={styles.textarea}
            value={fields.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Any relevant context…"
          />
        </label>

        {apiError && <p className={styles.apiError}>{apiError}</p>}

        <button type="submit" disabled={isPending} className={styles.submit}>
          {isPending ? 'Adding…' : 'Add Candidate'}
        </button>
      </form>
    </div>
  );
}
