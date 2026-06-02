import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';

export function useApiQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, Error, T, QueryKey>({ queryKey, queryFn, ...options });
}
