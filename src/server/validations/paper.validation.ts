import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const createPaperSchema = z.object({
  body: z.object({
    subjectId: z.coerce.number().int().positive("Subject ID must be a positive integer"),
    examTypeId: z.coerce.number().int().positive("Exam Type ID must be a positive integer"),
    year: z.coerce.number().int().min(2000, "Year must be at least 2000").max(currentYear, "Year cannot be in the future"),
    session: z.enum(["Winter", "Summer"], { message: "Session must be Winter or Summer" }),
    notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().nullable(),
  }),
});

export const updatePaperSchema = z.object({
  body: z.object({
    subjectId: z.coerce.number().int().positive().optional(),
    examTypeId: z.coerce.number().int().positive().optional(),
    year: z.coerce.number().int().min(2000).max(currentYear).optional(),
    session: z.enum(["Winter", "Summer"]).optional(),
    notes: z.string().max(1000).optional().nullable(),
  }),
  params: z.object({
    id: z.coerce.number().int().positive("Paper ID must be a positive integer"),
  }),
});

export const searchPapersSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  })
});
