import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { TagService } from "./tag.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";

const createTag = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const result = await TagService.createTag(req.body as any);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Tag created successfully",
    data: result,
  });
});

const getAllTags = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const result = await TagService.getAllTags();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tags retrieved successfully",
    data: result,
  });
});

const getTagById = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = req.params as { id: string };
  const result = await TagService.getTagById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tag retrieved successfully",
    data: result,
  });
});

const updateTag = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = req.params as { id: string };
  const result = await TagService.updateTag(id, req.body as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tag updated successfully",
    data: result,
  });
});

const deleteTag = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = req.params as { id: string };
  const result = await TagService.deleteTag(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const TagController = {
  createTag,
  getAllTags,
  getTagById,
  updateTag,
  deleteTag,
};