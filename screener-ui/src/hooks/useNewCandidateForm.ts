import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCandidate, candidatesKeys } from '../api/candidates';
import { ApiError } from '../api/client';
import { useApiMutation, useInvalidate } from './useApiMutation';

interface Fields {
  githubUsername: string;
  displayName: string;
  graduationDate: string;
  notes: string;
}

export function useNewCandidateForm() {
  const navigate = useNavigate();
  const invalidate = useInvalidate();

  const [fields, setFields] = useState<Fields>({
    githubUsername: '',
    displayName: '',
    graduationDate: '',
    notes: '',
  });
  const [fieldError, setFieldError] = useState('');

  const mutation = useApiMutation(createCandidate, {
    onSuccess: (candidate) => {
      invalidate(candidatesKeys.all);
      void navigate(`/candidates/${candidate.id}`);
    },
  });

  const apiError =
    mutation.error instanceof ApiError && mutation.error.status === 409
      ? 'That GitHub username is already registered.'
      : mutation.isError
        ? 'Something went wrong. Please try again.'
        : null;

  function setField(key: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fields.githubUsername.trim()) {
      setFieldError('GitHub username is required.');
      return;
    }
    setFieldError('');
    mutation.mutate({
      github_username: fields.githubUsername.trim(),
      ...(fields.displayName.trim() ? { display_name: fields.displayName.trim() } : {}),
      ...(fields.graduationDate ? { graduation_date: fields.graduationDate } : {}),
      ...(fields.notes.trim() ? { notes: fields.notes.trim() } : {}),
    });
  }

  return { fields, setField, fieldError, apiError, isPending: mutation.isPending, submit };
}
