import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { LearnerService } from "./learner.service.js";
import { buildPaginationMeta } from "../../helper/paginationHelper.js";
import pick from "../../helper/pick.js";
import { learnerFilterableFields } from "./learner.constant.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { fileUploader } from "../../helper/fileUploader.js";
import ApiError from "../../errors/api.error.js";
import { LearnerValidation } from "./learner.validation.js";

// ── Type for consumed multipart file ───────────────────────────────────────
export interface UploadedFile {
  fieldname: string;
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

// ── Shared multipart parser (same pattern as student.controller.ts) ────────
const parseMultipart = async (request: FastifyRequest) => {
  const fields: Record<string, any> = {};
  let file: UploadedFile | undefined;

  try {
    const parts = request.parts();

    for await (const part of parts) {
      if (part.type === "file") {
        if (part.fieldname === "file" && !file) {
          const buffer = await part.toBuffer();
          file = {
            fieldname: part.fieldname,
            filename: part.filename || "unknown",
            mimetype: part.mimetype,
            buffer,
          };
        } else {
          // drain any other file parts so the stream doesn't hang
          await part.toBuffer().catch(() => {});
        }
      } else {
        let value = part.value;
        if (typeof value === "string") {
          if (value.trim().startsWith("{") || value.trim().startsWith("[")) {
            try {
              value = JSON.parse(value);
            } catch (_) {
              // leave as raw string if it isn't valid JSON
            }
          }
          // multipart form fields arrive as strings — coerce booleans so
          // things like isActive: "true" validate correctly against zod
          if (value === "true") value = true;
          if (value === "false") value = false;
        }
        fields[part.fieldname] = value;
      }
    }
  } catch (err: any) {
    console.error("Multipart parse error:", err.message);
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to parse form data");
  }

  return { fields, file };
};

// ── Normalize body: multipart OR json, with optional `data` JSON field ─────
const resolveBody = async (request: FastifyRequest) => {
  let body: any;
  let file: UploadedFile | undefined;

  if (request.isMultipart()) {
    const parsed = await parseMultipart(request);
    body = parsed.fields;
    file = parsed.file;

    // Support clients that send the payload as a single stringified `data` field
    if (body.data) {
      if (typeof body.data === "string") {
        try {
          body = JSON.parse(body.data);
        } catch {
          throw new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON format in 'data' field");
        }
      } else if (typeof body.data === "object" && body.data !== null) {
        body = body.data;
      }
    }
  } else {
    body = request.body;
  }

  // The actual fix for "expected object, received undefined": without this
  // guard, a multipart request with no recognizable fields (or a JSON request
  // with an empty/missing body) ends up passing `undefined` into the zod
  // schema's `body` key.
  if (!body || typeof body !== "object") {
    body = {};
  }

  return { body, file };
};

// ── Create Learner ──────────────────────────────────────────────────────────
const createLearner = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { body, file } = await resolveBody(request);

  console.log("✅ Final learner body before validation:", JSON.stringify(body, null, 2));

  // Schemas are shaped as { body: {...} }, so wrap before parsing
  const validated = LearnerValidation.createLearnerZodSchema.parse({ body });

  const uploadedFile = file
    ? await fileUploader.readFileBuffer(file as any)
    : undefined;

  // Service expects the unwrapped payload
  const result = await LearnerService.createLearner(validated.body, uploadedFile);

  sendResponse(reply, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Learner created successfully",
    data: result,
  });
});

// ── Update Learner ──────────────────────────────────────────────────────────
const updateLearner = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const { body, file } = await resolveBody(request);

  const validated = LearnerValidation.updateLearnerZodSchema.parse({ body });

  const uploadedFile = file
    ? await fileUploader.readFileBuffer(file as any)
    : undefined;

  const result = await LearnerService.updateLearner(id, validated.body, uploadedFile);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Learner updated successfully",
    data: result,
  });
});

// ── Other Controllers (unchanged) ──────────────────────────────────────────
const getAllLearners = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const filters = pick(request.query as Record<string, unknown>, learnerFilterableFields);

  const options = pick(request.query as Record<string, unknown>, [
    "page",
    "limit",
    "sortBy",
    "sortOrder",
  ]) as IPaginationOptions;

  const result = await LearnerService.getAllLearners(filters, options);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Learners retrieved successfully",
    meta: buildPaginationMeta(result.meta.total, {
      page: result.meta.page,
      limit: result.meta.limit,
      skip: 0,
      take: result.meta.limit,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    data: result.data,
  });
});

const getSingleLearner = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const result = await LearnerService.getSingleLearner(id);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Learner retrieved successfully",
    data: result,
  });
});

const deleteLearner = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  await LearnerService.deleteLearner(id);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Learner deleted successfully",
    data: null,
  });
});

export const LearnerController = {
  createLearner,
  getAllLearners,
  getSingleLearner,
  updateLearner,
  deleteLearner,
};