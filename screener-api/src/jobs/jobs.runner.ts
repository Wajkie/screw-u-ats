import { resolve } from 'node:path';
import { scoreAllRoles } from '../../../src/tools/scoreAllRoles.js';
import { setJobRunning, setJobFailed, setJobDone, insertReport } from './jobs.repository.js';

const MAX_CONCURRENT = 3;
let running = 0;
const queue: Array<() => void> = [];

function dequeue() {
  if (running >= MAX_CONCURRENT || queue.length === 0) return;
  const next = queue.shift()!;
  next();
}

async function runJob(
  jobId: string,
  candidateId: string,
  githubUsername: string,
  graduationDate: string | null,
): Promise<void> {
  running++;
  try {
    await setJobRunning(jobId);
    const githubToken = process.env.GITHUB_TOKEN ?? '';
    const rolesDir = resolve(process.env.ROLES_DIR ?? '../knowledge/roles');
    const gradDate = graduationDate ? new Date(graduationDate) : null;
    const result = await scoreAllRoles(githubUsername, githubToken, rolesDir, gradDate);
    await insertReport(jobId, candidateId, result);
    await setJobDone(jobId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setJobFailed(jobId, message);
  } finally {
    running--;
    dequeue();
  }
}

export function enqueueJob(
  jobId: string,
  candidateId: string,
  githubUsername: string,
  graduationDate: string | null,
): void {
  const task = () => {
    void runJob(jobId, candidateId, githubUsername, graduationDate);
  };
  if (running < MAX_CONCURRENT) {
    task();
  } else {
    queue.push(task);
  }
}
