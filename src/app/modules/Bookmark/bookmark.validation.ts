import { z } from "zod";

const createBookmarkZodSchema = z.object({
  body: z.object({
    questionId: z.string().cuid("Invalid questionId"),
  }),
});

export const BookmarkValidation = {
  createBookmarkZodSchema,
};