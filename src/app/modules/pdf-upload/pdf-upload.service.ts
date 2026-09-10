import httpStatus from "http-status";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import type { MultipartFile } from "@fastify/multipart";
import type { ICreatePdfUpload } from "./pdf-upload.interface.js";
import {
  PdfStatus,
  ReviewStatus,
  QuestionType,
  Difficulty,
} from "@prisma/client";
import { fileUploader } from "../../helper/fileUploader.js";
import { extractText } from "unpdf";
import axios from "axios";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ======================
// CONFIG
// ======================
const CONFIG = {
  MAX_CHUNK_LENGTH: 2200,
  QUESTIONS_PER_CHUNK: 4,
  CONCURRENCY: 2,
  MIN_TEXT_LENGTH: 80,
  FALLBACK_MODELS: [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "qwen/qwen3.8-27b",
  ],
};

const SYSTEM_PROMPT = `You are an expert competitive exam question extractor (Bank, SSC, Railway, UPSC, State PSC, Data Structures).

Extract ALL multiple choice questions from the given text.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "questionText": "clean question text without number prefix",
      "options": [
        { "key": "A", "text": "option text", "isCorrect": false },
        { "key": "B", "text": "option text", "isCorrect": true },
        { "key": "C", "text": "option text", "isCorrect": false },
        { "key": "D", "text": "option text", "isCorrect": false }
      ],
      "explanation": "short explanation or null",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "questionType": "SINGLE_CORRECT",
      "confidence": 0.9
    }
  ]
}

STRICT RULES:
- Extract EVERY question you find. Do not stop early.
- Detect correct answers marked with ✓, Ans, Answer, Correct, etc.
- If correct answer is not found → set all isCorrect = false
- Clean question text (remove Q1., 1., numbers, extra spaces)
- Ignore headers, footers, page numbers, answer keys
- Return pure JSON only — no markdown, no extra text`;

// ======================
// HELPERS
// ======================

async function extractTextFromPdf(fileUrl: string): Promise<string> {
  console.log("📥 [PDF] Downloading:", fileUrl);

  try {
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: 45000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PDF-Extractor/1.0)",
      },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    console.log("✅ [PDF] Downloaded | Size:", response.data.byteLength, "bytes");

    const pdfBuffer = new Uint8Array(response.data);
    const result = await extractText(pdfBuffer, { mergePages: true });
    const text = (result.text || "").replace(/\s+/g, " ").trim();

    console.log("📄 [PDF] Text length:", text.length);
    return text;
  } catch (err: any) {
    console.error("❌ [PDF] Failed:", err.response?.status, err.message);

    if (err.response?.status === 401) {
      throw new Error(
        "Cloudinary 401 – File is private. Re-upload with access_mode: public"
      );
    }
    if (err.response?.status === 404) {
      throw new Error("PDF not found on Cloudinary (404)");
    }
    throw new Error(`PDF download/extract failed: ${err.message}`);
  }
}

/**
 * Industry-standard chunking:
 * 1. Prefer splitting by question numbers (Q1., Q2. ...)
 * 2. Group 3-4 questions per chunk
 * 3. Fallback to paragraph splitting
 */
