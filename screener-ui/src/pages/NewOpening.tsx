import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOpening, openingsKeys } from '../api/openings';
import { getRoles, rolesKeys } from '../api/candidates';
import styles from './NewCandidate.module.scss';

export default function NewOpening() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roleSlug, setRoleSlug] = useState('');
  const [fieldError, setFieldError] = useState('');

  const rolesQuery = useQuery({ queryKey: rolesKeys.list, queryFn: getRoles });

  useEffect(() => {
    if (rolesQuery.data && rolesQuery.data.length > 0 && !roleSlug) {
      setRoleSlug(rolesQuery.data[0]);
    }
  }, [rolesQuery.data, roleSlug]);

  const mutation = useMutation({
    mutationFn: createOpening,
    onSuccess: (opening) => {
      void queryClient.invalidateQueries({ queryKey: openingsKeys.all });
      void navigate(`/openings/${opening.id}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFieldError('Title is required.');
      return;
    }
    setFieldError('');
    mutation.mutate({
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      role_slug: roleSlug,
    });
  }

  const apiError = mutation.isError ? 'Something went wrong. Please try again.' : null;
  const roles = rolesQuery.data ?? [];

  return (
    <div>
      <h1 className={styles.heading}>New Opening</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          Title *
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Frontend Developer"
            autoFocus
          />
          {fieldError && <span className={styles.fieldError}>{fieldError}</span>}
        </label>

        <label className={styles.label}>
          Description
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What we're looking for…"
          />
        </label>

        <label className={styles.label}>
          Role
          <select
            className={styles.input}
            value={roleSlug}
            onChange={(e) => setRoleSlug(e.target.value)}
            disabled={roles.length === 0}
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        {apiError && <p className={styles.apiError}>{apiError}</p>}

        <button type="submit" disabled={mutation.isPending || roles.length === 0} className={styles.submit}>
          {mutation.isPending ? 'Creating…' : 'Create Opening'}
        </button>
      </form>
    </div>
  );
}
