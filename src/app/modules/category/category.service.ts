import httpStatus from "http-status";
import type { Prisma } from "@prisma/client";
import type { ICategoryFilterRequest, ICreateCategory, IUpdateCategory } from "./category.interface.js";
import { categorySearchableFields } from "./category.constant.js";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { calculatePagination } from "../../helper/paginationHelper.js";

const createCategory = async (payload: ICreateCategory) => {
  const subject = await prisma.subject.findUnique({ where: { id: payload.subjectId } });
  if (!subject) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subject not found");
  }

  // Schema enforces @@unique([subjectId, slug]) — slug only needs to be
  // unique within its own subject, not globally.
  const existing = await prisma.category.findUnique({
    where: { subjectId_slug: { subjectId: payload.subjectId, slug: payload.slug } },
  });
  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, `Category with slug "${payload.slug}" already exists in this subject`);
  }

  return prisma.category.create({ data: payload });
};

const getAllCategories = async (filters: ICategoryFilterRequest, options: IPaginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.CategoryWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: categorySearchableFields.map((field) => ({
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

  const whereCondition: Prisma.CategoryWhereInput = andConditions.length ? { AND: andConditions } : {};

  const [result, total] = await Promise.all([
    prisma.category.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        _count: { select: { topics: true, questions: true } },
      },
    }),
    prisma.category.count({ where: whereCondition }),
  ]);

  return { meta: { page, limit, total }, data: result };
};

const getSingleCategory = async (id: string) => {
  const result = await prisma.category.findUnique({
    where: { id },
    include: {
      subject: { select: { id: true, name: true, slug: true } },
      topics: { where: { isActive: true }, orderBy: { order: "asc" } },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  return result;
};

const updateCategory = async (id: string, payload: IUpdateCategory) => {
  const isExist = await prisma.category.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  if (payload.slug && payload.slug !== isExist.slug) {
    const existing = await prisma.category.findUnique({
      where: { subjectId_slug: { subjectId: isExist.subjectId, slug: payload.slug } },
    });
    if (existing) {
      throw new ApiError(httpStatus.CONFLICT, `Category with slug "${payload.slug}" already exists in this subject`);
    }
  }

  return prisma.category.update({ where: { id }, data: payload });
};

const deleteCategory = async (id: string) => {
  const isExist = await prisma.category.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  const dependentQuestionCount = await prisma.question.count({ where: { categoryId: id } });
  if (dependentQuestionCount > 0) {
    return prisma.category.update({ where: { id }, data: { isActive: false } });
  }

  return prisma.category.delete({ where: { id } });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};