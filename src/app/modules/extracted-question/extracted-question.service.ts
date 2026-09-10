import httpStatus from "http-status";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import {
    ReviewStatus,
    QuestionType,
    Difficulty,
} from "@prisma/client";

const updateStatus = async (
    questionId: string,
    payload: { status: ReviewStatus; reviewNote?: string },
    userId: string,
    isAdmin = false
) => {
    const question = await prisma.extractedQuestion.findUnique({
        where: { id: questionId },
        include: {
            pdfUpload: {
                select: {
                    id: true,
                    uploadedById: true,
                    subjectId: true,
                },
            },
        },
    });

    if (!question) {
        throw new ApiError(httpStatus.NOT_FOUND, "Extracted question not found");
    }

    if (!isAdmin && question.pdfUpload.uploadedById !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
    }

    const allowed: ReviewStatus[] = [
        ReviewStatus.PENDING,
        ReviewStatus.NEEDS_EDIT,
        ReviewStatus.APPROVED,
        ReviewStatus.REJECTED,
    ];

    if (!allowed.includes(payload.status)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid status value");
    }

    const updated = await prisma.extractedQuestion.update({
        where: { id: questionId },
        data: {
            status: payload.status,
            ...(payload.reviewNote !== undefined
                ? { reviewNote: payload.reviewNote }
                : {}),
        },
    });

    return updated;
};
const approveAndCreate = async (
    questionId: string,
    payload: {
        subjectId?: string;
        categoryId?: string | null;
        topicId?: string | null;
        tagIds?: string[];
    } = {},
    userId: string,
    isAdmin = false
) => {
    const extracted = await prisma.extractedQuestion.findUnique({
        where: { id: questionId },
        include: {
            pdfUpload: {
                select: {
                    id: true,
                    uploadedById: true,
                    subjectId: true,
                    examName: true,
                    year: true,
                },
            },
        },
    });

    if (!extracted) {
        throw new ApiError(httpStatus.NOT_FOUND, "Extracted question not found");
    }

    if (!isAdmin && extracted.pdfUpload.uploadedById !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
    }

    if (extracted.status === ReviewStatus.APPROVED) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Question is already approved"
        );
    }

    // questionText may be null on ExtractedQuestion
    if (!extracted.questionText || !extracted.questionText.trim()) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Extracted question has no valid question text"
        );
    }

    const options = Array.isArray(extracted.options)
        ? (extracted.options as Array<{
            key: string;
            text: string;
            isCorrect: boolean;
        }>)
        : [];

    if (options.length < 2) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Question must have at least 2 options"
        );
    }

    const correctKeys = options
        .filter((o) => o.isCorrect)
        .map((o) => o.key);

    const subjectId = payload.subjectId || extracted.pdfUpload.subjectId;

    if (!subjectId) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "subjectId is required to create question"
        );
    }

    const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { id: true },
    });

    if (!subject) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid subjectId");
    }

    if (payload.categoryId) {
        const category = await prisma.category.findUnique({
            where: { id: payload.categoryId },
            select: { id: true },
        });
        if (!category) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid categoryId");
        }
    }

    if (payload.topicId) {
        const topic = await prisma.topic.findUnique({
            where: { id: payload.topicId },
            select: { id: true },
        });
        if (!topic) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid topicId");
        }
    }

    const result = await prisma.$transaction(async (tx) => {
        const createdQuestion = await tx.question.create({
            data: {
                questionText: extracted.questionText!.trim(),
                // Bangla/Hindi optional — leave null if source is English only
                questionTextHi: null,
                explanation: extracted.explanation || null,
                explanationHi: null,
                difficulty: Object.values(Difficulty).includes(
                    extracted.difficulty as Difficulty
                )
                    ? (extracted.difficulty as Difficulty)
                    : Difficulty.MEDIUM,
                questionType:
                    (extracted.questionType as QuestionType) ||
                    QuestionType.SINGLE_CORRECT,
                marks: 1,
                negativeMarks: 0.25,
                isActive: true,
                isPreviousYear: Boolean(extracted.pdfUpload.year),
                year: extracted.pdfUpload.year ?? null,
                examName: extracted.pdfUpload.examName ?? null,
                source: "PDF_EXTRACTION",
                subjectId,
                categoryId: payload.categoryId ?? null,
                topicId: payload.topicId ?? null,
                createdById: userId,

                options: {
                    create: options.map((o, index) => ({
                        text: String(o.text || "").trim(),
                        textHi: null, // set later if you have Bangla option text
                        isCorrect: Boolean(o.isCorrect),
                        order: index, // 0, 1, 2, 3 ...
                    })),
                },
            },
            include: {
                options: true,
            },
        });

        const updatedExtracted = await tx.extractedQuestion.update({
            where: { id: questionId },
            data: {
                status: ReviewStatus.APPROVED,
                correctAnswers: correctKeys,
            },
        });

        return {
            question: createdQuestion,
            extracted: updatedExtracted,
        };
    });

    return {
        message: "Question approved and added to Question Bank",
        data: result,
    };
};

const getById = async (
    questionId: string,
    userId: string,
    isAdmin = false
) => {
    const question = await prisma.extractedQuestion.findUnique({
        where: { id: questionId },
        include: {
            pdfUpload: {
                select: {
                    id: true,
                    originalName: true,
                    uploadedById: true,
                    subjectId: true,
                    examName: true,
                    year: true,
                    status: true,
                },
            },
        },
    });

    if (!question) {
        throw new ApiError(httpStatus.NOT_FOUND, "Extracted question not found");
    }

    if (!isAdmin && question.pdfUpload.uploadedById !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
    }

    return question;
};

const getAllByPdfUpload = async (
    pdfUploadId: string,
    userId: string,
    isAdmin = false
) => {
    const pdf = await prisma.pdfUpload.findUnique({
        where: { id: pdfUploadId },
        select: { id: true, uploadedById: true },
    });

    if (!pdf) {
        throw new ApiError(httpStatus.NOT_FOUND, "PDF not found");
    }

    if (!isAdmin && pdf.uploadedById !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
    }

    return prisma.extractedQuestion.findMany({
        where: { pdfUploadId },
        orderBy: { createdAt: "asc" },
    });
};

export const ExtractedQuestionService = {
    updateStatus,
    approveAndCreate,
    getById,
    getAllByPdfUpload,
};