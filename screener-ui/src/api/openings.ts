import { get, post } from './client';
import { ALL_ROLES } from './candidates';

export type { RoleSlug } from './candidates';
export { ALL_ROLES };

export interface Opening {
  id: string;
  title: string;
  description: string | null;
  role_slug: string;
  status: 'open' | 'closed';
  created_at: string;
  candidate_count: number;
}

export interface CreateOpeningInput {
  title: string;
  description?: string;
  role_slug: string;
}

export const openingsKeys = {
  all: ['openings'] as const,
  detail: (id: string) => ['openings', id] as const,
};

export function listOpenings(): Promise<Opening[]> {
  return get<Opening[]>('/openings');
}

export function createOpening(input: CreateOpeningInput): Promise<Opening> {
  return post<Opening>('/openings', input);
}
