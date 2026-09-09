import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { TagController } from "./tag.controller.js";
import { TagValidation } from "./tag.validation.js";
import auth from "../../middlewares/auth.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";

export default async function tagRoutes(fastify: FastifyInstance) {
  // Public
  fastify.get("/", TagController.getAllTags);
  fastify.get("/:id", TagController.getTagById);

  // Admin only
  fastify.post(
    "/",
    {
      preHandler: [
        auth(Role.ADMIN),
        validateRequest(TagValidation.createTagZodSchema),
      ],
    },
    TagController.createTag
  );

  fastify.patch(
    "/:id",
    {
      preHandler: [
        auth(Role.ADMIN),
        validateRequest(TagValidation.updateTagZodSchema),
      ],
    },
    TagController.updateTag
  );

  fastify.delete(
    "/:id",
    { preHandler: [auth(Role.ADMIN)] },
    TagController.deleteTag
  );
}