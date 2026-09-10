import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { ExtractedQuestionService } from "./extracted-question.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ReviewStatus } from "@prisma/client";

const updateStatus = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const user = (req as any).user;
    const { id } = req.params as { id: string };
    const isAdmin = user.role === "ADMIN";
    const body = req.body as {
      status: ReviewStatus;
      reviewNote?: string;
    };

    if (!body?.status) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "status is required",
      });
    }

    const result = await ExtractedQuestionService.updateStatus(
      id,
      body,
      user.id,
      isAdmin
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        body.status === "APPROVED"
          ? "Question approved!"
          : body.status === "REJECTED"
          ? "Question rejected"
          : body.status === "NEEDS_EDIT"
          ? "Marked as Needs Edit"
          : "Status updated",
      data: result,
    });
  }
);

const approveAndCreate = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const user = (req as any).user;
    const { id } = req.params as { id: string };
    const isAdmin = user.role === "ADMIN";
    const body = (req.body || {}) as {
      subjectId?: string;
      categoryId?: string | null;
      topicId?: string | null;
      tagIds?: string[];
    };

    const result = await ExtractedQuestionService.approveAndCreate(
      id,
      body,
      user.id,
      isAdmin
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message,
      data: result.data,
    });
  }
);

const getById = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const user = (req as any).user;
    const { id } = req.params as { id: string };
    const isAdmin = user.role === "ADMIN";

    const result = await ExtractedQuestionService.getById(
      id,
      user.id,
      isAdmin
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Extracted question retrieved successfully",
      data: result,
    });
  }
);

const getAllByPdfUpload = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const user = (req as any).user;
    const { pdfUploadId } = req.params as { pdfUploadId: string };
    const isAdmin = user.role === "ADMIN";

    const result = await ExtractedQuestionService.getAllByPdfUpload(
      pdfUploadId,
      user.id,
      isAdmin
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Extracted questions retrieved successfully",
      data: result,
    });
  }
);

export const ExtractedQuestionController = {
  updateStatus,
  approveAndCreate,
  getById,
  getAllByPdfUpload,
};