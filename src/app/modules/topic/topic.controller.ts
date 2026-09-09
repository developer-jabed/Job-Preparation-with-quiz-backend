import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { TopicService } from "./topic.service.js";
import { topicFilterableFields } from "./topic.constant.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import pick from "../../helper/pick.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { buildPaginationMeta } from "../../helper/paginationHelper.js";


const createTopic = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const result = await TopicService.createTopic(request.body as any);

  sendResponse(reply, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Topic created successfully",
    data: result,
  });
});

const getAllTopics = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const filters = pick(request.query as Record<string, unknown>, topicFilterableFields);
  const options = pick(request.query as Record<string, unknown>, [
    "page",
    "limit",
    "sortBy",
    "sortOrder",
  ]) as IPaginationOptions;

  const result = await TopicService.getAllTopics(filters, options);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Topics fetched successfully",
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

const getSingleTopic = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const result = await TopicService.getSingleTopic(id);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Topic fetched successfully",
    data: result,
  });
});

const updateTopic = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const result = await TopicService.updateTopic(id, request.body as any);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Topic updated successfully",
    data: result,
  });
});

const deleteTopic = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  await TopicService.deleteTopic(id);

  sendResponse(reply, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Topic deleted successfully",
    data: null,
  });
});

export const TopicController = {
  createTopic,
  getAllTopics,
  getSingleTopic,
  updateTopic,
  deleteTopic,
};