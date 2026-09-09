import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { AnalyticsService } from "./analytics.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";

const getLeaderboard = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const limit = Number((req.query as any).limit) || 20;
  const result = await AnalyticsService.getLeaderboard(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Leaderboard retrieved successfully",
    data: result,
  });
});

const getWeakTopics = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const result = await AnalyticsService.getWeakTopics(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Weak topics retrieved successfully",
    data: result,
  });
});

const getMyPerformance = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const result = await AnalyticsService.getMyPerformance(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Performance summary retrieved",
    data: result,
  });
});

export const AnalyticsController = {
  getLeaderboard,
  getWeakTopics,
  getMyPerformance,
};