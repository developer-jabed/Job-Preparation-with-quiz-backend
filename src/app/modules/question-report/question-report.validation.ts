import { z } from "zod";

const createReportZodSchema = z.object({
  body: z.object({
    questionId: z.string().cuid("Invalid questionId"),
    reason: z
      .string()
      .min(3, "Reason must be at least 3 characters")
      .max(100, "Reason cannot exceed 100 characters"),
    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
  }),
});

const updateStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED", "NEEDS_EDIT"], {
      message: "Status must be APPROVED, REJECTED or NEEDS_EDIT",
    }),
  }),
});

export const QuestionReportValidation = {
  createReportZodSchema,
  updateStatusZodSchema,
};