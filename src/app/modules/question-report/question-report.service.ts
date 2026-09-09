import httpStatus from "http-status";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import type { ICreateReport, ReportStatus } from "./question-report.interface.js";

const createReport = async (userId: string, payload: ICreateReport) => {
  const question = await prisma.question.findFirst({
    where: {
      id: payload.questionId,
      deletedAt: null,
    },
  });

  if (!question) {
    throw new ApiError(httpStatus.NOT_FOUND, "Question not found");
  }

  // Prevent duplicate pending reports
  const existing = await prisma.questionReport.findFirst({
    where: {
      userId,
      questionId: payload.questionId,
      status: "PENDING",
    },
  });

  if (existing) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "You already have a pending report for this question"
    );
  }

  const report = await prisma.questionReport.create({
    data: {
      userId,
      questionId: payload.questionId,
      reason: payload.reason,
      description: payload.description,
      status: "PENDING",
    },
  });

  return report;
};

const getAllReports = async (status?: string) => {
  return prisma.questionReport.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      question: {
        select: {
          id: true,
          questionText: true,
          difficulty: true,
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
};

const getMyReports = async (userId: string) => {
  return prisma.questionReport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      question: {
        select: {
          id: true,
          questionText: true,
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
};

const updateReportStatus = async (
  reportId: string,
  status: ReportStatus
) => {
  const report = await prisma.questionReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new ApiError(httpStatus.NOT_FOUND, "Report not found");
  }

  const updated = await prisma.questionReport.update({
    where: { id: reportId },
    data: { status },
  });

  return updated;
};

export const QuestionReportService = {
  createReport,
  getAllReports,
  getMyReports,
  updateReportStatus,
};