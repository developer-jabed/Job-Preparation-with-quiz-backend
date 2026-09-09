import type { FastifyInstance } from "fastify";
import { LearnerController } from "./learner.controller.js";
import { Role } from "@prisma/client";
import auth from "../../middlewares/auth.middleware.js";

export default async function learnerRoutes(fastify: FastifyInstance) {
  // Create Learner (Admin only)
  // NOTE: no `validateRequest` here — this route accepts multipart (avatar
  // upload), and `request.body` is undefined for multipart requests until
  // the controller parses the form parts itself. Validation now happens
  // inside LearnerController.createLearner via LearnerValidation.createLearnerZodSchema.
  fastify.post(
    "/",
    {
      preHandler: [
        // auth(Role.ADMIN),
      ],
    },
    LearnerController.createLearner
  );

  // Get All Learners (Admin only)
  fastify.get(
    "/",
    {
      preHandler: [auth(Role.ADMIN)],
    },
    LearnerController.getAllLearners
  );

  // Get Single Learner
  fastify.get(
    "/:id",
    {
      preHandler: [auth(Role.ADMIN, Role.LEARNER)],
    },
    LearnerController.getSingleLearner
  );

  // Update Learner
  // Same reasoning as create: multipart body, so validation happens inside
  // LearnerController.updateLearner instead of a route-level preHandler.
  fastify.patch(
    "/:id",
    {
      preHandler: [auth(Role.ADMIN, Role.LEARNER)],
    },
    LearnerController.updateLearner
  );

  // Delete Learner (Admin only)
  fastify.delete(
    "/:id",
    {
      preHandler: [auth(Role.ADMIN)],
    },
    LearnerController.deleteLearner
  );
}