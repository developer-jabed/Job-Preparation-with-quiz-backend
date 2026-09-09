import { z } from "zod";

const createTagZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
  }),
});

const updateTagZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
  }),
});

export const TagValidation = {
  createTagZodSchema,
  updateTagZodSchema,
};