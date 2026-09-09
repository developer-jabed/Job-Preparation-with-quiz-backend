import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { QuestionReportService } from "./question-report.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";

const createReport = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const userId = (req as any).user.id;
    const result = await QuestionReportService.createReport(
      userId,
      req.body as any
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Report submitted successfully",
      data: result,
    });
  }
);

const getAllReports = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const { status } = req.query as { status?: string };
    const result = await QuestionReportService.getAllReports(status);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Reports retrieved successfully",
      data: result,
    });
  }
);

const getMyReports = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const userId = (req as any).user.id;
    const result = await QuestionReportService.getMyReports(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My reports retrieved successfully",
      data: result,
    });
  }
);

const updateReportStatus = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: any };

    const result = await QuestionReportService.updateReportStatus(id, status);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Report status updated successfully",
      data: result,
    });
  }
);

export const QuestionReportController = {
  createReport,
  getAllReports,
  getMyReports,
  updateReportStatus,
};