function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];

  // Split by question markers
  const questionBlocks = text
    .split(/(?=Q\d+\.|^\d+\.\s)/im)
    .map((b) => b.trim())
    .filter((b) => b.length > 40);

  if (questionBlocks.length >= 3) {
    let current = "";
    let count = 0;

    for (const block of questionBlocks) {
      if (
        count >= CONFIG.QUESTIONS_PER_CHUNK ||
        (current + "\n\n" + block).length > CONFIG.MAX_CHUNK_LENGTH
      ) {
        if (current.trim()) chunks.push(current.trim());
        current = block;
        count = 1;
      } else {
        current += (current ? "\n\n" : "") + block;
        count++;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  } else {
    // Fallback: paragraph based
    const paragraphs = text.split(/\n{2,}|\r\n{2,}/);
    let current = "";

    for (const para of paragraphs) {
      if ((current + "\n\n" + para).length > CONFIG.MAX_CHUNK_LENGTH) {
        if (current.trim()) chunks.push(current.trim());
        current = para;
      } else {
        current += (current ? "\n\n" : "") + para;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks.filter((c) => c.length > 50);
}

async function isDuplicateQuestion(
  questionText: string,
  tx: any
): Promise<boolean> {
  if (!questionText || questionText.length < 25) return false;

  const existing = await tx.question.findFirst({
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

async function processChunk(
  chunk: string,
  chunkIndex: number
): Promise<any[]> {
  console.log(
    `🤖 [Groq] Chunk ${chunkIndex + 1} | Length: ${chunk.length}`
  );

  let lastError: any = null;

  for (const model of CONFIG.FALLBACK_MODELS) {
    try {
      console.log(`   → Trying: ${model}`);

      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: chunk },
        ],
        model,
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content || "{}";
      let parsed: any;

      try {
        parsed = JSON.parse(content);
      } catch {
        console.warn(`   ⚠️ Invalid JSON from ${model}`);
        continue;
      }

      const questions = Array.isArray(parsed.questions)
        ? parsed.questions
        : [];

      console.log(`   ✅ ${model} → ${questions.length} questions`);
      return questions;
    } catch (err: any) {
      lastError = err;
      const msg = err.message || "";

      if (
        msg.includes("does not exist") ||
        msg.includes("model_not_found") ||
        msg.includes("decommissioned") ||
        err.status === 404 ||
        err.status === 400
      ) {
        console.warn(`   ⏭️  ${model} unavailable`);
        continue;
      }

      console.error(`   ❌ ${model}:`, msg);
      continue;
    }
  }

  console.error(
    `❌ All models failed for chunk ${chunkIndex + 1}:`,
    lastError?.message
  );
  return [];
}

// ======================
// SERVICE
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

  console.log("☁️ Uploaded to Cloudinary:", cloudinaryResult.secure_url);

  return prisma.pdfUpload.create({
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
};

const startAIExtraction = async (pdfId: string, userId: string) => {
  console.log("\n🚀 ========== AI EXTRACTION STARTED ==========");
  console.log("PDF ID:", pdfId);

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

    if (!rawText || rawText.length < CONFIG.MIN_TEXT_LENGTH) {
      throw new Error(
        "PDF has insufficient text. It may be scanned/image-only."
      );
    }

    console.log("📝 Sample:", rawText.substring(0, 250) + "...");

    // 2. Smart chunking
    const chunks = splitIntoChunks(rawText);
    console.log(`📦 Chunks created: ${chunks.length}`);

    if (chunks.length === 0) {
      throw new Error("Could not create processable chunks from PDF text");
    }

    // 3. Process in batches
    const allQuestions: any[] = [];

    for (let i = 0; i < chunks.length; i += CONFIG.CONCURRENCY) {
      const batch = chunks.slice(i, i + CONFIG.CONCURRENCY);

      const results = await Promise.all(
        batch.map((chunk, idx) => processChunk(chunk, i + idx))
      );

      results.forEach((qs) => allQuestions.push(...qs));

      console.log(
        `📊 Progress: ${Math.min(i + CONFIG.CONCURRENCY, chunks.length)}/${chunks.length}`
      );
    }

    console.log(`🎯 AI returned total: ${allQuestions.length} questions`);

    if (allQuestions.length === 0) {
      throw new Error(
        "No questions could be extracted. Check PDF format or Groq model access."
      );
    }

    // 4. Save
    let savedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const q of allQuestions) {
        if (
          !q.questionText ||
          !Array.isArray(q.options) ||
          q.options.length < 2
        ) {
          continue;
        }

        const normalizedOptions = q.options.map((opt: any, idx: number) => ({
          key: opt.key || String.fromCharCode(65 + idx),
          text: String(opt.text || "").trim(),
          isCorrect: Boolean(opt.isCorrect),
        }));

        const isDuplicate = await isDuplicateQuestion(q.questionText, tx);

        await tx.extractedQuestion.create({
          data: {
            pdfUploadId: pdfId,
            rawText: q.questionText,
            questionText: q.questionText.trim(),
            options: normalizedOptions,
            explanation: q.explanation || null,
            difficulty: Object.values(Difficulty).includes(q.difficulty)
              ? q.difficulty
              : Difficulty.MEDIUM,
            questionType: QuestionType.SINGLE_CORRECT,
            confidenceScore:
              typeof q.confidence === "number" ? q.confidence : 0.85,
            status: isDuplicate
              ? ReviewStatus.NEEDS_EDIT
              : ReviewStatus.PENDING,
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

    console.log(`💾 Saved ${savedCount} questions`);
    console.log("========== EXTRACTION COMPLETED ==========\n");

    return {
      success: true,
      message: `Successfully extracted ${savedCount} questions`,
      totalExtracted: savedCount,
      totalChunks: chunks.length,
    };
  } catch (error: any) {
    console.error("💥 EXTRACTION FAILED:", error.message);

    await prisma.pdfUpload.update({
      where: { id: pdfId },
      data: {
        status: PdfStatus.FAILED,
        errorMessage: error.message?.substring(0, 255) || "Extraction failed",
      },
    });

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "AI extraction failed"
    );
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

const getPdfById = async (
  id: string,
  userId?: string,
  isAdmin = false
) => {
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

const deletePdf = async (
  id: string,
  userId: string,
  isAdmin = false
) => {
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