import httpStatus from "http-status";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import { redis } from "../../shared/redis.js";
import type { ICreateBookmark } from "./bookmark.interface.js";

const CACHE_TTL = 60 * 5; // 5 minutes

const addBookmark = async (userId: string, payload: ICreateBookmark) => {
  const question = await prisma.question.findFirst({
    where: {
      id: payload.questionId,
      deletedAt: null,
      isActive: true,
    },
  });

  if (!question) {
    throw new ApiError(httpStatus.NOT_FOUND, "Question not found or inactive");
  }

  const existing = await prisma.bookmark.findUnique({
    where: {
      userId_questionId: {
        userId,
        questionId: payload.questionId,
      },
    },
  });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, "Question is already bookmarked");
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      questionId: payload.questionId,
    },
    include: {
      question: {
        select: {
          id: true,
          questionText: true,
          difficulty: true,
          questionType: true,
          subject: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true } },
          topic: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Invalidate user bookmarks cache
  await redis.del(`bookmarks:${userId}`);

  return bookmark;
};

const removeBookmark = async (userId: string, questionId: string) => {
  const bookmark = await prisma.bookmark.findUnique({
    where: {
      userId_questionId: {
        userId,
        questionId,
      },
    },
  });

  if (!bookmark) {
    throw new ApiError(httpStatus.NOT_FOUND, "Bookmark not found");
  }

  await prisma.bookmark.delete({
    where: { id: bookmark.id },
  });

  await redis.del(`bookmarks:${userId}`);

  return { message: "Bookmark removed successfully" };
};

const getMyBookmarks = async (userId: string) => {
  const cacheKey = `bookmarks:${userId}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      question: {
        select: {
          id: true,
          questionText: true,
          difficulty: true,
          questionType: true,
          subject: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true } },
          topic: { select: { id: true, name: true } },
        },
      },
    },
  });

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(bookmarks));

  return bookmarks;
};

const isBookmarked = async (userId: string, questionId: string) => {
  const count = await prisma.bookmark.count({
    where: {
      userId,
      questionId,
    },
  });

  return { isBookmarked: count > 0 };
};

export const BookmarkService = {
  addBookmark,
  removeBookmark,
  getMyBookmarks,
  isBookmarked,
};