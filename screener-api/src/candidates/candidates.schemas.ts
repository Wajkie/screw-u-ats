import { z } from 'zod';
import { workTypeSchema } from '../openings/openings.schemas.js';

const graduationDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'graduation_date must be YYYY-MM-DD')
  .nullish();

export const createCandidateSchema = z.object({
  github_username: z.string().min(1, 'github_username is required'),
  display_name: z.string().nullish(),
  graduation_date: graduationDate,
  notes: z.string().nullish(),
  location: z.string().nullish(),
  work_type_preference: workTypeSchema.nullish(),
});

export const updateCandidateSchema = z
  .object({
    display_name: z.string().nullish(),
    graduation_date: graduationDate,
    notes: z.string().nullish(),
    location: z.string().nullish(),
    work_type_preference: workTypeSchema.nullish(),
  })
  .refine((data) => Object.keys(data).length > 0, 'No fields to update');

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
