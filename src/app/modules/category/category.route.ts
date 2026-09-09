import { Role } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { CategoryValidation } from "./category.validation.js";
import { CategoryController } from "./category.controller.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.middleware.js";


async function categoryRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/", CategoryController.getAllCategories);
  fastify.get("/:id", CategoryController.getSingleCategory);

  fastify.post(
    "/",
    {
      preHandler: [auth(Role.ADMIN), validateRequest(CategoryValidation.createCategory)],
    },
    CategoryController.createCategory
  );

  fastify.patch(
    "/:id",
    {
      preHandler: [auth(Role.ADMIN), validateRequest(CategoryValidation.updateCategory)],
    },
    CategoryController.updateCategory
  );

  fastify.delete(
    "/:id",
    { preHandler: [auth(Role.ADMIN)] },
    CategoryController.deleteCategory
  );
}

export default categoryRoutes;