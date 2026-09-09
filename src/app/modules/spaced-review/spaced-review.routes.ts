import type { FastifyInstance } from "fastify";
import { SpacedReviewController } from "./spaced-review.controller.js";
import { SpacedReviewValidation } from "./spaced-review.validation.js";
import auth from "../../middlewares/auth.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";

export default async function spacedReviewRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", auth());

  fastify.post(
    "/",
    {
      preHandler: [
        validateRequest(SpacedReviewValidation.addToSpacedReviewZodSchema),
      ],
    },
    SpacedReviewController.addToSpacedReview
  );

  fastify.get(
    "/due",
    SpacedReviewController.getDueReviews
  );

  fastify.post(
    "/:questionId/submit",
    {
      preHandler: [
        validateRequest(SpacedReviewValidation.submitReviewZodSchema),
      ],
    },
    SpacedReviewController.submitReview
  );

  fastify.get(
    "/my",
    SpacedReviewController.getMySpacedReviews
  );
}