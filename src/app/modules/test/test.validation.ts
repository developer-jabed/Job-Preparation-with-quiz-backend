import { z } from "zod";
import { TestType } from "@prisma/client";

const createTestZodSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    titleHi: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    testType: z.nativeEnum(TestType).optional(),
    durationMinutes: z.number().int().positive(),
    passingMarks: z.number().min(0).optional(),
    isFree: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    instructions: z.string().optional(),
    subjectId: z.string().cuid().nullable().optional(),
    categoryId: z.string().cuid().nullable().optional(),
    questionIds: z.array(z.string().cuid()).min(1, "At least one question required"),
  }),
});

const updateTestZodSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    titleHi: z.string().optional(),
    description: z.string().optional(),
    testType: z.nativeEnum(TestType).optional(),
    durationMinutes: z.number().int().positive().optional(),
    passingMarks: z.number().min(0).optional(),
    isFree: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    instructions: z.string().optional(),
    subjectId: z.string().cuid().nullable().optional(),
    categoryId: z.string().cuid().nullable().optional(),
    questionIds: z.array(z.string().cuid()).min(1).optional(),
  }),
});

export const TestValidation = {
  createTestZodSchema,
  updateTestZodSchema,
};