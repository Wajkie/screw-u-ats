import { useNavigate } from 'react-router-dom';
import { skipToken } from '@tanstack/react-query';
import { getRoles, listRoleLeaderboard, rolesKeys } from '../api/candidates';
import { ApiError } from '../api/client';
import { useApiQuery } from './useApiQuery';

export function useRoleLeaderboard(role: string | undefined) {
  const navigate = useNavigate();

  const { data: knownRoles } = useApiQuery(rolesKeys.list, getRoles);
  const isValidRole = knownRoles.includes(role ?? '');

  const { data, error } = useApiQuery(
    rolesKeys.leaderboard(role ?? ''),
    isValidRole ? () => listRoleLeaderboard(role!) : skipToken,
    { retry: false },
  );

  const is400 = !isValidRole || (error instanceof ApiError && error.status === 400);

  return {
    roles: knownRoles,
    data,
    is400,
    navigateTo: (r: string) => navigate(`/roles/${r}`),
  };
}
