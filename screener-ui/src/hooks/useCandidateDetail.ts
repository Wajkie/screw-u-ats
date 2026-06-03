import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCandidate,
  listReports,
  createJob,
  getFitHistory,
  getFeatures,
  candidatesKeys,
} from '../api/candidates';
import { useApiQuery } from './useApiQuery';
import { useApiMutation, useInvalidate } from './useApiMutation';

export function useCandidateDetail(id: string) {
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const [includeLighthouse, setIncludeLighthouse] = useState(false);

  const { data: candidate } = useApiQuery(candidatesKeys.detail(id), () => getCandidate(id));
  const { data: reports } = useApiQuery(candidatesKeys.reports(id), () => listReports(id));
  const { data: fitHistory } = useApiQuery(candidatesKeys.fitHistory(id), () => getFitHistory(id));
  const { data: features } = useApiQuery(['features'], getFeatures);

  const jobMutation = useApiMutation(() => createJob(id, includeLighthouse), {
    onSuccess: (job) => {
      invalidate(candidatesKeys.all);
      void navigate(`/candidates/${id}/jobs/${job.id}`);
    },
  });

  return {
    candidate,
    reports: reports ?? [],
    fitHistory,
    lighthouseAvailable: features?.lighthouse ?? false,
    includeLighthouse,
    setIncludeLighthouse,
    startAnalysis: () => jobMutation.mutate(undefined as never),
    isAnalyzing: jobMutation.isPending,
  };
}
