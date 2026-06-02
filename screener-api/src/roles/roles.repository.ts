import { readdirSync } from 'fs';
import { resolve } from 'path';

export function loadRoleSlugs(): string[] {
  const dir = resolve(process.env.ROLES_DIR ?? '../knowledge/roles');
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''))
      .sort();
  } catch {
    return [];
  }
}
