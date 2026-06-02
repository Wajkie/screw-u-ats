import { z } from 'zod';
import { loadRoleSlugs } from '../roles/roles.repository.js';

export const createOpeningSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().nullish(),
  role_slug: z.string().refine(
    (v) => loadRoleSlugs().includes(v),
    { message: 'Unknown role_slug' },
  ),
  status: z.enum(['open', 'closed']).default('open'),
});

export const updateOpeningSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullish(),
    status: z.enum(['open', 'closed']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'No fields to update');

export type CreateOpeningInput = z.infer<typeof createOpeningSchema>;
export type UpdateOpeningInput = z.infer<typeof updateOpeningSchema>;
