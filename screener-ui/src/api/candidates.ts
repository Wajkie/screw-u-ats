import { get, post } from './client';

export interface ReportSummary {
  id: string;
  job_id: string;
  best_fit: string;
  fit_score: number;
  created_at: string;
}

export interface Job {
  id: string;
  candidate_id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  report_id?: string;
}

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
  reports: (id: string) => ['candidates', id, 'reports'] as const,
};

export function listCandidates(): Promise<Candidate[]> {
  return get<Candidate[]>('/candidates');
}

export function getCandidate(id: string): Promise<Candidate> {
  return get<Candidate>(`/candidates/${id}`);
}

export function createCandidate(input: CreateCandidateInput): Promise<Candidate> {
  return post<Candidate>('/candidates', input);
}

export function listReports(candidateId: string): Promise<ReportSummary[]> {
  return get<ReportSummary[]>(`/candidates/${candidateId}/reports`);
}

export function createJob(candidateId: string): Promise<Job> {
  return post<Job>(`/candidates/${candidateId}/jobs`);
}
