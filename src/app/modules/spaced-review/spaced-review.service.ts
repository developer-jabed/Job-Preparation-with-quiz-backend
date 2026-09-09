import httpStatus from "http-status";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import { redis } from "../../shared/redis.js";

const DUE_CACHE_TTL = 60 * 2; // 2 minutes

const addToSpacedReview = async (userId: string, questionId: string) => {
  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      deletedAt: null,
      isActive: true,
    },
  });

  if (!question) {
    throw new ApiError(httpStatus.NOT_FOUND, "Question not found or inactive");
  }

  const existing = await prisma.spacedReview.findUnique({
    where: {
      userId_questionId: {
        userId,
        questionId,
      },
    },
  });

  if (existing) {
    return existing; // already added – return existing
  }

  const review = await prisma.spacedReview.create({
    data: {
      userId,
      questionId,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    },
  });

  // Invalidate due reviews cache
  await redis.del(`due-reviews:${userId}`);

  return review;
};

const getDueReviews = async (userId: string) => {
  const cacheKey = `due-reviews:${userId}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const now = new Date();

  const reviews = await prisma.spacedReview.findMany({
    where: {
      userId,
      nextReviewAt: {
        lte: now,
      },
    },
    include: {
      question: {
        include: {
          options: {
            orderBy: { order: "asc" },
          },
          subject: {
            select: { id: true, name: true, slug: true },
          },
          category: {
            select: { id: true, name: true },
          },
          topic: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: {
      nextReviewAt: "asc",
    },
    take: 40, // safety limit
  });

  await redis.setex(cacheKey, DUE_CACHE_TTL, JSON.stringify(reviews));

  return reviews;
};

const submitReview = async (
  userId: string,
  questionId: string,
  quality: number
) => {
  if (quality < 0 || quality > 5) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Quality rating must be between 0 and 5"
    );
  }

  const review = await prisma.spacedReview.findUnique({
    where: {
      userId_questionId: {
        userId,
        questionId,
      },
    },
  });

  if (!review) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "This question is not in your spaced review list"
    );
  }

  // ======================
  // SM-2 Algorithm
  // ======================
  let { easeFactor, intervalDays, repetitions } = review;

  if (quality >= 3) {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  } else {
    // Failed – reset
    repetitions = 0;
    intervalDays = 1;
  }

  // Update ease factor
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  const updated = await prisma.spacedReview.update({
    where: { id: review.id },
    data: {
      easeFactor: Number(easeFactor.toFixed(2)),
      intervalDays,
      repetitions,
      nextReviewAt,
      lastReviewedAt: new Date(),
    },
  });

  // Invalidate cache
  await redis.del(`due-reviews:${userId}`);

  return updated;
};

const getMySpacedReviews = async (userId: string) => {
  return prisma.spacedReview.findMany({
    where: { userId },
    orderBy: { nextReviewAt: "asc" },
    include: {
      question: {
        select: {
          id: true,
          questionText: true,
          difficulty: true,
          subject: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
};

export const SpacedReviewService = {
  addToSpacedReview,
  getDueReviews,
  submitReview,
  getMySpacedReviews,
};