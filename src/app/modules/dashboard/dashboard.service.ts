import httpStatus from "http-status";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import {
  Role,
  PdfStatus,
  ReviewStatus,
  AttemptStatus,
  Difficulty,
} from "@prisma/client";

// ────────────────────────────────────────────────
// ADMIN DASHBOARD
// ────────────────────────────────────────────────

const getAdminDashboard = async () => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalLearners,
    activeLearners,
    newLearnersThisWeek,
    totalQuestions,
    activeQuestions,
    questionsByDifficulty,
    pendingExtracted,
    needsEditExtracted,
    totalPdfs,
    pdfsByStatus,
    totalTests,
    activeTests,
    totalAttempts,
    completedAttempts,
    attemptsToday,
    attemptsThisWeek,
    pendingReports,
    recentLearners,
    recentAttempts,
    recentReports,
    recentPdfs,
  ] = await Promise.all([
    // Learners
    prisma.user.count({ where: { role: Role.LEARNER } }),
    prisma.user.count({
      where: { role: Role.LEARNER, isActive: true },
    }),
    prisma.user.count({
      where: {
        role: Role.LEARNER,
        createdAt: { gte: sevenDaysAgo },
      },
    }),

    // Questions
    prisma.question.count({ where: { deletedAt: null } }),
    prisma.question.count({
      where: { isActive: true, deletedAt: null },
    }),
    prisma.question.groupBy({
      by: ["difficulty"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),

    // Extraction review queue
    prisma.extractedQuestion.count({
      where: { status: ReviewStatus.PENDING },
    }),
    prisma.extractedQuestion.count({
      where: { status: ReviewStatus.NEEDS_EDIT },
    }),

    // PDFs
    prisma.pdfUpload.count(),
    prisma.pdfUpload.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),

    // Tests
    prisma.test.count(),
    prisma.test.count({ where: { isActive: true } }),

    // Attempts
    prisma.testAttempt.count(),
    prisma.testAttempt.count({
      where: { status: AttemptStatus.COMPLETED },
    }),
    prisma.testAttempt.count({
      where: { createdAt: { gte: startOfToday } },
    }),
    prisma.testAttempt.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),

    // Reports
    prisma.questionReport.count({
      where: { status: "PENDING" },
    }),

    // Recent activity feeds
    prisma.user.findMany({
      where: { role: Role.LEARNER },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        isActive: true,
      },
    }),
    prisma.testAttempt.findMany({
      where: { status: AttemptStatus.COMPLETED },
      orderBy: { submittedAt: "desc" },
      take: 8,
      select: {
        id: true,
        obtainedMarks: true,
        totalMarks: true,
        accuracy: true,
        submittedAt: true,
        user: { select: { id: true, name: true, avatar: true } },
        test: { select: { id: true, title: true, testType: true } },
      },
    }),
    prisma.questionReport.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        reason: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        question: {
          select: {
            id: true,
            questionText: true,
            subject: { select: { name: true } },
          },
        },
      },
    }),
    prisma.pdfUpload.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        originalName: true,
        status: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { extractedQuestions: true } },
      },
    }),
  ]);

  const difficultyMap: Record<string, number> = {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  };
  questionsByDifficulty.forEach((row) => {
    if (row.difficulty) {
      difficultyMap[row.difficulty] = row._count._all;
    }
  });

  const pdfStatusMap: Record<string, number> = {};
  Object.values(PdfStatus).forEach((s) => {
    pdfStatusMap[s] = 0;
  });
  pdfsByStatus.forEach((row) => {
    pdfStatusMap[row.status] = row._count._all;
  });

  const completionRate =
    totalAttempts > 0
      ? Math.round((completedAttempts / totalAttempts) * 1000) / 10
      : 0;

  return {
    kpis: {
      learners: {
        total: totalLearners,
        active: activeLearners,
        newThisWeek: newLearnersThisWeek,
      },
      questions: {
        total: totalQuestions,
        active: activeQuestions,
        byDifficulty: difficultyMap,
      },
      extraction: {
        pendingReview: pendingExtracted,
        needsEdit: needsEditExtracted,
        queueTotal: pendingExtracted + needsEditExtracted,
      },
      pdfs: {
        total: totalPdfs,
        byStatus: pdfStatusMap,
      },
      tests: {
        total: totalTests,
        active: activeTests,
      },
      attempts: {
        total: totalAttempts,
        completed: completedAttempts,
        today: attemptsToday,
        thisWeek: attemptsThisWeek,
        completionRate,
      },
      reports: {
        pending: pendingReports,
      },
    },
    recent: {
      learners: recentLearners,
      attempts: recentAttempts,
      reports: recentReports,
      pdfs: recentPdfs,
    },
  };
};

