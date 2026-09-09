import { Role } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { TopicValidation } from "./topic.validation.js";
import { TopicController } from "./topic.controller.js";

import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.middleware.js";
async function topicRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/", TopicController.getAllTopics);
  fastify.get("/:id", TopicController.getSingleTopic);

  fastify.post(
    "/",
    {
      preHandler: [auth(Role.ADMIN), validateRequest(TopicValidation.createTopic)],
    },
    TopicController.createTopic
  );

  fastify.patch(
    "/:id",
    {
      preHandler: [auth(Role.ADMIN), validateRequest(TopicValidation.updateTopic)],
    },
    TopicController.updateTopic
  );

  fastify.delete(
    "/:id",
    { preHandler: [auth(Role.ADMIN)] },
    TopicController.deleteTopic
  );
}

export default topicRoutes;