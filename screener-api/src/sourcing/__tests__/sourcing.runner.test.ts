import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { runSourcingJob, sourcingEmitters } from '../sourcing.runner.js';
import type { SourcingEvent } from '../sourcing.runner.js';

vi.mock('../../openings/openings.repository.js', () => ({
  findOpeningById: vi.fn(),
}));
vi.mock('../../github/searchUsers.js', () => ({
  searchGitHubUsers: vi.fn(),
}));
vi.mock('../../jobs/jobs.repository.js', () => ({
  createJob: vi.fn(),
}));
vi.mock('../../jobs/jobs.runner.js', () => ({
  enqueueJob: vi.fn(),
}));
vi.mock('../sourcing.repository.js', () => ({
  createSourcingJob: vi.fn(),
  setSourcingJobRunning: vi.fn(),
  setSourcingJobFound: vi.fn(),
  setSourcingJobScored: vi.fn(),
  setSourcingJobDone: vi.fn(),
  setSourcingJobFailed: vi.fn(),
  findSourcingJobById: vi.fn(),
}));
vi.mock('../../db/client.js', () => ({
  db: {
    selectFrom: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        where: vi.fn(() => ({ executeTakeFirst: vi.fn() })),
      })),
    })),
    insertInto: vi.fn(() => ({
      values: vi.fn(() => ({
        returningAll: vi.fn(() => ({
          executeTakeFirstOrThrow: vi.fn(),
        })),
      })),
    })),
    updateTable: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ execute: vi.fn() })),
      })),
    })),
  },
}));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, readFileSync: vi.fn(() => '# Role\n## Required Concepts\n- react\n- typescript\n') };
});
vi.mock('../../../src/scoring/conceptMatch.js', () => ({
  parseRoleDefinition: vi.fn(() => ({
    name: 'Junior Frontend',
    requiredConcepts: ['react', 'typescript'],
    bonusConcepts: [],
    minimumComplexityScore: 35,
  })),
}));

beforeAll(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.clearAllMocks();
  sourcingEmitters.clear();
});

