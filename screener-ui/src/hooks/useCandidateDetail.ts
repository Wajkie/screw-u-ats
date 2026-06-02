import { useNavigate } from 'react-router-dom';
import {
  getCandidate,
  listReports,
  createJob,
  getFitHistory,
  candidatesKeys,
} from '../api/candidates';
import { useApiQuery } from './useApiQuery';
import { useApiMutation, useInvalidate } from './useApiMutation';

export function useCandidateDetail(id: string) {
  const navigate = useNavigate();
  const invalidate = useInvalidate();

  const candidateQuery = useApiQuery(candidatesKeys.detail(id), () => getCandidate(id));
  const reportsQuery = useApiQuery(candidatesKeys.reports(id), () => listReports(id));
  const fitHistoryQuery = useApiQuery(candidatesKeys.fitHistory(id), () => getFitHistory(id));

  const jobMutation = useApiMutation(() => createJob(id), {
    onSuccess: (job) => {
      invalidate(candidatesKeys.all);
      void navigate(`/candidates/${id}/jobs/${job.id}`);
    },
  });

  return {
    candidate: candidateQuery.data,
    reports: reportsQuery.data ?? [],
    fitHistory: fitHistoryQuery.data,
    isLoading: candidateQuery.isLoading,
    isError: candidateQuery.isError,
    startAnalysis: () => jobMutation.mutate(undefined as never),
    isAnalyzing: jobMutation.isPending,
  };
}
