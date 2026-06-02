import { getReport, candidatesKeys } from '../api/candidates';
import { useApiQuery } from './useApiQuery';

export function useReportDetail(reportId: string) {
  const { data: report } = useApiQuery(candidatesKeys.report(reportId), () => getReport(reportId));
  const bestRole = report.data.roles.find((r) => r.role === report.data.best_fit);

  return {
    report,
    bestRole,
    recommendation: bestRole?.recommendation ?? null,
  };
}
