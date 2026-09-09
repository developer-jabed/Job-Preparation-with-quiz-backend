import type { FastifyInstance } from "fastify";
import { BookmarkController } from "./bookmark.controller.js";
import { BookmarkValidation } from "./bookmark.validation.js";
import auth from "../../middlewares/auth.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";

export default async function bookmarkRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook("preHandler", auth());

  fastify.post(
    "/",
    {
      preHandler: [validateRequest(BookmarkValidation.createBookmarkZodSchema)],
    },
    BookmarkController.addBookmark
  );

  fastify.delete(
    "/:questionId",
    BookmarkController.removeBookmark
  );

  fastify.get(
    "/my",
    BookmarkController.getMyBookmarks
  );

  fastify.get(
    "/check/:questionId",
    BookmarkController.checkIsBookmarked
  );
}