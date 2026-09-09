import { z } from "zod";
import { Difficulty, QuestionType } from "@prisma/client";

const createOptionSchema = z.object({
  text: z.string().min(1, "Option text is required"),
  textHi: z.string().optional(),
  isCorrect: z.boolean(),
  order: z.number().int().min(0).optional(),
});

const createQuestionZodSchema = z.object({
  body: z.object({
    questionText: z.string().min(10, "Question text must be at least 10 characters"),
    questionTextHi: z.string().optional(),
    questionType: z.nativeEnum(QuestionType).optional(),
    difficulty: z.nativeEnum(Difficulty).optional(),
    marks: z.number().positive().optional(),
    negativeMarks: z.number().min(0).optional(),
    explanation: z.string().optional(),
    explanationHi: z.string().optional(),
    isPreviousYear: z.boolean().optional(),
    year: z.number().int().min(1990).max(2030).nullable().optional(),
    examName: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    subjectId: z.string().cuid("Invalid subjectId"),
    categoryId: z.string().cuid().nullable().optional(),
    topicId: z.string().cuid().nullable().optional(),
    options: z.array(createOptionSchema).min(2, "At least 2 options required"),
    tagIds: z.array(z.string().cuid()).optional(),
  }),
});

const updateQuestionZodSchema = z.object({
  body: z.object({
    questionText: z.string().min(10).optional(),
    questionTextHi: z.string().optional(),
    questionType: z.nativeEnum(QuestionType).optional(),
    difficulty: z.nativeEnum(Difficulty).optional(),
    marks: z.number().positive().optional(),
    negativeMarks: z.number().min(0).optional(),
    explanation: z.string().optional(),
    explanationHi: z.string().optional(),
    isPreviousYear: z.boolean().optional(),
    year: z.number().int().min(1990).max(2030).nullable().optional(),
    examName: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    subjectId: z.string().cuid().optional(),
    categoryId: z.string().cuid().nullable().optional(),
    topicId: z.string().cuid().nullable().optional(),
    isActive: z.boolean().optional(),
    options: z.array(createOptionSchema).min(2).optional(),
    tagIds: z.array(z.string().cuid()).optional(),
  }),
});

export const QuestionValidation = {
  createQuestionZodSchema,
  updateQuestionZodSchema,
};