import { useSuspenseQuery, skipToken } from '@tanstack/react-query';
import type { QueryKey, UseSuspenseQueryOptions } from '@tanstack/react-query';

export { skipToken };

export function useApiQuery<T>(
  queryKey: QueryKey,
  queryFn: (() => Promise<T>) | typeof skipToken,
  options?: Omit<UseSuspenseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'>,
) {
  return useSuspenseQuery<T, Error, T, QueryKey>({
    queryKey,
    queryFn: queryFn as UseSuspenseQueryOptions<T, Error, T, QueryKey>['queryFn'],
    ...options,
  });
}
