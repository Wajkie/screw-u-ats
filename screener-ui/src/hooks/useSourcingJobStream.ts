import { useEffect, useState } from 'react';
import { API_URL } from '../api/client';

export type SourcingJobStatus = 'pending' | 'running' | 'done' | 'failed';

interface SourcingEvent {
  status: SourcingJobStatus;
  usernames_found?: number;
  usernames_scored?: number;
  error?: string;
}

interface UseSourcingJobStreamResult {
  status: SourcingJobStatus | null;
  usernamesFound: number;
  usernamesScored: number;
  error: string | null;
}

export function useSourcingJobStream(jobId: string): UseSourcingJobStreamResult {
  const [status, setStatus] = useState<SourcingJobStatus | null>(null);
  const [usernamesFound, setUsernamesFound] = useState(0);
  const [usernamesScored, setUsernamesScored] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/sourcing-jobs/${jobId}/stream`);

    const applyEvent = (data: SourcingEvent) => {
      setStatus(data.status);
      if (data.usernames_found !== undefined) setUsernamesFound(data.usernames_found);
      if (data.usernames_scored !== undefined) setUsernamesScored(data.usernames_scored);
      if (data.error) setError(data.error);
      if (data.status === 'done' || data.status === 'failed') es.close();
    };

    es.onmessage = (e) => {
      applyEvent(JSON.parse(e.data as string) as SourcingEvent);
    };

    es.onerror = () => {
      es.close();
      void fetch(`${API_URL}/sourcing-jobs/${jobId}`)
        .then((r) => (r.ok ? (r.json() as Promise<SourcingEvent>) : null))
        .then((job) => {
          if (!job) { setError('Connection lost.'); return; }
          applyEvent(job);
        })
        .catch(() => setError('Connection lost.'));
    };

    return () => { es.close(); };
  }, [jobId]);

  return { status, usernamesFound, usernamesScored, error };
}
