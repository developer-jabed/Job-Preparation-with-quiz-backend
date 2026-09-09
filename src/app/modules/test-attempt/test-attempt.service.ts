import httpStatus from "http-status";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import type { IStartAttempt, ISaveAnswer } from "./test-attempt.interface.js";
import { AnalyticsService } from "../analytics/analytics.service.js"; // ← add this import

const startAttempt = async (payload: IStartAttempt, userId: string) => {
  const test = await prisma.test.findFirst({
    where: { id: payload.testId, isActive: true },
    include: { questions: true },
  });

  if (!test) {
    throw new ApiError(httpStatus.NOT_FOUND, "Test not found or inactive");
  }

  // Check if user already has an in-progress attempt
  const existing = await prisma.testAttempt.findFirst({
    where: {
      userId,
      testId: payload.testId,
      status: "IN_PROGRESS",
    },
  });

  if (existing) {
    return existing; // resume
  }

  return prisma.testAttempt.create({
    data: {
      userId,
      testId: payload.testId,
      status: "IN_PROGRESS",
    },
    include: {
      test: {
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          totalQuestions: true,
          totalMarks: true,
        },
      },
    },
  });
};

const saveAnswer = async (
  attemptId: string,
  userId: string,
  payload: ISaveAnswer
) => {
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
  });

  if (!attempt) {
    throw new ApiError(httpStatus.NOT_FOUND, "Active attempt not found");
  }

  // Upsert answer
  return prisma.userAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId: payload.questionId,
      },
    },
    create: {
      attemptId,
      questionId: payload.questionId,
      selectedOptions: payload.selectedOptions,
      timeSpentSeconds: payload.timeSpentSeconds,
    },
    update: {
      selectedOptions: payload.selectedOptions,
      timeSpentSeconds: payload.timeSpentSeconds,
    },
  });
};

const submitAttempt = async (attemptId: string, userId: string) => {
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    include: {
      test: {
        include: {
          questions: {
            include: {
              question: {
                include: { options: true },
              },
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    throw new ApiError(httpStatus.NOT_FOUND, "Active attempt not found");
  }

  const timeTakenSeconds = Math.floor(
    (Date.now() - attempt.startedAt.getTime()) / 1000
  );

  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let obtainedMarks = 0;

  for (const tq of attempt.test.questions) {
    const userAnswer = attempt.answers.find(
      (a) => a.questionId === tq.questionId
    );

    const correctOptionIds = tq.question.options
      .filter((o) => o.isCorrect)
      .map((o) => o.id);

    if (!userAnswer || userAnswer.selectedOptions.length === 0) {
      skippedCount++;
      continue;
    }

    const isCorrect =
      userAnswer.selectedOptions.length === correctOptionIds.length &&
      userAnswer.selectedOptions.every((id) => correctOptionIds.includes(id));

    const marksForThis = isCorrect
      ? Number(tq.marks ?? tq.question.marks)
      : -Number(tq.question.negativeMarks);

    await prisma.userAnswer.update({
      where: { id: userAnswer.id },
      data: {
        isCorrect,
        marksObtained: marksForThis,
      },
    });

    if (isCorrect) {
      correctCount++;
      obtainedMarks += marksForThis;
    } else {
      wrongCount++;
      obtainedMarks += marksForThis;
    }
  }

  const accuracy =
    attempt.test.totalQuestions > 0
      ? (correctCount / attempt.test.totalQuestions) * 100
      : 0;

  const finalAttempt = await prisma.testAttempt.update({
    where: { id: attemptId },
    data: {
      status: "COMPLETED",
      submittedAt: new Date(),
      timeTakenSeconds,
      correctCount,
      wrongCount,
      skippedCount,
      obtainedMarks: Math.max(0, obtainedMarks),
      totalMarks: attempt.test.totalMarks,
      accuracy: Number(accuracy.toFixed(2)),
    },
    include: {
      answers: {
        include: {
          question: {
            include: {
              options: true,
            },
          },
        },
      },
      test: true,
    },
  });

  // ======================
  // UPDATE LEADERBOARD (Redis Sorted Set)
  // ======================
  try {
    await AnalyticsService.updateLeaderboard(
      userId,
      finalAttempt.obtainedMarks || 0
    );
  } catch (err) {
    // Don't fail the whole request if leaderboard update fails
    console.error("Failed to update leaderboard:", err);
  }

  return finalAttempt;
};

const getMyAttempts = async (userId: string) => {
  return prisma.testAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      test: {
        select: {
          id: true,
          title: true,
          testType: true,
          totalMarks: true,
        },
      },
    },
  });
};

const getAttemptResult = async (attemptId: string, userId: string) => {
  const attempt = await prisma.testAttempt.findFirst({
    where: {
      id: attemptId,
      userId,
      status: { in: ["COMPLETED", "TIMED_OUT"] },
    },
    include: {
      answers: {
        include: {
          question: {
            include: {
              options: true,
              explanation: true,
            },
          },
        },
      },
      test: true,
    },
  });

  if (!attempt) {
    throw new ApiError(httpStatus.NOT_FOUND, "Result not found");
  }

  return attempt;
};

export const TestAttemptService = {
  startAttempt,
  saveAnswer,
  submitAttempt,
  getMyAttempts,
  getAttemptResult,
};