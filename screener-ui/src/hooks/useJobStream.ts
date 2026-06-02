import { useEffect, useState } from 'react';
import { API_URL } from '../api/client';

export type JobStatus = 'pending' | 'running' | 'done' | 'failed';

interface StreamEvent {
  status: JobStatus;
  report_id?: string;
  error?: string;
}

interface UseJobStreamResult {
  status: JobStatus | null;
  reportId: string | null;
  error: string | null;
}

export function useJobStream(jobId: string): UseJobStreamResult {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/jobs/${jobId}/stream`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data as string) as StreamEvent;
      setStatus(data.status);
      if (data.report_id) setReportId(data.report_id);
      if (data.error) setError(data.error);
      if (data.status === 'done' || data.status === 'failed') {
        es.close();
      }
    };

    es.onerror = () => {
      setError('Connection lost.');
      es.close();
    };

    return () => {
      es.close();
    };
  }, [jobId]);

  return { status, reportId, error };
}