describe('runSourcingJob', () => {
  it('transitions status running → done and updates counters', async () => {
    const { findOpeningById } = await import('../../openings/openings.repository.js');
    const { searchGitHubUsers } = await import('../../github/searchUsers.js');
    const { createJob } = await import('../../jobs/jobs.repository.js');
    const { enqueueJob } = await import('../../jobs/jobs.runner.js');
    const {
      setSourcingJobRunning,
      setSourcingJobFound,
      setSourcingJobScored,
      setSourcingJobDone,
    } = await import('../sourcing.repository.js');
    const { db } = await import('../../db/client.js');

    vi.mocked(findOpeningById).mockResolvedValue({
      id: 'opening-1',
      title: 'FE Role',
      description: null,
      role_slug: 'junior-frontend',
      status: 'open',
      location: null,
      work_type: null,
      source_url: null,
      external_id: null,
      created_at: '2024-01-01T00:00:00.000Z',
    });
    vi.mocked(searchGitHubUsers).mockResolvedValue(['alice', 'bob']);
    vi.mocked(createJob).mockResolvedValue({
      id: 'job-id',
      candidate_id: 'cand-id',
      status: 'pending',
      error: null,
      created_at: '2024-01-01T00:00:00.000Z',
      started_at: null,
      completed_at: null,
    });

    // upsertCandidateSourced: no existing candidate, so insert
    const dbSelectChain = {
      selectAll: vi.fn(() => ({
        where: vi.fn(() => ({ executeTakeFirst: vi.fn().mockResolvedValue(undefined) })),
      })),
    };
    const dbInsertChain = {
      values: vi.fn(() => ({
        returningAll: vi.fn(() => ({
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
            id: 'cand-id',
            github_username: 'alice',
            display_name: null,
            graduation_date: null,
            notes: null,
            sourced_from_opening_id: 'opening-1',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          }),
        })),
      })),
    };
    vi.mocked(db.selectFrom).mockReturnValue(dbSelectChain as unknown as ReturnType<typeof db.selectFrom>);
    vi.mocked(db.insertInto).mockReturnValue(dbInsertChain as unknown as ReturnType<typeof db.insertInto>);

    const events: SourcingEvent[] = [];
    sourcingEmitters.set('sourcing-1', new Set([(e) => events.push(e)]));

    await runSourcingJob('sourcing-1', 'opening-1');

    expect(setSourcingJobRunning).toHaveBeenCalledWith('sourcing-1');
    expect(setSourcingJobFound).toHaveBeenCalledWith('sourcing-1', 2);
    expect(setSourcingJobScored).toHaveBeenCalledTimes(2);
    expect(setSourcingJobDone).toHaveBeenCalledWith('sourcing-1');
    expect(enqueueJob).toHaveBeenCalledTimes(2);
    expect(events.at(-1)?.status).toBe('done');
    expect(events.at(-1)?.usernames_found).toBe(2);
    expect(events.at(-1)?.usernames_scored).toBe(2);
  });

  it('sets status failed and emits error event on exception', async () => {
    const { findOpeningById } = await import('../../openings/openings.repository.js');
    const { setSourcingJobFailed } = await import('../sourcing.repository.js');

    vi.mocked(findOpeningById).mockRejectedValue(new Error('DB down'));

    const events: SourcingEvent[] = [];
    sourcingEmitters.set('sourcing-2', new Set([(e) => events.push(e)]));

    await runSourcingJob('sourcing-2', 'opening-1');

    expect(setSourcingJobFailed).toHaveBeenCalledWith('sourcing-2', 'DB down');
    expect(events.at(-1)?.status).toBe('failed');
    expect(events.at(-1)?.error).toBe('DB down');
  });

  it('upserts existing candidate with sourced_from_opening_id when it is null', async () => {
    const { findOpeningById } = await import('../../openings/openings.repository.js');
    const { searchGitHubUsers } = await import('../../github/searchUsers.js');
    const { createJob } = await import('../../jobs/jobs.repository.js');
    const { db } = await import('../../db/client.js');

    vi.mocked(findOpeningById).mockResolvedValue({
      id: 'opening-1',
      title: 'FE Role',
      description: null,
      role_slug: 'junior-frontend',
      status: 'open',
      location: null,
      work_type: null,
      source_url: null,
      external_id: null,
      created_at: '2024-01-01T00:00:00.000Z',
    });
    vi.mocked(searchGitHubUsers).mockResolvedValue(['alice']);
    vi.mocked(createJob).mockResolvedValue({
      id: 'job-id',
      candidate_id: 'existing-cand',
      status: 'pending',
      error: null,
      created_at: '2024-01-01T00:00:00.000Z',
      started_at: null,
      completed_at: null,
    });

    const existingCandidate = {
      id: 'existing-cand',
      github_username: 'alice',
      display_name: null,
      graduation_date: null,
      notes: null,
      sourced_from_opening_id: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const updateChain = {
      set: vi.fn(() => ({ where: vi.fn(() => ({ execute: vi.fn().mockResolvedValue(undefined) })) })),
    };
    const dbSelectChain = {
      selectAll: vi.fn(() => ({
        where: vi.fn(() => ({ executeTakeFirst: vi.fn().mockResolvedValue(existingCandidate) })),
      })),
    };
    vi.mocked(db.selectFrom).mockReturnValue(dbSelectChain as unknown as ReturnType<typeof db.selectFrom>);
    vi.mocked(db.updateTable).mockReturnValue(updateChain as unknown as ReturnType<typeof db.updateTable>);

    await runSourcingJob('sourcing-3', 'opening-1');

    // updateTable called for sourced_from_opening_id patch (since it was null)
    expect(db.updateTable).toHaveBeenCalledWith('candidates');
  });
});
