import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { QuestionReportController } from "./question-report.controller.js";
import { QuestionReportValidation } from "./question-report.validation.js";
import auth from "../../middlewares/auth.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";

export default async function questionReportRoutes(fastify: FastifyInstance) {
  // ─────────────── LEARNER ───────────────
  fastify.post(
    "/",
    {
      preHandler: [
        auth(),
        validateRequest(QuestionReportValidation.createReportZodSchema),
      ],
    },
    QuestionReportController.createReport
  );

  fastify.get(
    "/my",
    {
      preHandler: [auth()],
    },
    QuestionReportController.getMyReports
  );

  // ─────────────── ADMIN ONLY ───────────────
  fastify.get(
    "/",
    {
      preHandler: [auth(Role.ADMIN)],
    },
    QuestionReportController.getAllReports
  );

  fastify.patch(
    "/:id/status",
    {
      preHandler: [
        auth(Role.ADMIN),
        validateRequest(QuestionReportValidation.updateStatusZodSchema),
      ],
    },
    QuestionReportController.updateReportStatus
  );
}