import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOpening, openingsKeys } from '../api/openings';
import type { WorkType } from '../api/openings';
import { getRoles, rolesKeys } from '../api/candidates';
import { useApiQuery } from './useApiQuery';
import { useApiMutation, useInvalidate } from './useApiMutation';

interface Fields {
  title: string;
  description: string;
  roleSlug: string;
  location: string;
  workType: string;
}

export function useNewOpeningForm() {
  const navigate = useNavigate();
  const invalidate = useInvalidate();

  const [fields, setFields] = useState<Fields>({ title: '', description: '', roleSlug: '', location: '', workType: '' });
  const [fieldError, setFieldError] = useState('');

  const { data: roles } = useApiQuery(rolesKeys.list, getRoles);

  useEffect(() => {
    if (roles.length > 0 && !fields.roleSlug) {
      setFields((f) => ({ ...f, roleSlug: roles[0] }));
    }
  }, [roles, fields.roleSlug]);

  const mutation = useApiMutation(createOpening, {
    onSuccess: (opening) => {
      invalidate(openingsKeys.all);
      void navigate(`/openings/${opening.id}`);
    },
  });

  const apiError = mutation.isError ? 'Something went wrong. Please try again.' : null;

  function setField(key: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fields.title.trim()) {
      setFieldError('Title is required.');
      return;
    }
    setFieldError('');
    mutation.mutate({
      title: fields.title.trim(),
      ...(fields.description.trim() ? { description: fields.description.trim() } : {}),
      role_slug: fields.roleSlug,
      ...(fields.location.trim() ? { location: fields.location.trim() } : {}),
      ...(fields.workType ? { work_type: fields.workType as WorkType } : {}),
    });
  }

  return {
    fields,
    setField,
    fieldError,
    apiError,
    roles,
    isPending: mutation.isPending,
    submit,
  };
}
