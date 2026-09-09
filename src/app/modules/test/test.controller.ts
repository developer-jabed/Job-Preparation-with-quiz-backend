import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { TestService } from "./test.service.js";
import { testFilterableFields } from "./test.constant.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import pick from "../../helper/pick.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { buildPaginationMeta, type PaginationResult } from "../../helper/paginationHelper.js";

const createTest = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const result = await TestService.createTest(req.body as any);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Test created successfully",
    data: result,
  });
});

const getAllTests = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const filters = pick(req.query as Record<string, unknown>, testFilterableFields);
  const options = pick(req.query as Record<string, unknown>, [
    "page",
    "limit",
    "sortBy",
    "sortOrder",
  ]) as IPaginationOptions;

  const result = await TestService.getAllTests(filters as any, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tests retrieved successfully",
    meta: buildPaginationMeta(result.meta.total, {
      page: result.meta.page,
      limit: result.meta.limit,
      skip: 0,
      take: result.meta.limit,
      sortBy: "createdAt",
      sortOrder: "desc",
    } as PaginationResult),
    data: result.data,
  });
});

const getTestByIdOrSlug = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const { idOrSlug } = req.params as { idOrSlug: string };
  const hideAnswers = (req as any).user?.role !== "ADMIN"; // hide correct answers for learners

  const result = await TestService.getTestByIdOrSlug(idOrSlug, hideAnswers);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Test retrieved successfully",
    data: result,
  });
});

const updateTest = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = req.params as { id: string };
  const result = await TestService.updateTest(id, req.body as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Test updated successfully",
    data: result,
  });
});

const deleteTest = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = req.params as { id: string };
  const result = await TestService.deleteTest(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Test deleted successfully",
    data: result,
  });
});

export const TestController = {
  createTest,
  getAllTests,
  getTestByIdOrSlug,
  updateTest,
  deleteTest,
};