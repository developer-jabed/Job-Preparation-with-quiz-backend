import type { FastifyInstance } from "fastify";
import auth from "../../middlewares/auth.middleware.js";
import { MasterySetupController } from "./mastery.controller.js";

export default async function masterySetupRoutes(fastify: FastifyInstance) {
  // ── Setup ──────────────────────────────────────
  fastify.post(
    "/setup/defaults",
    { preHandler: [auth()] },
    MasterySetupController.ensureDefaults
  );

  fastify.get(
    "/setup/status",
    { preHandler: [auth()] },
    MasterySetupController.getSetupStatus
  );

  // ── Taxonomy maps (optional) ───────────────────
  fastify.get(
    "/taxonomy-maps",
    { preHandler: [auth()] },
    MasterySetupController.listTaxonomyMaps
  );

  fastify.post(
    "/taxonomy-maps",
    { preHandler: [auth()] },
    MasterySetupController.createTaxonomyMap
  );

  fastify.patch(
    "/taxonomy-maps/:key/link",
    { preHandler: [auth()] },
    MasterySetupController.linkTaxonomyMap
  );

  fastify.patch(
    "/taxonomy-maps/:key/unlink",
    { preHandler: [auth()] },
    MasterySetupController.unlinkTaxonomyMap
  );

  // ── Templates ──────────────────────────────────
  fastify.get(
    "/templates",
    { preHandler: [auth()] },
    MasterySetupController.listTemplates
  );

  // static path before :id to avoid conflict if needed
  fastify.get(
    "/templates/by-slug/:slug",
    { preHandler: [auth()] },
    MasterySetupController.getTemplateBySlug
  );

  fastify.get(
    "/templates/:id",
    { preHandler: [auth()] },
    MasterySetupController.getTemplateById
  );

  fastify.post(
    "/templates",
    { preHandler: [auth()] },
    MasterySetupController.createTemplate
  );

  fastify.patch(
    "/templates/:id",
    { preHandler: [auth()] },
    MasterySetupController.updateTemplate
  );

  fastify.delete(
    "/templates/:id",
    { preHandler: [auth()] },
    MasterySetupController.archiveTemplate
  );

  fastify.post(
    "/templates/:slug/generate",
    { preHandler: [auth()] },
    MasterySetupController.generateFromTemplate
  );
}