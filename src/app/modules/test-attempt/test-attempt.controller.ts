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

export const TestAttemptController = {
  startAttempt,
  saveAnswer,
  submitAttempt,
  getMyAttempts,
  getAttemptResult,
};