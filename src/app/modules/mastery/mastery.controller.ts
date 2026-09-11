import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { MasterySetupService } from "./mastery.service.js";
import { TemplateEntityType, TemplateStatus, TestType } from "@prisma/client";
import ApiError from "../../errors/api.error.js";

// ── Setup ────────────────────────────────────────

const ensureDefaults = catchAsync(
  async (_req: FastifyRequest, reply: FastifyReply) => {
    const data = await MasterySetupService.ensureDefaults();

    sendResponse(reply, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Mastery defaults initialized successfully",
      data,
    });
  }
);

const getSetupStatus = catchAsync(
  async (_req: FastifyRequest, reply: FastifyReply) => {
    const data = await MasterySetupService.getSetupStatus();

    sendResponse(reply, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Mastery setup status fetched",
      data,
    });
  }
);

// ── Taxonomy maps (optional) ─────────────────────

const listTaxonomyMaps = catchAsync(
  async (_req: FastifyRequest, reply: FastifyReply) => {
    const data = await MasterySetupService.listTaxonomyMaps();

    sendResponse(reply, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Taxonomy maps fetched",
      data,
    });
  }
);

const linkTaxonomyMap = catchAsync(
  async (req: FastifyRequest, reply: FastifyReply) => {
    const { key } = req.params as { key: string };
    const body = req.body as {
      entityId: string;
      entityType?: TemplateEntityType;
    };

    const data = await MasterySetupService.linkTaxonomyMap(key, body);

    sendResponse(reply, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Taxonomy map linked successfully",
      data,
    });
  }
);

const unlinkTaxonomyMap = catchAsync(
  async (req: FastifyRequest, reply: FastifyReply) => {
    const { key } = req.params as { key: string };
    const data = await MasterySetupService.unlinkTaxonomyMap(key);

    sendResponse(reply, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Taxonomy map unlinked",
      data,
    });
  }
);

const createTaxonomyMap = catchAsync(
  async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as {
      key: string;
      label: string;
      labelHi?: string;
      entityType: TemplateEntityType;
      entityId?: string;
      defaultWeight?: number;
    };

    const data = await MasterySetupService.createTaxonomyMap(body);

    sendResponse(reply, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Taxonomy map created",
      data,
    });
  }
);

// ── Templates ────────────────────────────────────

const listTemplates = catchAsync(
  async (req: FastifyRequest, reply: FastifyReply) => {
    const { active } = req.query as { active?: string };
    const data = await MasterySetupService.listTemplates(active === "true");

    sendResponse(reply, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Templates fetched",
      data,
    });
  }
);

const getTemplateBySlug = catchAsync(
  async (req: FastifyRequest, reply: FastifyReply) => {
    const { slug } = req.params as { slug: string };
    const data = await MasterySetupService.getTemplateBySlug(slug);

    sendResponse(reply, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Template fetched",
      data,
    });
  }
);

const getTemplateById = catchAsync(
  async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const data = await MasterySetupService.getTemplateById(id);

    sendResponse(reply, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Template fetched",
      data,
    });
  }
);

const createTemplate = catchAsync(
  async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as {
      name: string;
      nameHi?: string;
      slug: string;
      description?: string;
      testType?: TestType;
      durationMinutes: number;
      isFree?: boolean;
      examTag?: string;
      isFeatured?: boolean;
      order?: number;
      status?: TemplateStatus;
      sections: {
        subjectId: string;
        subjectName?: string;
        count: number;
        difficulty?: { EASY?: number; MEDIUM?: number; HARD?: number };
        categoryIds?: string[];
        topicIds?: string[];
        questionTypes?: string[];
      }[];
      selectionMode?: "SMART" | "RANDOM" | "NEVER_SEEN_ONLY" | "WRONG_ONLY";
      policyName?: string;
      allowPartial?: boolean;
      minQuestionsRatio?: number;
    };

    const data = await MasterySetupService.createTemplate(body);

    sendResponse(reply, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Template created successfully",
      data,
    });
  }
);

const updateTemplate = catchAsync(
  async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;

    const data = await MasterySetupService.updateTemplate(id, body as any);

    sendResponse(reply, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Template updated successfully",
      data,
    });
  }
);

const archiveTemplate = catchAsync(
  async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const data = await MasterySetupService.archiveTemplate(id);

    sendResponse(reply, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Template archived",
      data,
    });
  }
);

const generateFromTemplate = catchAsync(
  async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user; // from auth middleware
    if (!user?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const { slug } = req.params as { slug: string };
    const data = await MasterySetupService.generateFromTemplate(user.id, slug);

    sendResponse(reply, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Test generated successfully",
      data,
    });
  }
);


export const MasterySetupController = {
  ensureDefaults,
  getSetupStatus,
  listTaxonomyMaps,
  linkTaxonomyMap,
  generateFromTemplate,
  unlinkTaxonomyMap,
  createTaxonomyMap,
  listTemplates,
  getTemplateBySlug,
  getTemplateById,
  createTemplate,
  updateTemplate,
  archiveTemplate,
};