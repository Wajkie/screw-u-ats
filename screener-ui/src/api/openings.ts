import { get, post } from './client';

export type WorkType = 'remote' | 'hybrid' | 'onsite';

export interface Opening {
  id: string;
  title: string;
  description: string | null;
  role_slug: string;
  status: 'open' | 'closed';
  location: string | null;
  work_type: WorkType | null;
  created_at: string;
  candidate_count: number;
}

export interface OpeningCandidate {
  id: string;
  github_username: string;
  display_name: string | null;
  created_at: string;
  report_id: string;
  best_fit: string;
  fit_score: number;
  scored_at: string;
}

export interface CreateOpeningInput {
  title: string;
  description?: string;
  role_slug: string;
  location?: string;
  work_type?: WorkType;
}

export const openingsKeys = {
  all: ['openings'] as const,
  detail: (id: string) => ['openings', id] as const,
  candidates: (id: string) => ['openings', id, 'candidates'] as const,
};

export function listOpenings(): Promise<Opening[]> {
  return get<Opening[]>('/openings');
}

export function getOpening(id: string): Promise<Opening> {
  return get<Opening>(`/openings/${id}`);
}

export function createOpening(input: CreateOpeningInput): Promise<Opening> {
  return post<Opening>('/openings', input);
}

export function triggerSourcing(id: string): Promise<{ jobId: string }> {
  return post<{ jobId: string }>(`/openings/${id}/source`);
}

export function listOpeningCandidates(id: string): Promise<OpeningCandidate[]> {
  return get<OpeningCandidate[]>(`/openings/${id}/candidates`);
}
