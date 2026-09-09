import type { FastifyInstance } from "fastify";
import { AnalyticsController } from "./analytics.controller.js";
import auth from "../../middlewares/auth.middleware.js";

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // Public leaderboard
  fastify.get("/leaderboard", AnalyticsController.getLeaderboard);

  // Authenticated
  fastify.get(
    "/weak-topics",
    { preHandler: [auth()] },
    AnalyticsController.getWeakTopics
  );

  fastify.get(
    "/my-performance",
    { preHandler: [auth()] },
    AnalyticsController.getMyPerformance
  );
}

