import httpStatus from "http-status";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import type { MultipartFile } from "@fastify/multipart";
import type { ICreatePdfUpload } from "./pdf-upload.interface.js";
import { PdfStatus, ReviewStatus, QuestionType, Difficulty } from "@prisma/client";
import { fileUploader } from "../../helper/fileUploader.js";
import { extractText } from "unpdf";
import axios from "axios";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


const SYSTEM_PROMPT = `You are an expert competitive exam question extractor (Bank, SSC, Railway, UPSC, State PSC).

Extract ALL multiple choice questions from the text.

Return ONLY valid JSON:
{
  "questions": [
    {
      "questionText": "clean question text without number",
      "options": [
        { "key": "A", "text": "option text", "isCorrect": false },
        { "key": "B", "text": "option text", "isCorrect": true }
      ],
      "explanation": "short explanation or null",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "questionType": "SINGLE_CORRECT",
      "suggestedSubject": "subject name or null",
      "suggestedCategory": "category name or null",
      "suggestedTopic": "topic name or null",
      "confidence": 0.9,
      "examName": "exam name or null",
      "year": 2024
    }
  ]
}

Rules:
- Detect correct answers (✓, Ans, Answer, etc.)
- If not found → all isCorrect = false
- Clean question text
- Ignore headers/footers/page numbers
- Return pure JSON only`;


async function extractTextFromPdf(fileUrl: string): Promise<string> {
  const response = await axios.get(fileUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
  });

  const pdfBuffer = new Uint8Array(response.data);
  const result = await extractText(pdfBuffer, { mergePages: true });

  return result.text.replace(/\s+/g, " ").trim();
}

function splitIntoChunks(text: string, maxLength = 3200): string[] {
  const chunks: string[] = [];
  let current = "";

  const paragraphs = text.split(/\n+/);

  for (const para of paragraphs) {
    if ((current + "\n" + para).length > maxLength) {
      if (current.trim()) chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n" : "") + para;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function isDuplicateQuestion(questionText: string): Promise<boolean> {
  if (!questionText || questionText.length < 25) return false;

  const existing = await prisma.question.findFirst({
    where: {
      questionText: {
        contains: questionText.substring(0, 55),
        mode: "insensitive",
      },
      deletedAt: null,
    },
    select: { id: true },
  });

  return !!existing;
}

// Process a single chunk with AI
async function processChunk(chunk: string): Promise<any[]> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: chunk },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.15,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch (err: any) {
    console.error("Chunk processing failed:", err.message);
    return [];
  }
}

