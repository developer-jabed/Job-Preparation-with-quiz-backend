import type { FastifyInstance } from "fastify";
import { TestAttemptController } from "./test-attempt.controller.js";
import auth from "../../middlewares/auth.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { z } from "zod";

const startAttemptSchema = z.object({
  body: z.object({
    testId: z.string().cuid("Invalid testId"),
  }),
});

const saveAnswerSchema = z.object({
  body: z.object({
    questionId: z.string().cuid("Invalid questionId"),
    selectedOptions: z.array(z.string().cuid()).min(0),
    timeSpentSeconds: z.number().int().min(0).optional(),
  }),
});

export default async function testAttemptRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook("preHandler", auth());

  // Start a new attempt (or resume existing)
  fastify.post(
    "/start",
    {
      preHandler: [validateRequest(startAttemptSchema)],
    },
    TestAttemptController.startAttempt
  );

  // Save / update answer in real-time
  fastify.patch(
    "/:attemptId/answer",
    {
      preHandler: [validateRequest(saveAnswerSchema)],
    },
    TestAttemptController.saveAnswer
  );

  // Submit the attempt
  fastify.post(
    "/:attemptId/submit",
    TestAttemptController.submitAttempt
  );

  // Get all my attempts
  fastify.get(
    "/my",
    TestAttemptController.getMyAttempts
  );

  // ADMIN: list/search/filter/paginate all attempts across users
  // Adjust auth("ADMIN") to match your actual role enum/signature.
  fastify.get(
    "/",
    {
      preHandler: [auth("ADMIN")],
    },
    TestAttemptController.getAllTestAttempts
  );

  // Get detailed result (COMPLETED / TIMED_OUT only)
  // Keep this BEFORE generic /:attemptId
  fastify.get(
    "/:attemptId/result",
    TestAttemptController.getAttemptResult
  );

  // Get single attempt (IN_PROGRESS included) — for taking the test
  fastify.get(
    "/:attemptId",
    TestAttemptController.getAttemptById
  );
}