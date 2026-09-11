import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { TestAttemptService } from "./test-attempt.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";

const startAttempt = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const result = await TestAttemptService.startAttempt(req.body as any, userId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Attempt started successfully",
    data: result,
  });
});

const saveAnswer = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const { attemptId } = req.params as { attemptId: string };

  const result = await TestAttemptService.saveAnswer(
    attemptId,
    userId,
    req.body as any
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Answer saved successfully",
    data: result,
  });
});

const submitAttempt = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const { attemptId } = req.params as { attemptId: string };

  const result = await TestAttemptService.submitAttempt(attemptId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attempt submitted successfully",
    data: result,
  });
});

const getMyAttempts = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const result = await TestAttemptService.getMyAttempts(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My attempts retrieved successfully",
    data: result,
  });
});

const getAttemptById = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const { attemptId } = req.params as { attemptId: string };

  const result = await TestAttemptService.getAttemptById(attemptId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attempt retrieved successfully",
    data: result,
  });
});

const getAttemptResult = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const { attemptId } = req.params as { attemptId: string };

  const result = await TestAttemptService.getAttemptResult(attemptId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attempt result retrieved successfully",
    data: result,
  });
});

// ======================
// ADMIN: list all attempts
// ======================
const getAllTestAttempts = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const query = req.query as {
    page?: string;
    limit?: string;
    searchTerm?: string;
    testId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };

  const result = await TestAttemptService.getAllTestAttempts({
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    searchTerm: query.searchTerm,
    testId: query.testId,
    status: query.status,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Test attempts retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const TestAttemptController = {
  startAttempt,
  saveAnswer,
  submitAttempt,
  getMyAttempts,
  getAttemptById,
  getAttemptResult,
  getAllTestAttempts,
};