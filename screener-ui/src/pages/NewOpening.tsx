import { useNewOpeningForm } from '../hooks/useNewOpeningForm';
import { Boundary } from '../components/Boundary';
import styles from './NewCandidate.module.scss';

export default function NewOpening() {
  const { fields, setField, fieldError, apiError, roles, isPending, submit } = useNewOpeningForm();

  return (
    <div>
      <h1 className={styles.heading}>New Opening</h1>
      <Boundary pending={isPending}>
        <form onSubmit={submit} className={styles.form}>
          <label className={styles.label}>
            Title *
            <input
              className={styles.input}
              value={fields.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Frontend Developer"
              autoFocus
            />
            {fieldError && <span className={styles.fieldError}>{fieldError}</span>}
          </label>

          <label className={styles.label}>
            Description
            <textarea
              className={styles.textarea}
              value={fields.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="What we're looking for…"
            />
          </label>

          <label className={styles.label}>
            Role
            <select
              className={styles.input}
              value={fields.roleSlug}
              onChange={(e) => setField('roleSlug', e.target.value)}
              disabled={roles.length === 0}
            >
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
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
            Work type
            <select
              className={styles.input}
              value={fields.workType}
              onChange={(e) => setField('workType', e.target.value)}
            >
              <option value="">— not specified —</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </label>

          {apiError && <p className={styles.apiError}>{apiError}</p>}

          <button type="submit" disabled={isPending || roles.length === 0} className={styles.submit}>
            {isPending ? 'Creating…' : 'Create Opening'}
          </button>
        </form>
      </Boundary>
    </div>
  );
}
