export interface CandidatesTable {
  id: string;
  github_username: string;
  display_name: string | null;
  graduation_date: string | null;
  notes: string | null;
  sourced_from_opening_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpeningsTable {
  id: string;
  title: string;
  description: string | null;
  role_slug: string;
  status: 'open' | 'closed';
  created_at: string;
}

export interface SourcingJobsTable {
  id: string;
  opening_id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  error: string | null;
  usernames_found: number;
  usernames_scored: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AnalysisJobsTable {
  id: string;
  candidate_id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ReportsTable {
  id: string;
  candidate_id: string;
  job_id: string;
  best_fit: string;
  fit_score: number;
  data: string;
  created_at: string;
}

export interface Database {
  candidates: CandidatesTable;
  analysis_jobs: AnalysisJobsTable;
  reports: ReportsTable;
  openings: OpeningsTable;
  sourcing_jobs: SourcingJobsTable;
}
