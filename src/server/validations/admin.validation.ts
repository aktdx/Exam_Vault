import { z } from 'zod';

export const addAdminSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

export const toggleAdminSchema = z.object({
  body: z.object({
    isAdmin: z.boolean(),
  }),
  params: z.object({
    uid: z.string().min(1, "UID is required"),
  })
});

// Used for single ID routes (DELETE /paper/:id, GET /paper/:id, etc)
export const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("ID must be a positive integer"),
  }),
});

// Used for CRUD routes like POST /branches, POST /subjects
export const createBranchSchema = z.object({
  body: z.object({
    collegeId: z.coerce.number().int().positive(),
    name: z.string().min(1),
    code: z.string().min(1),
  })
});

export const createAcademicYearSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    level: z.coerce.number().int().positive(),
  })
});

export const createSemesterSchema = z.object({
  body: z.object({
    branchId: z.coerce.number().int().positive(),
    academicYearId: z.coerce.number().int().positive().optional().nullable(),
    name: z.string().min(1),
    number: z.coerce.number().int().positive(),
  })
});

export const createSubjectSchema = z.object({
  body: z.object({
    branchId: z.coerce.number().int().positive(),
    semesterId: z.coerce.number().int().positive(),
    name: z.string().min(1),
    code: z.string().min(1),
  })
});

export const createExamTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1),
  })
});

export const branchIdParamSchema = z.object({
  params: z.object({
    branchId: z.coerce.number().int().positive(),
  })
});

export const branchSemesterParamSchema = z.object({
  params: z.object({
    branchId: z.coerce.number().int().positive(),
    semesterId: z.coerce.number().int().positive(),
  })
});

export const subjectIdParamSchema = z.object({
  params: z.object({
    subjectId: z.coerce.number().int().positive(),
  })
});
