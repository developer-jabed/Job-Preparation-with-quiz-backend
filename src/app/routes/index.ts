import type { FastifyInstance } from "fastify";

// Existing
import learnerRoutes from "../modules/learner/learner.route.js";
import authRoutes from "../modules/auth/auth.route.js";
import topicRoutes from "../modules/topic/topic.route.js";
import subjectRoutes from "../modules/subject/subject.route.js";
import testRoutes from "../modules/test/test.routes.js";
import testAttemptRoutes from "../modules/test-attempt/test-attempt.routes.js";
import spacedReviewRoutes from "../modules/spaced-review/spaced-review.routes.js";
import questionReportRoutes from "../modules/question-report/question-report.routes.js";
import questionRoutes from "../modules/question/question.route.js";
import bookmarkRoutes from "../modules/Bookmark/bookmark.routes.js";
import pdfUploadRoutes from "../modules/pdf-upload/pdf-upload.routes.js";
import tagRoutes from "../modules/tag/tag.routes.js";
import categoryRoutes from "../modules/category/category.route.js";
import analyticsRoutes from "../modules/analytics/analytics.routes.js";
import extractedQuestionRoutes from "../modules/extracted-question/extracted-question.routes.js";
import dashboardRoutes from "../modules/dashboard/dashboard.route.js";

async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Health Check
  fastify.get("/health", async () => ({
    success: true,
    status: "OK",
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  }));

  // ─────────────── Auth ───────────────
  fastify.register(authRoutes, {
    prefix: "/auth",
  });

  // ─────────────── Learner ───────────────
  fastify.register(learnerRoutes, {
    prefix: "/learners",
  });

  // ─────────────── Taxonomy ───────────────
  fastify.register(subjectRoutes, {
    prefix: "/subjects",
  });

  fastify.register(categoryRoutes, {
    prefix: "/categories",
  });

  fastify.register(topicRoutes, {
    prefix: "/topics",
  });

  // ─────────────── Core Content ───────────────
  fastify.register(questionRoutes, {
    prefix: "/questions",
  });

  fastify.register(testRoutes, {
    prefix: "/tests",
  });

  // ─────────────── Attempts ───────────────
  fastify.register(testAttemptRoutes, {
    prefix: "/attempts",
  });

  // ─────────────── Engagement ───────────────
  fastify.register(bookmarkRoutes, {
    prefix: "/bookmarks",
  });

  fastify.register(spacedReviewRoutes, {
    prefix: "/spaced-reviews",
  });

  // ─────────────── Moderation ───────────────
  fastify.register(questionReportRoutes, {
    prefix: "/reports",
  });

  fastify.register(pdfUploadRoutes, {
    prefix: "/pdf-uploads",
  });

  fastify.register(tagRoutes, {
    prefix: "/tags",
  });

  fastify.register(analyticsRoutes, {
    prefix: "/analytics",
  });


  fastify.register(extractedQuestionRoutes, {
    prefix: "/extracted-questions",
  });


  fastify.register(dashboardRoutes, {
    prefix: "/dashboard",
  });


}

export default registerRoutes;