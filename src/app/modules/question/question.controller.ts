import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { QuestionService } from "./question.service.js";
import { questionFilterableFields } from "./question.constant.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import pick from "../../helper/pick.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import { buildPaginationMeta, type PaginationResult } from "../../helper/paginationHelper.js";

const createQuestion = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
    const userId = (req as any).user.id;
    const result = await QuestionService.createQuestion(req.body as any, userId);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Question created successfully",
        data: result,
    });
});

const getAllQuestions = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
    const filters = pick(req.query as Record<string, unknown>, questionFilterableFields);
    const options = pick(req.query as Record<string, unknown>, [
        "page",
        "limit",
        "sortBy",
        "sortOrder",
    ]) as IPaginationOptions;

    const result = await QuestionService.getAllQuestions(filters as any, options);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Questions retrieved successfully",
        meta: buildPaginationMeta(result.meta.total, {
            page: result.meta.page,
            limit: result.meta.limit,
            skip: 0,
            take: result.meta.limit,
            sortBy: "createdAt",
            sortOrder: "desc",
        } as PaginationResult),
        data: result.data, // ← this was missing
    });
});

const getQuestionById = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
    const { id } = req.params as { id: string };
    const result = await QuestionService.getQuestionById(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Question retrieved successfully",
        data: result,
    });
});

const updateQuestion = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
    const { id } = req.params as { id: string };
    const result = await QuestionService.updateQuestion(id, req.body as any);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Question updated successfully",
        data: result,
    });
});

const softDeleteQuestion = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
    const { id } = req.params as { id: string };
    const result = await QuestionService.softDeleteQuestion(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Question deleted successfully",
        data: result,
    });
});

const restoreQuestion = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
    const { id } = req.params as { id: string };
    const result = await QuestionService.restoreQuestion(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Question restored successfully",
        data: result,
    });
});

export const QuestionController = {
    createQuestion,
    getAllQuestions,
    getQuestionById,
    updateQuestion,
    softDeleteQuestion,
    restoreQuestion,
};