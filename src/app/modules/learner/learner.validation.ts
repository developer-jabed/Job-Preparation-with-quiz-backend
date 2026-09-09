import { z } from "zod";

const createLearnerZodSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

const updateLearnerZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional().nullable(),
    avatar: z.string().url().optional().nullable(),
    preferredLanguage: z.enum(["en", "hi"]).optional(),
    isActive: z.boolean().optional(),
  }),
});

const changePasswordZodSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(6),
    newPassword: z.string().min(6),
  }),
});

export const LearnerValidation = {
  createLearnerZodSchema,
  updateLearnerZodSchema,
  changePasswordZodSchema,
};