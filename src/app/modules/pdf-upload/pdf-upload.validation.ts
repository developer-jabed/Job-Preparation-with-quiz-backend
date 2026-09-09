import { z } from "zod";
import { PdfStatus } from "@prisma/client";

const createPdfUploadZodSchema = z.object({
  body: z.object({
    subjectId: z.string().cuid().optional(),
    examName: z.string().max(100).optional(),
    year: z.number().int().min(1990).max(2030).optional(),
  }),
});

const updateStatusZodSchema = z.object({
  body: z.object({
    status: z.nativeEnum(PdfStatus),
    errorMessage: z.string().optional(),
  }),
});

export const PdfUploadValidation = {
  createPdfUploadZodSchema,
  updateStatusZodSchema,
};