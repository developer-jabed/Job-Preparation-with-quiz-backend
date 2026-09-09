import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { CategoryService } from "./category.service.js";
import { categoryFilterableFields } from "./category.constant.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import pick from "../../helper/pick.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { buildPaginationMeta } from "../../helper/paginationHelper.js";


const createCategory = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const result = await CategoryService.createCategory(request.body as any);

  sendResponse(reply, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const getAllCategories = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const filters = pick(request.query as Record<string, unknown>, categoryFilterableFields);
  const options = pick(request.query as Record<string, unknown>, [
    "page",
    "limit",
    "sortBy",
    "sortOrder",
  ]) as IPaginationOptions;

  const result = await CategoryService.getAllCategories(filters, options);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories fetched successfully",
    meta: buildPaginationMeta(result.meta.total, {
      page: result.meta.page,
      limit: result.meta.limit,
      skip: 0,
      take: result.meta.limit,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    data: result.data,
  });
});

const getSingleCategory = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const result = await CategoryService.getSingleCategory(id);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category fetched successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const result = await CategoryService.updateCategory(id, request.body as any);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  await CategoryService.deleteCategory(id);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category deleted successfully",
    data: null,
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};