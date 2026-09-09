import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { SubjectService } from "./subject.service.js";
import { subjectFilterableFields } from "./subject.constant.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import pick from "../../helper/pick.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { buildPaginationMeta } from "../../helper/paginationHelper.js";


const createSubject = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const result = await SubjectService.createSubject(request.body as any);

  sendResponse(reply, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Subject created successfully",
    data: result,
  });
});

const getAllSubjects = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const filters = pick(request.query as Record<string, unknown>, subjectFilterableFields);
  const options = pick(request.query as Record<string, unknown>, [
    "page",
    "limit",
    "sortBy",
    "sortOrder",
  ]) as IPaginationOptions;

  const result = await SubjectService.getAllSubjects(filters, options);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subjects fetched successfully",
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

const getSingleSubject = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const result = await SubjectService.getSingleSubject(id);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subject fetched successfully",
    data: result,
  });
});

const updateSubject = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const result = await SubjectService.updateSubject(id, request.body as any);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subject updated successfully",
    data: result,
  });
});

const deleteSubject = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  await SubjectService.deleteSubject(id);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subject deleted successfully",
    data: null,
  });
});

export const SubjectController = {
  createSubject,
  getAllSubjects,
  getSingleSubject,
  updateSubject,
  deleteSubject,
};