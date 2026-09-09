import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { SpacedReviewService } from "./spaced-review.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";

const addToSpacedReview = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const userId = (req as any).user.id;
    const { questionId } = req.body as { questionId: string };

    const result = await SpacedReviewService.addToSpacedReview(
      userId,
      questionId
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Question added to spaced review successfully",
      data: result,
    });
  }
);

const getDueReviews = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const userId = (req as any).user.id;
    const result = await SpacedReviewService.getDueReviews(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Due reviews retrieved successfully",
      data: result,
    });
  }
);

const submitReview = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const userId = (req as any).user.id;
    const { questionId } = req.params as { questionId: string };
    const { quality } = req.body as { quality: number };

    const result = await SpacedReviewService.submitReview(
      userId,
      questionId,
      quality
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Review submitted successfully",
      data: result,
    });
  }
);

const getMySpacedReviews = catchAsync(
  async (req: FastifyRequest, res: FastifyReply) => {
    const userId = (req as any).user.id;
    const result = await SpacedReviewService.getMySpacedReviews(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Spaced reviews retrieved successfully",
      data: result,
    });
  }
);

export const SpacedReviewController = {
  addToSpacedReview,
  getDueReviews,
  submitReview,
  getMySpacedReviews,
};