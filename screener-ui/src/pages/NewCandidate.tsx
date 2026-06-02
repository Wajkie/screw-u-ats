import { useNewCandidateForm } from '../hooks/useNewCandidateForm';
import { Boundary } from '../components/Boundary';
import styles from './NewCandidate.module.scss';

export default function NewCandidate() {
  const { fields, setField, fieldError, apiError, isPending, submit } = useNewCandidateForm();

  return (
    <div>
      <h1 className={styles.heading}>Add Candidate</h1>
      <Boundary pending={isPending}>
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

          <label className={styles.label}>
            Location
            <input
              className={styles.input}
              value={fields.location}
              onChange={(e) => setField('location', e.target.value)}
              placeholder="Stockholm"
            />
          </label>

          <label className={styles.label}>
            Work type preference
            <select
              className={styles.input}
              value={fields.workTypePreference}
              onChange={(e) => setField('workTypePreference', e.target.value)}
            >
              <option value="">— not specified —</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </label>

          {apiError && <p className={styles.apiError}>{apiError}</p>}

          <button type="submit" disabled={isPending} className={styles.submit}>
            {isPending ? 'Adding…' : 'Add Candidate'}
          </button>
        </form>
      </Boundary>
    </div>
  );
}
