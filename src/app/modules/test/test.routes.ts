import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { TestController } from "./test.controller.js";
import { TestValidation } from "./test.validation.js";
import auth from "../../middlewares/auth.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";

export default async function testRoutes(fastify: FastifyInstance) {
  // ─────────────── ADMIN ONLY ───────────────
  fastify.post(
    "/",
    {
      preHandler: [
        auth(Role.ADMIN),
        validateRequest(TestValidation.createTestZodSchema),
      ],
    },
    TestController.createTest
  );

  fastify.patch(
    "/:id",
    {
      preHandler: [
        auth(Role.ADMIN),
        validateRequest(TestValidation.updateTestZodSchema),
      ],
    },
    TestController.updateTest
  );

  fastify.delete(
    "/:id",
    {
      preHandler: [auth(Role.ADMIN)],
    },
    TestController.deleteTest
  );

  // ─────────────── PUBLIC / AUTHENTICATED ───────────────
  fastify.get(
    "/",
    {
      preHandler: [auth()], // optional: remove auth() if you want fully public
    },
    TestController.getAllTests
  );

  fastify.get(
    "/:idOrSlug",
    {
      preHandler: [auth()], // optional
    },
    TestController.getTestByIdOrSlug
  );
}