import httpStatus from "http-status";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import type {
  ICreateQuestion,
  IUpdateQuestion,
  IQuestionFilterRequest,
} from "./question.interface.js";
import { questionSearchableFields } from "./question.constant.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { calculatePagination } from "../../helper/paginationHelper.js";

const createQuestion = async (payload: ICreateQuestion, userId: string) => {
  const { options, tagIds, ...questionData } = payload;

  if (!options || options.length < 2) {
    throw new ApiError(httpStatus.BAD_REQUEST, "At least 2 options are required");
  }

  const correctCount = options.filter((o) => o.isCorrect).length;
  if (correctCount === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "At least one correct option is required");
  }

  // Validate taxonomy
  const subject = await prisma.subject.findUnique({
    where: { id: questionData.subjectId },
  });
  if (!subject) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subject not found");
  }

  if (questionData.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: questionData.categoryId, subjectId: questionData.subjectId },
    });
    if (!category) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Category does not belong to the subject");
    }
  }

  if (questionData.topicId && questionData.categoryId) {
    const topic = await prisma.topic.findFirst({
      where: { id: questionData.topicId, categoryId: questionData.categoryId },
    });
    if (!topic) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Topic does not belong to the category");
    }
  }

  return prisma.$transaction(async (tx) => {
    const question = await tx.question.create({
      data: {
        ...questionData,
        createdById: userId,
        options: {
          create: options.map((opt, idx) => ({
            text: opt.text,
            textHi: opt.textHi,
            isCorrect: opt.isCorrect,
            order: opt.order ?? idx,
          })),
        },
        ...(tagIds && tagIds.length > 0
          ? {
              tags: {
                create: tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
      include: {
        options: { orderBy: { order: "asc" } },
        subject: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return question;
  });
};

const getAllQuestions = async (
  filters: IQuestionFilterRequest,
  options: IPaginationOptions
) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.QuestionWhereInput[] = [{ deletedAt: null }];

  if (searchTerm) {
    andConditions.push({
      OR: questionSearchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
      })),
    });
  }

  // Convert string boolean/number filters
  if (filterData.isActive !== undefined) {
    andConditions.push({
      isActive: filterData.isActive === "true" || filterData.isActive === true,
    });
    delete (filterData as any).isActive;
  }
  if (filterData.isPreviousYear !== undefined) {
    andConditions.push({
      isPreviousYear:
        filterData.isPreviousYear === "true" || filterData.isPreviousYear === true,
    });
    delete (filterData as any).isPreviousYear;
  }
  if (filterData.year) {
    andConditions.push({ year: Number(filterData.year) });
    delete (filterData as any).year;
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.entries(filterData).map(([key, value]) => ({
        [key]: value,
      })),
    });
  }

  const where: Prisma.QuestionWhereInput = { AND: andConditions };

  const [data, total] = await Promise.all([
    prisma.question.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        options: { orderBy: { order: "asc" } },
        subject: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        _count: { select: { testQuestions: true, bookmarks: true } },
      },
    }),
    prisma.question.count({ where }),
  ]);

  return {
    meta: { page, limit, total },
    data,
  };
};

const getQuestionById = async (id: string) => {
  const question = await prisma.question.findFirst({
    where: { id, deletedAt: null },
    include: {
      options: { orderBy: { order: "asc" } },
      subject: true,
      category: true,
      topic: true,
      tags: { include: { tag: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  if (!question) {
    throw new ApiError(httpStatus.NOT_FOUND, "Question not found");
  }

  return question;
};

const updateQuestion = async (id: string, payload: IUpdateQuestion) => {
  const existing = await prisma.question.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Question not found");
  }

  const { options, tagIds, ...updateData } = payload;

  return prisma.$transaction(async (tx) => {
    // If options are provided → delete old + create new
    if (options) {
      await tx.option.deleteMany({ where: { questionId: id } });
    }

    // If tags are provided → replace
    if (tagIds) {
      await tx.questionTag.deleteMany({ where: { questionId: id } });
    }

    const updated = await tx.question.update({
      where: { id },
      data: {
        ...updateData,
        ...(options && {
          options: {
            create: options.map((opt, idx) => ({
              text: opt.text,
              textHi: opt.textHi,
              isCorrect: opt.isCorrect,
              order: opt.order ?? idx,
            })),
          },
        }),
        ...(tagIds && {
          tags: {
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: {
        options: { orderBy: { order: "asc" } },
        subject: true,
        category: true,
        topic: true,
        tags: { include: { tag: true } },
      },
    });

    return updated;
  });
};

const softDeleteQuestion = async (id: string) => {
  const question = await prisma.question.findFirst({
    where: { id, deletedAt: null },
  });
  if (!question) {
    throw new ApiError(httpStatus.NOT_FOUND, "Question not found");
  }

  return prisma.question.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
};

const restoreQuestion = async (id: string) => {
  const question = await prisma.question.findFirst({
    where: { id, deletedAt: { not: null } },
  });
  if (!question) {
    throw new ApiError(httpStatus.NOT_FOUND, "Deleted question not found");
  }

  return prisma.question.update({
    where: { id },
    data: { deletedAt: null, isActive: true },
  });
};

export const QuestionService = {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  softDeleteQuestion,
  restoreQuestion,
};