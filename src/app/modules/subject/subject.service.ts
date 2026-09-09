import httpStatus from "http-status";
import type { Prisma } from "@prisma/client";
import type { ICreateSubject, ISubjectFilterRequest, IUpdateSubject } from "./subject.interface.js";
import { subjectSearchableFields } from "./subject.constant.js";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { calculatePagination } from "../../helper/paginationHelper.js";

const ensureUniqueSlug = async (slug: string, excludeId?: string) => {
  const existing = await prisma.subject.findUnique({ where: { slug } });
  if (existing && existing.id !== excludeId) {
    throw new ApiError(httpStatus.CONFLICT, `Subject with slug "${slug}" already exists`);
  }
};

const createSubject = async (payload: ICreateSubject) => {
  await ensureUniqueSlug(payload.slug);

  const result = await prisma.subject.create({ data: payload });
  return result;
};

const getAllSubjects = async (filters: ISubjectFilterRequest, options: IPaginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.SubjectWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: subjectSearchableFields.map((field) => ({
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

  const whereCondition: Prisma.SubjectWhereInput = andConditions.length ? { AND: andConditions } : {};

  const [result, total] = await Promise.all([
    prisma.subject.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      // counts, not full child rows, so the list endpoint stays cheap
      include: {
        _count: { select: { categories: true, questions: true, tests: true } },
      },
    }),
    prisma.subject.count({ where: whereCondition }),
  ]);

  return {
    meta: { page, limit, total },
    data: result,
  };
};

const getSingleSubject = async (id: string) => {
  const result = await prisma.subject.findUnique({
    where: { id },
    include: {
      categories: { where: { isActive: true }, orderBy: { order: "asc" } },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subject not found");
  }

  return result;
};

const updateSubject = async (id: string, payload: IUpdateSubject) => {
  const isExist = await prisma.subject.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subject not found");
  }

  if (payload.slug && payload.slug !== isExist.slug) {
    await ensureUniqueSlug(payload.slug, id);
  }

  const result = await prisma.subject.update({ where: { id }, data: payload });
  return result;
};

// Subjects are referenced by Category, Question, Test, and PdfUpload — a
// hard delete would either fail on FK constraints or cascade-orphan a lot
// of data. Soft-deactivate instead, matching the isActive pattern already
// used across this schema.
const deleteSubject = async (id: string) => {
  const isExist = await prisma.subject.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subject not found");
  }

  const dependentQuestionCount = await prisma.question.count({ where: { subjectId: id } });
  if (dependentQuestionCount > 0) {
    // Deactivating is safe even with dependents; block only true deletion
    return prisma.subject.update({ where: { id }, data: { isActive: false } });
  }

  return prisma.subject.delete({ where: { id } });
};

export const SubjectService = {
  createSubject,
  getAllSubjects,
  getSingleSubject,
  updateSubject,
  deleteSubject,
};