// ────────────────────────────────────────────────
// LEARNER DASHBOARD
// ────────────────────────────────────────────────

const getLearnerDashboard = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      streakDays: true,
      lastActiveAt: true,
      preferredLanguage: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalAttempts,
    completedAttempts,
    inProgressAttempts,
    bookmarkCount,
    reportCount,
    dueReviews,
    recentAttempts,
    subjectProgress,
    avgStats,
  ] = await Promise.all([
    prisma.testAttempt.count({ where: { userId } }),
    prisma.testAttempt.count({
      where: { userId, status: AttemptStatus.COMPLETED },
    }),
    prisma.testAttempt.count({
      where: { userId, status: AttemptStatus.IN_PROGRESS },
    }),
    prisma.bookmark.count({ where: { userId } }),
    prisma.questionReport.count({ where: { userId } }),
    prisma.spacedReview.count({
      where: {
        userId,
        nextReviewAt: { lte: now },
      },
    }),
    prisma.testAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        obtainedMarks: true,
        totalMarks: true,
        accuracy: true,
        correctCount: true,
        wrongCount: true,
        skippedCount: true,
        timeTakenSeconds: true,
        startedAt: true,
        submittedAt: true,
        test: {
          select: {
            id: true,
            title: true,
            testType: true,
            durationMinutes: true,
            totalQuestions: true,
          },
        },
      },
    }),
    // Progress by subject (completed attempts)
    prisma.testAttempt.findMany({
      where: {
        userId,
        status: AttemptStatus.COMPLETED,
        test: { subjectId: { not: null } },
      },
      select: {
        obtainedMarks: true,
        totalMarks: true,
        accuracy: true,
        test: {
          select: {
            subjectId: true,
            subject: { select: { id: true, name: true, icon: true } },
          },
        },
      },
    }),
    prisma.testAttempt.aggregate({
      where: {
        userId,
        status: AttemptStatus.COMPLETED,
        accuracy: { not: null },
      },
      _avg: {
        accuracy: true,
        obtainedMarks: true,
      },
      _sum: {
        correctCount: true,
        wrongCount: true,
        skippedCount: true,
        timeTakenSeconds: true,
      },
    }),
  ]);

  // Aggregate subject progress
  const subjectMap = new Map<
    string,
    {
      subjectId: string;
      name: string;
      icon: string | null;
      attempts: number;
      totalObtained: number;
      totalPossible: number;
      accuracySum: number;
    }
  >();

  for (const att of subjectProgress) {
    const sub = att.test.subject;
    if (!sub) continue;
    const existing = subjectMap.get(sub.id) || {
      subjectId: sub.id,
      name: sub.name,
      icon: sub.icon,
      attempts: 0,
      totalObtained: 0,
      totalPossible: 0,
      accuracySum: 0,
    };
    existing.attempts += 1;
    existing.totalObtained += att.obtainedMarks ?? 0;
    existing.totalPossible += att.totalMarks ?? 0;
    existing.accuracySum += att.accuracy ?? 0;
    subjectMap.set(sub.id, existing);
  }

  const bySubject = Array.from(subjectMap.values()).map((s) => ({
    subjectId: s.subjectId,
    name: s.name,
    icon: s.icon,
    attempts: s.attempts,
    avgAccuracy:
      s.attempts > 0
        ? Math.round((s.accuracySum / s.attempts) * 10) / 10
        : 0,
    scorePercent:
      s.totalPossible > 0
        ? Math.round((s.totalObtained / s.totalPossible) * 1000) / 10
        : 0,
  }));

  // Upcoming reviews (next 5)
  const upcomingReviews = await prisma.spacedReview.findMany({
    where: { userId },
    orderBy: { nextReviewAt: "asc" },
    take: 5,
    select: {
      id: true,
      nextReviewAt: true,
      intervalDays: true,
      repetitions: true,
      question: {
        select: {
          id: true,
          questionText: true,
          difficulty: true,
          subject: { select: { name: true } },
        },
      },
    },
  });

  const avgAccuracy =
    avgStats._avg.accuracy != null
      ? Math.round(avgStats._avg.accuracy * 10) / 10
      : 0;

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      streakDays: user.streakDays,
      lastActiveAt: user.lastActiveAt,
      preferredLanguage: user.preferredLanguage,
      memberSince: user.createdAt,
    },
    kpis: {
      totalAttempts,
      completedAttempts,
      inProgressAttempts,
      bookmarks: bookmarkCount,
      reports: reportCount,
      reviewsDue: dueReviews,
      avgAccuracy,
      totalCorrect: avgStats._sum.correctCount ?? 0,
      totalWrong: avgStats._sum.wrongCount ?? 0,
      totalSkipped: avgStats._sum.skippedCount ?? 0,
      totalStudySeconds: avgStats._sum.timeTakenSeconds ?? 0,
    },
    bySubject,
    recentAttempts,
    upcomingReviews,
  };
};