// ======================
// MAIN SERVICE
// ======================
const uploadPdf = async (
  userId: string,
  file: MultipartFile,
  payload: ICreatePdfUpload
) => {
  const uploadedFile = await fileUploader.readFileBuffer(file);

  if (uploadedFile.mimetype !== "application/pdf") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Only PDF files are allowed");
  }

  const cloudinaryResult = await fileUploader.uploadToCloudinary(
    uploadedFile,
    "pdfs"
  );

  const pdfUpload = await prisma.pdfUpload.create({
    data: {
      originalName: uploadedFile.filename,
      fileUrl: cloudinaryResult.secure_url,
      fileSize: cloudinaryResult.bytes,
      status: PdfStatus.UPLOADED,
      subjectId: payload.subjectId,
      examName: payload.examName,
      year: payload.year,
      uploadedById: userId,
    },
    include: {
      subject: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return pdfUpload;
};

/**
 * FAST AI EXTRACTION with Parallel Batch Processing
 */
const startAIExtraction = async (pdfId: string, userId: string) => {
  const pdfRecord = await prisma.pdfUpload.findUnique({
    where: { id: pdfId },
  });

  if (!pdfRecord) {
    throw new ApiError(httpStatus.NOT_FOUND, "PDF not found");
  }

  if (pdfRecord.uploadedById !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized");
  }

  await prisma.pdfUpload.update({
    where: { id: pdfId },
    data: { status: PdfStatus.PROCESSING, errorMessage: null },
  });

  try {
    // 1. Extract text
    const rawText = await extractTextFromPdf(pdfRecord.fileUrl);

    if (!rawText || rawText.length < 80) {
      throw new Error("PDF has insufficient text");
    }

    // 2. Split into chunks
    const chunks = splitIntoChunks(rawText);
    console.log(`Total chunks: ${chunks.length}`);

    // 3. PARALLEL PROCESSING (Batch of 3 at a time) → Much faster
    const CONCURRENCY = 3;
    const allQuestions: any[] = [];

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const batch = chunks.slice(i, i + CONCURRENCY);

      const results = await Promise.all(batch.map((chunk) => processChunk(chunk)));

      for (const questions of results) {
        allQuestions.push(...questions);
      }

      console.log(`Processed batch ${Math.floor(i / CONCURRENCY) + 1}`);
    }

    if (allQuestions.length === 0) {
      throw new Error("No questions could be extracted");
    }

    // 4. Save questions
    let savedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const q of allQuestions) {
        if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2) {
          continue;
        }

        const isDuplicate = await isDuplicateQuestion(q.questionText);

        await tx.extractedQuestion.create({
          data: {
            pdfUploadId: pdfId,
            rawText: q.questionText,
            questionText: q.questionText,
            options: q.options,
            explanation: q.explanation || null,
            difficulty: Object.values(Difficulty).includes(q.difficulty)
              ? q.difficulty
              : Difficulty.MEDIUM,
            questionType: QuestionType.SINGLE_CORRECT,
            confidenceScore: q.confidence || 0.8,
            status: isDuplicate ? ReviewStatus.NEEDS_EDIT : ReviewStatus.PENDING,
            reviewNote: isDuplicate ? "Possible duplicate" : null,
            correctAnswers: [],
          },
        });

        savedCount++;
      }

      await tx.pdfUpload.update({
        where: { id: pdfId },
        data: {
          status: PdfStatus.EXTRACTED,
          pageCount: Math.ceil(rawText.length / 2800),
        },
      });
    });

    return {
      success: true,
      message: `Successfully extracted ${savedCount} questions`,
      totalExtracted: savedCount,
      totalChunks: chunks.length,
    };
  } catch (error: any) {
    await prisma.pdfUpload.update({
      where: { id: pdfId },
      data: {
        status: PdfStatus.FAILED,
        errorMessage: error.message?.substring(0, 255) || "Extraction failed",
      },
    });

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

const getAllPdfUploads = async (userId?: string, isAdmin = false) => {
  return prisma.pdfUpload.findMany({
    where: isAdmin ? undefined : { uploadedById: userId },
    orderBy: { createdAt: "desc" },
    include: {
      subject: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
      _count: { select: { extractedQuestions: true } },
    },
  });
};

const getPdfById = async (id: string, userId?: string, isAdmin = false) => {
  const pdf = await prisma.pdfUpload.findUnique({
    where: { id },
    include: {
      subject: true,
      uploadedBy: { select: { id: true, name: true, email: true } },
      extractedQuestions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!pdf) {
    throw new ApiError(httpStatus.NOT_FOUND, "PDF not found");
  }

  if (!isAdmin && pdf.uploadedById !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }

  return pdf;
};

const deletePdf = async (id: string, userId: string, isAdmin = false) => {
  const pdf = await prisma.pdfUpload.findUnique({ where: { id } });

  if (!pdf) {
    throw new ApiError(httpStatus.NOT_FOUND, "PDF not found");
  }

  if (!isAdmin && pdf.uploadedById !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }

  await prisma.pdfUpload.delete({ where: { id } });

  return { message: "PDF deleted successfully" };
};

export const PdfUploadService = {
  uploadPdf,
  startAIExtraction,
  getAllPdfUploads,
  getPdfById,
  deletePdf,
};