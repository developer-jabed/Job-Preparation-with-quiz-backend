import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createSubject = z.object({
  body: z.object({
    name: z.string({ error: "Name is required" }).min(2, { error: "Name is too short" }),
    nameHi: z.string().optional(),
    slug: z
      .string({ error: "Slug is required" })
      .regex(slugRegex, { error: "Slug must be lowercase, alphanumeric, hyphen-separated" }),
    description: z.string().optional(),
    icon: z.string().optional(),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateSubject = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    nameHi: z.string().optional(),
    slug: z.string().regex(slugRegex, { error: "Slug must be lowercase, alphanumeric, hyphen-separated" }).optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const SubjectValidation = { createSubject, updateSubject };