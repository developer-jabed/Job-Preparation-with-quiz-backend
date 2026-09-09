import httpStatus from "http-status";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import slugify from "slugify";
import type { ICreateTag, IUpdateTag } from "./tag.interface.js";

const createTag = async (payload: ICreateTag) => {
  const slug = slugify(payload.name, { lower: true, strict: true });

  const exists = await prisma.tag.findFirst({
    where: {
      OR: [{ name: payload.name }, { slug }],
    },
  });

  if (exists) {
    throw new ApiError(httpStatus.CONFLICT, "Tag already exists");
  }

  return prisma.tag.create({
    data: {
      name: payload.name,
      slug,
    },
  });
};

const getAllTags = async () => {
  return prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { questions: true },
      },
    },
  });
};

const getTagById = async (id: string) => {
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: { select: { questions: true } },
    },
  });

  if (!tag) {
    throw new ApiError(httpStatus.NOT_FOUND, "Tag not found");
  }

  return tag;
};

const updateTag = async (id: string, payload: IUpdateTag) => {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    throw new ApiError(httpStatus.NOT_FOUND, "Tag not found");
  }

  const data: any = {};
  if (payload.name) {
    data.name = payload.name;
    data.slug = slugify(payload.name, { lower: true, strict: true });
  }

  return prisma.tag.update({
    where: { id },
    data,
  });
};

const deleteTag = async (id: string) => {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    throw new ApiError(httpStatus.NOT_FOUND, "Tag not found");
  }

  await prisma.tag.delete({ where: { id } });
  return { message: "Tag deleted successfully" };
};

export const TagService = {
  createTag,
  getAllTags,
  getTagById,
  updateTag,
  deleteTag,
};