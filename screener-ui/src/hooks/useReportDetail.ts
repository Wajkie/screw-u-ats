import { getReport, candidatesKeys } from '../api/candidates';
import { useApiQuery } from './useApiQuery';

export function useReportDetail(reportId: string) {
  const query = useApiQuery(candidatesKeys.report(reportId), () => getReport(reportId));

  const bestRole = query.data?.data.roles.find((r) => r.role === query.data?.data.best_fit);

  return {
    report: query.data,
    bestRole,
    recommendation: bestRole?.recommendation ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
