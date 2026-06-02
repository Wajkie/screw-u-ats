import { z } from 'zod';
import { loadRoleSlugs } from '../roles/roles.repository.js';

export const workTypeSchema = z.enum(['remote', 'hybrid', 'onsite']);

export const createOpeningSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().nullish(),
  role_slug: z.string().refine(
    (v) => loadRoleSlugs().includes(v),
    { message: 'Unknown role_slug' },
  ),
  status: z.enum(['open', 'closed']).default('open'),
  location: z.string().nullish(),
  work_type: workTypeSchema.nullish(),
  source_url: z.string().url('source_url must be a valid URL').nullish(),
});

export const updateOpeningSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullish(),
    status: z.enum(['open', 'closed']).optional(),
    location: z.string().nullish(),
    work_type: workTypeSchema.nullish(),
    source_url: z.string().url('source_url must be a valid URL').nullish(),
  })
  .refine((data) => Object.keys(data).length > 0, 'No fields to update');

export const batchOpeningItemSchema = createOpeningSchema.extend({
  external_id: z.string().nullish(),
});

export const batchOpeningsSchema = z.object({
  openings: z.array(batchOpeningItemSchema).min(1, 'openings array must not be empty'),
});

export type CreateOpeningInput = z.infer<typeof createOpeningSchema>;
export type UpdateOpeningInput = z.infer<typeof updateOpeningSchema>;
export type BatchOpeningItem = z.infer<typeof batchOpeningItemSchema>;
export type BatchOpeningsInput = z.infer<typeof batchOpeningsSchema>;
