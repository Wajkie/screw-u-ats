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
      es.close();
      // SSE stream closed before a terminal event — fall back to REST to get
      // the current state (handles the race where the server closes the
      // already-terminal stream before the browser's onmessage fires).
      void fetch(`${API_URL}/jobs/${jobId}`)
        .then((r) => (r.ok ? (r.json() as Promise<{ status: string; report_id?: string; error?: string }>) : null))
        .then((job) => {
          if (!job) { setError('Connection lost.'); return; }
          setStatus(job.status as JobStatus);
          if (job.report_id) setReportId(job.report_id);
          if (job.error) setError(job.error);
        })
        .catch(() => setError('Connection lost.'));
    };

    return () => {
      es.close();
    };
  }, [jobId]);

  return { status, reportId, error };
}
