import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { BookmarkService } from "./bookmark.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";

const addBookmark = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const result = await BookmarkService.addBookmark(userId, req.body as any);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Question bookmarked successfully",
    data: result,
  });
});

const removeBookmark = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const { questionId } = req.params as { questionId: string };

  const result = await BookmarkService.removeBookmark(userId, questionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getMyBookmarks = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const result = await BookmarkService.getMyBookmarks(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Bookmarks retrieved successfully",
    data: result,
  });
});

const checkIsBookmarked = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const { questionId } = req.params as { questionId: string };

  const result = await BookmarkService.isBookmarked(userId, questionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Bookmark status retrieved successfully",
    data: result,
  });
});

export const BookmarkController = {
  addBookmark,
  removeBookmark,
  getMyBookmarks,
  checkIsBookmarked,
};