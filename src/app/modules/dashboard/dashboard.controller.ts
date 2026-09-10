import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { DashboardService } from "./dashboard.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";

const getAdminDashboard = catchAsync(
  async (_req: FastifyRequest, res: FastifyReply) => {
    const result = await DashboardService.getAdminDashboard();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin dashboard retrieved successfully",
      data: result,
    });
  }
);

const getLearnerDashboard = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const userId = (req as any).user.id;
    const result = await DashboardService.getLearnerDashboard(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Learner dashboard retrieved successfully",
      data: result,
    });
  }
);

const getAdminCharts = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const days = Number((req.query as any)?.days) || 14;
    const result = await DashboardService.getAdminCharts(
      Math.min(Math.max(days, 7), 90)
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin charts retrieved successfully",
      data: result,
    });
  }
);

const getLearnerCharts = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const userId = (req as any).user.id;
    const days = Number((req.query as any)?.days) || 14;
    const result = await DashboardService.getLearnerCharts(
      userId,
      Math.min(Math.max(days, 7), 90)
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Learner charts retrieved successfully",
      data: result,
    });
  }
);

export const DashboardController = {
  getAdminDashboard,
  getLearnerDashboard,
  getAdminCharts,
  getLearnerCharts,
};