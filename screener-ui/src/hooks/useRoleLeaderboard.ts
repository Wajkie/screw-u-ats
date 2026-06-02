import { useNavigate } from 'react-router-dom';
import { getRoles, listRoleLeaderboard, rolesKeys } from '../api/candidates';
import { ApiError } from '../api/client';
import { useApiQuery } from './useApiQuery';

export function useRoleLeaderboard(role: string | undefined) {
  const navigate = useNavigate();

  const rolesQuery = useApiQuery(rolesKeys.list, getRoles);
  const knownRoles = rolesQuery.data ?? [];
  const isValidRole = knownRoles.length === 0 || knownRoles.includes(role ?? '');

  const leaderboardQuery = useApiQuery(
    rolesKeys.leaderboard(role ?? ''),
    () => listRoleLeaderboard(role!),
    { enabled: knownRoles.length > 0 && isValidRole, retry: false },
  );

  const is400 =
    (knownRoles.length > 0 && !isValidRole) ||
    (leaderboardQuery.isError &&
      leaderboardQuery.error instanceof ApiError &&
      leaderboardQuery.error.status === 400);

  return {
    roles: knownRoles,
    data: leaderboardQuery.data,
    isLoading: leaderboardQuery.isLoading,
    isError: leaderboardQuery.isError && !is400,
    is400,
    navigateTo: (r: string) => navigate(`/roles/${r}`),
  };
}
