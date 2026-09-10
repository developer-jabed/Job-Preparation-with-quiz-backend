import type { FastifyInstance } from "fastify";
import { ExtractedQuestionController } from "./extracted-question.controller.js";
import auth from "../../middlewares/auth.middleware.js";

export default async function extractedQuestionRoutes(
  fastify: FastifyInstance
) {
  // GET single extracted question
  fastify.get(
    "/:id",
    {
      preHandler: [auth()],
    },
    ExtractedQuestionController.getById
  );

  // GET all extracted questions for a PDF
  fastify.get(
    "/by-pdf/:pdfUploadId",
    {
      preHandler: [auth()],
    },
    ExtractedQuestionController.getAllByPdfUpload
  );

  // PATCH status
  // Body: { status: "PENDING" | "NEEDS_EDIT" | "APPROVED" | "REJECTED", reviewNote?: string }
  fastify.patch(
    "/:id",
    {
      preHandler: [auth()],
    },
    ExtractedQuestionController.updateStatus
  );

  // POST approve + create real question in bank
  // Body (optional): { subjectId?, categoryId?, topicId?, tagIds? }
  fastify.post(
    "/:id/approve",
    {
      preHandler: [auth()],
    },
    ExtractedQuestionController.approveAndCreate
  );
}