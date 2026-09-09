import { prisma } from "../../shared/prisma.js";
import { redis } from "../../shared/redis.js";

const LEADERBOARD_KEY = "leaderboard:global";
const LEADERBOARD_TTL = 60 * 10; // 10 minutes

// ======================
// LEADERBOARD
// ======================
const updateLeaderboard = async (userId: string, score: number) => {
  // Using Redis Sorted Set (very fast & free-tier friendly)
  await redis.zadd(LEADERBOARD_KEY, score, userId);
};

const getLeaderboard = async (limit = 20) => {
  // Get top users from Redis
  const top = await redis.zrevrange(LEADERBOARD_KEY, 0, limit - 1, "WITHSCORES");

  const userIds: string[] = [];
  const scores: Record<string, number> = {};

  for (let i = 0; i < top.length; i += 2) {
    const userId = top[i];
    const score = Number(top[i + 1]);
    userIds.push(userId);
    scores[userId] = score;
  }

  if (userIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  });

  // Maintain ranking order
  return userIds.map((id, index) => {
    const user = users.find((u) => u.id === id);
    return {
      rank: index + 1,
      userId: id,
      name: user?.name || "Unknown",
      avatar: user?.avatar,
      score: scores[id],
    };
  });
};

// ======================
// WEAK TOPICS
// ======================
const getWeakTopics = async (userId: string) => {
  const wrongAnswers = await prisma.userAnswer.findMany({
    where: {
      isCorrect: false,
      attempt: { userId },
    },
    include: {
      question: {
        select: {
          topicId: true,
          topic: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      },
    },
  });

  const topicStats: Record<
    string,
    { name: string; wrong: number; subject: string; category: string }
  > = {};

  for (const ans of wrongAnswers) {
    const topicId = ans.question.topicId;
    if (!topicId || !ans.question.topic) continue;

    if (!topicStats[topicId]) {
      topicStats[topicId] = {
        name: ans.question.topic.name,
        wrong: 0,
        subject: ans.question.subject?.name || "",
        category: ans.question.category?.name || "",
      };
    }
    topicStats[topicId].wrong += 1;
  }

  return Object.entries(topicStats)
    .map(([topicId, data]) => ({
      topicId,
      ...data,
    }))
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 10);
};

// ======================
// USER PERFORMANCE SUMMARY
// ======================
const getMyPerformance = async (userId: string) => {
  const attempts = await prisma.testAttempt.findMany({
    where: {
      userId,
      status: "COMPLETED",
    },
    select: {
      obtainedMarks: true,
      totalMarks: true,
      accuracy: true,
      correctCount: true,
      wrongCount: true,
      skippedCount: true,
      timeTakenSeconds: true,
    },
  });

  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      averageAccuracy: 0,
      averageScore: 0,
      totalCorrect: 0,
      totalWrong: 0,
    };
  }

  const totalAttempts = attempts.length;
  const totalCorrect = attempts.reduce((s, a) => s + (a.correctCount || 0), 0);
  const totalWrong = attempts.reduce((s, a) => s + (a.wrongCount || 0), 0);
  const averageAccuracy =
    attempts.reduce((s, a) => s + (a.accuracy || 0), 0) / totalAttempts;
  const averageScore =
    attempts.reduce((s, a) => s + (a.obtainedMarks || 0), 0) / totalAttempts;

  return {
    totalAttempts,
    averageAccuracy: Number(averageAccuracy.toFixed(2)),
    averageScore: Number(averageScore.toFixed(2)),
    totalCorrect,
    totalWrong,
  };
};

export const AnalyticsService = {
  updateLeaderboard,
  getLeaderboard,
  getWeakTopics,
  getMyPerformance,
};