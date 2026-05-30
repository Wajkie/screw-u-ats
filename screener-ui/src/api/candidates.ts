import { get, post } from './client';

export interface LatestReport {
  id: string;
  best_fit: string;
  fit_score: number;
  created_at: string;
}

export interface Candidate {
  id: string;
  github_username: string;
  display_name: string | null;
  graduation_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  latest_report: LatestReport | null;
}

export interface CreateCandidateInput {
  github_username: string;
  display_name?: string;
  graduation_date?: string;
  notes?: string;
}

export const candidatesKeys = {
  all: ['candidates'] as const,
  detail: (id: string) => ['candidates', id] as const,
};

export function listCandidates(): Promise<Candidate[]> {
  return get<Candidate[]>('/candidates');
}

export function createCandidate(input: CreateCandidateInput): Promise<Candidate> {
  return post<Candidate>('/candidates', input);
}
