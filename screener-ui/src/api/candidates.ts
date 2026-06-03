import { get, post } from './client';

export interface ReportSummary {
  id: string;
  job_id: string;
  best_fit: string;
  fit_score: number;
  recommendation: 'Interview' | 'Pass';
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
  recommendation: 'Interview' | 'Pass';
  created_at: string;
}

export type WorkType = 'remote' | 'hybrid' | 'onsite';

export interface Candidate {
  id: string;
  github_username: string;
  display_name: string | null;
  graduation_date: string | null;
  notes: string | null;
  location: string | null;
  work_type_preference: WorkType | null;
  created_at: string;
  updated_at: string;
  latest_report: LatestReport | null;
}

export interface CreateCandidateInput {
  github_username: string;
  display_name?: string;
  graduation_date?: string;
  notes?: string;
  location?: string;
  work_type_preference?: WorkType;
}

export type MatchedConcept = string | { concept: string; occurrences: number };

export interface Breakdown {
  trajectory: number;
  concept_match: number;
  complexity: number;
}

export interface RoleScore {
  role: string;
  role_name: string;
  fit_score: number;
  recommendation: 'Interview' | 'Pass';
  breakdown: Breakdown;
  matched_concepts: MatchedConcept[];
  missing_concepts: string[];
}

export interface TrackGroup {
  track: string;
  tiers: RoleScore[];
}

export interface CurvePoint {
  period: string;
  repoCount: number;
  avgComplexity: number;
}

export interface TrajectoryInfo {
  score: number;
  summary: string;
  curve: CurvePoint[];
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: number;
}

export interface UrlAuditResult {
  url: string;
  scores: LighthouseScores;
  wcag_violations: string[];
}

export interface LighthouseEnrichment {
  live_projects_found: number;
  audits: UrlAuditResult[];
}

export interface ActivitySignal {
  last_pushed_at: string;
  repos_last_90d: number;
  repos_last_180d: number;
  total_original_repos: number;
  account_age_months: number;
  is_recently_active: boolean;
}

export interface RepoReviewCard {
  name: string;
  repo_url: string;
  combined_score: number;
  complexity_score: number;
  concept_score: number;
  matched_concepts: string[];
  missing_concepts: string[];
  highlights: Array<{ signal: string; url: string }>;
}

export interface AllRolesResult {
  candidate: string;
  best_fit: string;
  roles: RoleScore[];
  tracks: TrackGroup[];
  trajectory: TrajectoryInfo;
  lighthouse?: LighthouseEnrichment;
  activity?: ActivitySignal;
  top_repos_for_review?: RepoReviewCard[];
}

export interface Report {
  id: string;
  candidate_id: string;
  job_id: string;
  best_fit: string;
  fit_score: number;
  data: AllRolesResult;
  created_at: string;
}

export interface RoleLeaderboardEntry {
  candidate_id: string;
  github_username: string;
  display_name: string | null;
  report_id: string;
  report_created_at: string;
  fit_score: number;
  recommendation: 'Interview' | 'Pass';
}

export interface FitHistoryEntry {
  created_at: string;
  fit_score: number;
  best_fit: string;
}

export const candidatesKeys = {
  all: ['candidates'] as const,
  detail: (id: string) => ['candidates', id] as const,
  reports: (id: string) => ['candidates', id, 'reports'] as const,
  report: (id: string) => ['reports', id] as const,
  fitHistory: (id: string) => ['candidates', id, 'fit-history'] as const,
};

export const rolesKeys = {
  list: ['roles'] as const,
  leaderboard: (role: string) => ['roles', role, 'candidates'] as const,
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

export function getReport(reportId: string): Promise<Report> {
  return get<Report>(`/reports/${reportId}`);
}

export function listRoleLeaderboard(role: string): Promise<RoleLeaderboardEntry[]> {
  return get<RoleLeaderboardEntry[]>(`/roles/${role}/candidates`);
}

export function getFitHistory(candidateId: string): Promise<FitHistoryEntry[]> {
  return get<FitHistoryEntry[]>(`/candidates/${candidateId}/fit-history`);
}

export function getRoles(): Promise<string[]> {
  return get<string[]>('/roles');
}