// ────────────────────────────────────────────────
// CHART DATA (optional — for graphs)
// ────────────────────────────────────────────────

const getAdminCharts = async (days = 14) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const attempts = await prisma.testAttempt.findMany({
    where: { createdAt: { gte: since } },
    select: {
      createdAt: true,
      status: true,
      accuracy: true,
    },
  });

  const learners = await prisma.user.findMany({
    where: {
      role: Role.LEARNER,
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });

  // Bucket by date (YYYY-MM-DD)
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const attemptSeries: Record<
    string,
    { total: number; completed: number }
  > = {};
  const learnerSeries: Record<string, number> = {};

  for (let i = 0; i <= days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const k = dayKey(d);
    attemptSeries[k] = { total: 0, completed: 0 };
    learnerSeries[k] = 0;
  }

  attempts.forEach((a) => {
    const k = dayKey(a.createdAt);
    if (!attemptSeries[k]) attemptSeries[k] = { total: 0, completed: 0 };
    attemptSeries[k].total += 1;
    if (a.status === AttemptStatus.COMPLETED) {
      attemptSeries[k].completed += 1;
    }
  });

  learners.forEach((u) => {
    const k = dayKey(u.createdAt);
    if (learnerSeries[k] !== undefined) learnerSeries[k] += 1;
  });

  return {
    attemptsOverTime: Object.entries(attemptSeries).map(([date, v]) => ({
      date,
      ...v,
    })),
    newLearnersOverTime: Object.entries(learnerSeries).map(
      ([date, count]) => ({ date, count })
    ),
  };
};

const getLearnerCharts = async (userId: string, days = 14) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const attempts = await prisma.testAttempt.findMany({
    where: {
      userId,
      status: AttemptStatus.COMPLETED,
      submittedAt: { gte: since },
    },
    select: {
      submittedAt: true,
      accuracy: true,
      obtainedMarks: true,
      totalMarks: true,
    },
    orderBy: { submittedAt: "asc" },
  });

  return {
    accuracyTrend: attempts.map((a) => ({
      date: a.submittedAt
        ? a.submittedAt.toISOString().slice(0, 10)
        : null,
      accuracy: a.accuracy,
      scorePercent:
        a.totalMarks && a.totalMarks > 0
          ? Math.round(((a.obtainedMarks ?? 0) / a.totalMarks) * 1000) / 10
          : null,
    })),
  };
};

export const DashboardService = {
  getAdminDashboard,
  getLearnerDashboard,
  getAdminCharts,
  getLearnerCharts,
};