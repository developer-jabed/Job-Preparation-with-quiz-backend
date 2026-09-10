import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { DashboardController } from "./dashboard.controller.js";
import auth from "../../middlewares/auth.middleware.js";

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // Admin overview
  fastify.get(
    "/admin",
    {
      preHandler: [auth(Role.ADMIN)],
    },
    DashboardController.getAdminDashboard
  );

  // Admin charts
  fastify.get(
    "/admin/charts",
    {
      preHandler: [auth(Role.ADMIN)],
    },
    DashboardController.getAdminCharts
  );

  // Learner overview
  fastify.get(
    "/learner",
    {
      preHandler: [auth(Role.LEARNER, Role.ADMIN)],
    },
    DashboardController.getLearnerDashboard
  );

  // Learner charts
  fastify.get(
    "/learner/charts",
    {
      preHandler: [auth(Role.LEARNER, Role.ADMIN)],
    },
    DashboardController.getLearnerCharts
  );
}