import { useMutation, useQueryClient, type UseMutationOptions, type QueryKey } from '@tanstack/react-query';

export function useApiMutation<TVars, TData>(
  mutationFn: (vars: TVars) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVars>, 'mutationFn'>,
) {
  return useMutation<TData, Error, TVars>({ mutationFn, ...options });
}

export function useInvalidate() {
  const queryClient = useQueryClient();
  return (queryKey: QueryKey) => void queryClient.invalidateQueries({ queryKey });
}
