import type { Context } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../errors.js';

export async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => null);
  if (raw === null) throw new ValidationError('Invalid JSON body');

  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
      .join('; ');
    throw new ValidationError(message);
  }

  return result.data;
}
