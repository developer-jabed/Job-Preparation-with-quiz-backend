import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import ApiError from "../errors/api.error.js";
import jwt from "jsonwebtoken";

// ── Known Fastify multipart error codes ─────────────────────────────────────
const MULTIPART_ERROR_CODES: Record<string, string> = {
  FST_REQ_FILE_TOO_LARGE: "Uploaded file exceeds the maximum allowed size",
  FST_FILES_LIMIT: "Too many files uploaded in a single request",
  FST_FIELDS_LIMIT: "Too many form fields in a single request",
  FST_PARTS_LIMIT: "Too many parts in the multipart request",
  FST_INVALID_MULTIPART_CONTENT_TYPE: "Request must use multipart/form-data content type",
};

const globalErrorHandler = (fastify: FastifyInstance): void => {
  fastify.setErrorHandler(
    (err: FastifyError | ApiError | ZodError | Error, request: FastifyRequest, reply: FastifyReply) => {
      fastify.log.error(err);

      let statusCode = 500;
      let message = "Something went wrong!";
      let error: unknown = null;

      // ── 1. Custom ApiError ───────────────────────────────────────────────
      if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
      }

      // ── 2. Zod Validation Error ──────────────────────────────────────────
      else if (err instanceof ZodError) {
        statusCode = 400;
        message = "Validation error";
        error = err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));
      }

      // ── 3. Fastify Schema Validation Error ───────────────────────────────
      else if ("validation" in err && err.validation) {
        statusCode = 400;
        message = "Validation error";
        error = err.validation;
      }

      // ── 4. Multipart / File Upload Errors ────────────────────────────────
      else if ("code" in err && typeof err.code === "string" && MULTIPART_ERROR_CODES[err.code]) {
        statusCode = err.code === "FST_REQ_FILE_TOO_LARGE" ? 413 : 400;
        message = MULTIPART_ERROR_CODES[err.code];
      }

      // ── 5. JWT Errors ────────────────────────────────────────────────────
      // ── 5. JWT Errors ────────────────────────────────────────────────────
      else if (err instanceof jwt.TokenExpiredError) {
        statusCode = 401;
        message = "Token has expired. Please login again.";
      } else if (err instanceof jwt.JsonWebTokenError) {
        statusCode = 401;
        message = "Invalid token. Please login again.";
      }

      // ── 6. Prisma Known Request Errors ───────────────────────────────────
      else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
          case "P2002": // Unique constraint
            statusCode = 409;
            message = "Record already exists";
            error = err.meta;
            break;
          case "P2003": // Foreign key constraint
            statusCode = 400;
            message = "Foreign key constraint failed";
            error = err.meta;
            break;
          case "P2025": // Record not found
            statusCode = 404;
            message = "Record not found";
            error = err.meta;
            break;
          case "P2023": // Inconsistent column data
            statusCode = 400;
            message = "Invalid data provided";
            error = err.meta;
            break;
          case "P1000":
            statusCode = 502;
            message = "Database authentication failed";
            break;
          case "P1001":
            statusCode = 503;
            message = "Can't reach database server";
            break;
          case "P1002":
            statusCode = 503;
            message = "Database server connection timeout";
            break;
          default:
            statusCode = 400;
            message = err.message;
            error = err.meta;
        }
      }

      // ── 7. Prisma Validation Error ───────────────────────────────────────
      else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = "Invalid data provided to database";
        error = err.message;
      }

      // ── 8. Prisma Unknown / Rust Panic / Initialization ──────────────────
      else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
        statusCode = 500;
        message = "Unknown database error occurred";
      } else if (err instanceof Prisma.PrismaClientRustPanicError) {
        statusCode = 500;
        message = "Database engine error occurred";
      } else if (err instanceof Prisma.PrismaClientInitializationError) {
        statusCode = 500;
        message = "Failed to initialize database connection";
      }

      // ── 9. Rate Limit Error (from @fastify/rate-limit) ───────────────────
      else if ("statusCode" in err && err.statusCode === 429) {
        statusCode = 429;
        message = "Too many requests. Please try again later.";
      }

      // ── 10. Generic Error that already has statusCode ────────────────────
      else if ("statusCode" in err && typeof err.statusCode === "number") {
        statusCode = err.statusCode;
        message = err.message || message;
      }

      // ── 11. Fallback for normal Error ────────────────────────────────────
      else if (err instanceof Error) {
        message = err.message || message;
      }

      // ── Don't leak sensitive info in production ──────────────────────────
      if (statusCode === 500 && process.env.NODE_ENV === "production") {
        error = null;
        message = "Internal server error";
      }

      reply.status(statusCode).send({
        success: false,
        message,
        ...(error ? { error } : {}),
      });
    }
  );
};

export default globalErrorHandler;