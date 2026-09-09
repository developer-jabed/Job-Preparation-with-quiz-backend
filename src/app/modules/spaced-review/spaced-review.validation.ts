import { z } from "zod";

const addToSpacedReviewZodSchema = z.object({
  body: z.object({
    questionId: z.string().cuid("Invalid questionId"),
  }),
});

const submitReviewZodSchema = z.object({
  body: z.object({
    quality: z
      .number()
      .int("Quality must be an integer")
      .min(0, "Quality cannot be less than 0")
      .max(5, "Quality cannot be greater than 5"),
  }),
});

export const SpacedReviewValidation = {
  addToSpacedReviewZodSchema,
  submitReviewZodSchema,
};