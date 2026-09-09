import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { QuestionController } from "./question.controller.js";
import { QuestionValidation } from "./question.validation.js";
import auth from "../../middlewares/auth.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";

export default async function questionRoutes(fastify: FastifyInstance) {
  // ADMIN only
  fastify.post(
    "/",
    {
      preHandler: [
        auth(Role.ADMIN),
        validateRequest(QuestionValidation.createQuestionZodSchema),
      ],
    },
    QuestionController.createQuestion
  );

  fastify.patch(
    "/:id",
    {
      preHandler: [
        auth(Role.ADMIN),
        validateRequest(QuestionValidation.updateQuestionZodSchema),
      ],
    },
    QuestionController.updateQuestion
  );

  fastify.delete(
    "/:id",
    { preHandler: [auth(Role.ADMIN)] },
    QuestionController.softDeleteQuestion
  );

  fastify.patch(
    "/:id/restore",
    { preHandler: [auth(Role.ADMIN)] },
    QuestionController.restoreQuestion
  );

  // Public / Authenticated read
  fastify.get(
    "/",
    { preHandler: [auth()] }, // optional: allow public too
    QuestionController.getAllQuestions
  );

  fastify.get(
    "/:id",
    { preHandler: [auth()] },
    QuestionController.getQuestionById
  );
}