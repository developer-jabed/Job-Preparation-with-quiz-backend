import { Role } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { SubjectValidation } from "./subject.validation.js";
import { SubjectController } from "./subject.controller.js";
import auth from "../../middlewares/auth.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";


async function subjectRoutes(fastify: FastifyInstance): Promise<void> {
  // Public read — learners browse subjects without needing to be authed
  fastify.get("/", SubjectController.getAllSubjects);
  fastify.get("/:id", SubjectController.getSingleSubject);

  // Admin-only writes
  fastify.post(
    "/",
    {
      preHandler: [auth(Role.ADMIN), validateRequest(SubjectValidation.createSubject)],
    },
    SubjectController.createSubject
  );

  fastify.patch(
    "/:id",
    {
      preHandler: [auth(Role.ADMIN), validateRequest(SubjectValidation.updateSubject)],
    },
    SubjectController.updateSubject
  );

  fastify.delete(
    "/:id",
    { preHandler: [auth(Role.ADMIN)] },
    SubjectController.deleteSubject
  );
}

export default subjectRoutes;