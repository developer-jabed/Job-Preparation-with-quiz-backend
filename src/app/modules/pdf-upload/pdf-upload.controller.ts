import type { FastifyRequest, FastifyReply } from "fastify";
import httpStatus from "http-status";
import { PdfUploadService } from "./pdf-upload.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import type { MultipartFile } from "@fastify/multipart";

const uploadPdf = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const data = await req.file(); // @fastify/multipart

  if (!data) {
    throw new Error("No file uploaded");
  }

  // Get other fields from multipart
  const fields = data.fields as any;
  const payload = {
    subjectId: fields.subjectId?.value,
    examName: fields.examName?.value,
    year: fields.year?.value ? Number(fields.year.value) : undefined,
  };

  const result = await PdfUploadService.uploadPdf(
    userId,
    data as MultipartFile,
    payload
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "PDF uploaded successfully",
    data: result,
  });
});

const getAllPdfUploads = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const user = (req as any).user;
  const isAdmin = user.role === "ADMIN";

  const result = await PdfUploadService.getAllPdfUploads(user.id, isAdmin);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "PDF uploads retrieved successfully",
    data: result,
  });
});

const getPdfById = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const user = (req as any).user;
  const { id } = req.params as { id: string };
  const isAdmin = user.role === "ADMIN";

  const result = await PdfUploadService.getPdfById(id, user.id, isAdmin);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "PDF retrieved successfully",
    data: result,
  });
});

const deletePdf = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const user = (req as any).user;
  const { id } = req.params as { id: string };
  const isAdmin = user.role === "ADMIN";

  const result = await PdfUploadService.deletePdf(id, user.id, isAdmin);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const startAIExtraction = catchAsync(async (req: FastifyRequest, res: FastifyReply) => {
  const userId = (req as any).user.id;
  const { id } = req.params as { id: string };

  const result = await PdfUploadService.startAIExtraction(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const PdfUploadController = {
  uploadPdf,
  getAllPdfUploads,
  getPdfById,
  startAIExtraction,
  deletePdf,
};