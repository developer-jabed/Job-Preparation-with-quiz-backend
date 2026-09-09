import httpStatus from "http-status";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import type { ICreateTest, IUpdateTest, ITestFilterRequest } from "./test.interface.js";
import { testSearchableFields } from "./test.constant.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { calculatePagination } from "../../helper/paginationHelper.js";
import slugify from "slugify"; 

const createTest = async (payload: ICreateTest) => {
  const { questionIds, slug, ...testData } = payload;

  const questions = await prisma.question.findMany({
    where: {
      id: { in: questionIds },
      deletedAt: null,
      isActive: true,
    },
  });

  if (questions.length !== questionIds.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Some questions are invalid, inactive or deleted"
    );
  }

  const totalMarks = questions.reduce((sum, q) => sum + Number(q.marks), 0);
  const finalSlug =
    slug ||
    slugify(testData.title, { lower: true, strict: true }) +
      "-" +
      Date.now().toString().slice(-6);

  return prisma.$transaction(async (tx) => {
    const test = await tx.test.create({
      data: {
        ...testData,
        slug: finalSlug,
        totalQuestions: questions.length,
        totalMarks,
        questions: {
          create: questionIds.map((qId, idx) => {
            const q = questions.find((item) => item.id === qId)!;
            return {
              questionId: qId,
              order: idx + 1,
              marks: q.marks,
            };
          }),
        },
      },
      include: {
        questions: {
          include: {
            question: {
              include: { options: { orderBy: { order: "asc" } } },
            },
          },
          orderBy: { order: "asc" },
        },
        subject: true,
        category: true,
      },
    });

    return test;
  });
};

const getAllTests = async (
  filters: ITestFilterRequest,
  options: IPaginationOptions
) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.TestWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: testSearchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
      })),
    });
  }

  // boolean filters
  if (filterData.isFree !== undefined) {
    andConditions.push({
      isFree: filterData.isFree === "true" || filterData.isFree === true,
    });
    delete (filterData as any).isFree;
  }
  if (filterData.isActive !== undefined) {
    andConditions.push({
      isActive: filterData.isActive === "true" || filterData.isActive === true,
    });
    delete (filterData as any).isActive;
  }
  if (filterData.isFeatured !== undefined) {
    andConditions.push({
      isFeatured:
        filterData.isFeatured === "true" || filterData.isFeatured === true,
    });
    delete (filterData as any).isFeatured;
  }

  if (Object.keys(filterData).length) {
    andConditions.push({
      AND: Object.entries(filterData).map(([key, value]) => ({
        [key]: value,
      })),
    });
  }

  const where: Prisma.TestWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [data, total] = await Promise.all([
    prisma.test.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { attempts: true, questions: true } },
      },
    }),
    prisma.test.count({ where }),
  ]);

  return { meta: { page, limit, total }, data };
};

const getTestByIdOrSlug = async (idOrSlug: string, hideAnswers = true) => {
  const test = await prisma.test.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      questions: {
        include: {
          question: {
            include: {
              options: {
                orderBy: { order: "asc" },
                select: hideAnswers
                  ? { id: true, text: true, textHi: true, order: true }
                  : undefined, // full when admin
              },
            },
          },
        },
        orderBy: { order: "asc" },
      },
      subject: true,
      category: true,
    },
  });

  if (!test) {
    throw new ApiError(httpStatus.NOT_FOUND, "Test not found");
  }

  return test;
};

const updateTest = async (id: string, payload: IUpdateTest) => {
  const existing = await prisma.test.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Test not found");
  }

  const { questionIds, ...updateData } = payload;

  return prisma.$transaction(async (tx) => {
    if (questionIds) {
      // replace all questions
      await tx.testQuestion.deleteMany({ where: { testId: id } });

      const questions = await tx.question.findMany({
        where: { id: { in: questionIds }, deletedAt: null, isActive: true },
      });

      if (questions.length !== questionIds.length) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid questions");
      }

      const totalMarks = questions.reduce((s, q) => s + Number(q.marks), 0);

      await tx.testQuestion.createMany({
        data: questionIds.map((qId, idx) => {
          const q = questions.find((item) => item.id === qId)!;
          return {
            testId: id,
            questionId: qId,
            order: idx + 1,
            marks: q.marks,
          };
        }),
      });

      (updateData as any).totalQuestions = questions.length;
      (updateData as any).totalMarks = totalMarks;
    }

    return tx.test.update({
      where: { id },
      data: updateData,
      include: {
        questions: {
          include: { question: { include: { options: true } } },
          orderBy: { order: "asc" },
        },
      },
    });
  });
};

const deleteTest = async (id: string) => {
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) {
    throw new ApiError(httpStatus.NOT_FOUND, "Test not found");
  }

  return prisma.test.delete({ where: { id } });
};

export const TestService = {
  createTest,
  getAllTests,
  getTestByIdOrSlug,
  updateTest,
  deleteTest,
};