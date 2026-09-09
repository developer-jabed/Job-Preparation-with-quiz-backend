import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { PdfUploadController } from "./pdf-upload.controller.js";
import auth from "../../middlewares/auth.middleware.js";

export default async function pdfUploadRoutes(fastify: FastifyInstance) {
  // Upload PDF (Admin or Learner)
  fastify.post(
    "/upload",
    {
      preHandler: [auth()],
    },
    PdfUploadController.uploadPdf
  );

  fastify.post(
  "/:id/extract-ai",
  { preHandler: [auth()] },
  PdfUploadController.startAIExtraction
);

  // Get all my uploads / all uploads (admin)
  fastify.get(
    "/",
    {
      preHandler: [auth()],
    },
    PdfUploadController.getAllPdfUploads
  );

  // Get single PDF
  fastify.get(
    "/:id",
    {
      preHandler: [auth()],
    },
    PdfUploadController.getPdfById
  );

  // Delete PDF
  fastify.delete(
    "/:id",
    {
      preHandler: [auth()],
    },
    PdfUploadController.deletePdf
  );
}