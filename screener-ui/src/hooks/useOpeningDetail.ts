import { useNavigate } from 'react-router-dom';
import { getOpening, listOpeningCandidates, triggerSourcing, openingsKeys } from '../api/openings';
import { useApiQuery } from './useApiQuery';
import { useApiMutation, useInvalidate } from './useApiMutation';

export function useOpeningDetail(id: string) {
  const navigate = useNavigate();
  const invalidate = useInvalidate();

  const { data: opening } = useApiQuery(openingsKeys.detail(id), () => getOpening(id));
  const { data: candidates } = useApiQuery(openingsKeys.candidates(id), () => listOpeningCandidates(id));

  const sourceMutation = useApiMutation(() => triggerSourcing(id), {
    onSuccess: ({ jobId }) => {
      invalidate(openingsKeys.all);
      void navigate(`/openings/${id}/source/${jobId}`);
    },
  });

  return {
    opening,
    candidates: candidates ?? [],
    startSourcing: () => sourceMutation.mutate(undefined as never),
    isSourcing: sourceMutation.isPending,
  };
}
