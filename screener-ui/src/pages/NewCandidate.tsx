import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCandidate, candidatesKeys } from '../api/candidates';
import { ApiError } from '../api/client';
import styles from './NewCandidate.module.scss';

export default function NewCandidate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [githubUsername, setGithubUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [graduationDate, setGraduationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldError, setFieldError] = useState('');

  const mutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: (candidate) => {
      void queryClient.invalidateQueries({ queryKey: candidatesKeys.all });
      void navigate(`/candidates/${candidate.id}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!githubUsername.trim()) {
      setFieldError('GitHub username is required.');
      return;
    }
    setFieldError('');
    mutation.mutate({
      github_username: githubUsername.trim(),
      ...(displayName.trim() ? { display_name: displayName.trim() } : {}),
      ...(graduationDate ? { graduation_date: graduationDate } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  const apiError =
    mutation.error instanceof ApiError && mutation.error.status === 409
      ? 'That GitHub username is already registered.'
      : mutation.isError
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <div>
      <h1 className={styles.heading}>Add Candidate</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          GitHub username *
          <input
            className={styles.input}
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="octocat"
            autoFocus
          />
          {fieldError && <span className={styles.fieldError}>{fieldError}</span>}
        </label>

        <label className={styles.label}>
          Display name
          <input
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jane Smith"
          />
        </label>

        <label className={styles.label}>
          Graduation date
          <input
            className={styles.input}
            type="date"
            value={graduationDate}
            onChange={(e) => setGraduationDate(e.target.value)}
          />
        </label>

        <label className={styles.label}>
          Notes
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any relevant context…"
          />
        </label>

        {apiError && <p className={styles.apiError}>{apiError}</p>}

        <button type="submit" disabled={mutation.isPending} className={styles.submit}>
          {mutation.isPending ? 'Adding…' : 'Add Candidate'}
        </button>
      </form>
    </div>
  );
}