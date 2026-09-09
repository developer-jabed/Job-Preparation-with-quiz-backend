import httpStatus from "http-status";
import type { Prisma } from "@prisma/client";
import type { ICreateTopic, ITopicFilterRequest, IUpdateTopic } from "./topic.interface.js";
import { topicSearchableFields } from "./topic.constant.js";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { calculatePagination } from "../../helper/paginationHelper.js";

const createTopic = async (payload: ICreateTopic) => {
  const category = await prisma.category.findUnique({ where: { id: payload.categoryId } });
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  // Schema enforces @@unique([categoryId, slug])
  const existing = await prisma.topic.findUnique({
    where: { categoryId_slug: { categoryId: payload.categoryId, slug: payload.slug } },
  });
  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, `Topic with slug "${payload.slug}" already exists in this category`);
  }

  return prisma.topic.create({ data: payload });
};

const getAllTopics = async (filters: ITopicFilterRequest, options: IPaginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.TopicWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: topicSearchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.entries(filterData).map(([key, value]) => {
        if (key === "isActive") {
          return { isActive: value === "true" || value === true };
        }
        return { [key]: value };
      }),
    });
  }

  const whereCondition: Prisma.TopicWhereInput = andConditions.length ? { AND: andConditions } : {};

  const [result, total] = await Promise.all([
    prisma.topic.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: { select: { id: true, name: true, slug: true, subjectId: true } },
        _count: { select: { questions: true } },
      },
    }),
    prisma.topic.count({ where: whereCondition }),
  ]);

  return { meta: { page, limit, total }, data: result };
};

const getSingleTopic = async (id: string) => {
  const result = await prisma.topic.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true, subjectId: true } },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Topic not found");
  }

  return result;
};

const updateTopic = async (id: string, payload: IUpdateTopic) => {
  const isExist = await prisma.topic.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Topic not found");
  }

  if (payload.slug && payload.slug !== isExist.slug) {
    const existing = await prisma.topic.findUnique({
      where: { categoryId_slug: { categoryId: isExist.categoryId, slug: payload.slug } },
    });
    if (existing) {
      throw new ApiError(httpStatus.CONFLICT, `Topic with slug "${payload.slug}" already exists in this category`);
    }
  }

  return prisma.topic.update({ where: { id }, data: payload });
};

const deleteTopic = async (id: string) => {
  const isExist = await prisma.topic.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Topic not found");
  }

  const dependentQuestionCount = await prisma.question.count({ where: { topicId: id } });
  if (dependentQuestionCount > 0) {
    return prisma.topic.update({ where: { id }, data: { isActive: false } });
  }

  return prisma.topic.delete({ where: { id } });
};

export const TopicService = {
  createTopic,
  getAllTopics,
  getSingleTopic,
  updateTopic,
  deleteTopic,
};