import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import config from "../../config/index.js";
import { calculatePagination } from "../../helper/paginationHelper.js";
import { fileUploader } from "../../helper/fileUploader.js";
import type { IPaginationOptions } from "../../interfaces/pagination.js";
import type { ILearnerFilterRequest } from "./learner.interface.js";
import { learnerSearchableFields } from "./learner.constant.js";
import type { UploadedFile } from "../../helper/fileUploader.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ── Reusable avatar upload ────────────────────────────────────────────────
const uploadLearnerAvatar = async (file: UploadedFile): Promise<string> => {
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

  let mimetype = file.mimetype;

  // Enhanced detection for octet-stream
  if (mimetype === "application/octet-stream" || !mimetype) {
    const ext = file.filename.split(".").pop()?.toLowerCase();
    const extToMime: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    mimetype = extToMime[ext || ""] || mimetype;
  }

  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}. Received: ${mimetype}`
    );
  }

  if (file.buffer.length > MAX_FILE_SIZE) {
    throw new ApiError(httpStatus.BAD_REQUEST, "File size exceeds 5MB limit");
  }

  try {
    const result = await fileUploader.uploadToCloudinary(
      {
        buffer: file.buffer,
        filename: file.filename,
        mimetype,
      },
      "learners/avatars"
    );
    return result.secure_url;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to upload avatar");
  }
};

// ── Extract Cloudinary public_id ──────────────────────────────────────────
const extractPublicId = (url: string): string | null => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : null;
};

// ── Create Learner ────────────────────────────────────────────────────────
const createLearner = async (
  payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  },
  file?: UploadedFile
) => {
  const isExist = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (isExist) {
    throw new ApiError(httpStatus.CONFLICT, "Email already exists");
  }

  let avatarUrl: string | undefined;

  if (file) {
    avatarUrl = await uploadLearnerAvatar(file);
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcrypt_salt_rounds
  );

  try {
    const result = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password: hashedPassword,
        role: Role.LEARNER,
        avatar: avatarUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        preferredLanguage: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    return result;
  } catch (error) {
    // Rollback: delete uploaded image if DB fails
    if (avatarUrl) {
      const publicId = extractPublicId(avatarUrl);
      if (publicId) {
        await fileUploader.deleteFromCloudinary(publicId).catch(() => {});
      }
    }
    throw error;
  }
};

// ── Get All Learners ──────────────────────────────────────────────────────
const getAllLearners = async (
  filters: ILearnerFilterRequest,
  options: IPaginationOptions
) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.UserWhereInput[] = [{ role: Role.LEARNER }];

  if (searchTerm) {
    andConditions.push({
      OR: learnerSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.entries(filterData).map(([key, value]) => {
        if (key === "isActive" || key === "isEmailVerified") {
          return { [key]: value === "true" || value === true };
        }
        return { [key]: value };
      }),
    });
  }

  const whereCondition: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [result, total] = await Promise.all([
    prisma.user.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        preferredLanguage: true,
        isEmailVerified: true,
        isActive: true,
        streakDays: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where: whereCondition }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// ── Get Single Learner ────────────────────────────────────────────────────
const getSingleLearner = async (id: string) => {
  const result = await prisma.user.findUnique({
    where: {
      id,
      role: Role.LEARNER,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatar: true,
      preferredLanguage: true,
      isEmailVerified: true,
      isActive: true,
      streakDays: true,
      lastActiveAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Learner not found");
  }

  return result;
};

// ── Update Learner ────────────────────────────────────────────────────────
const updateLearner = async (
  id: string,
  payload: {
    name?: string;
    phone?: string | null;
    preferredLanguage?: string;
    isActive?: boolean;
  },
  file?: UploadedFile
) => {
  const isExist = await prisma.user.findUnique({
    where: { id, role: Role.LEARNER },
  });

  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Learner not found");
  }

  let avatarUrl: string | undefined;

  if (file) {
    avatarUrl = await uploadLearnerAvatar(file);
  }

  try {
    const result = await prisma.user.update({
      where: { id },
      data: {
        ...payload,
        ...(avatarUrl && { avatar: avatarUrl }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        preferredLanguage: true,
        isEmailVerified: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Delete old avatar if new one uploaded
    if (avatarUrl && isExist.avatar) {
      const oldPublicId = extractPublicId(isExist.avatar);
      if (oldPublicId) {
        await fileUploader.deleteFromCloudinary(oldPublicId).catch(() => {});
      }
    }

    return result;
  } catch (error) {
    if (avatarUrl) {
      const publicId = extractPublicId(avatarUrl);
      if (publicId) {
        await fileUploader.deleteFromCloudinary(publicId).catch(() => {});
      }
    }
    throw error;
  }
};

// ── Delete Learner ────────────────────────────────────────────────────────
const deleteLearner = async (id: string) => {
  const isExist = await prisma.user.findUnique({
    where: { id, role: Role.LEARNER },
  });

  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Learner not found");
  }

  // Optional: delete avatar from Cloudinary
  if (isExist.avatar) {
    const publicId = extractPublicId(isExist.avatar);
    if (publicId) {
      await fileUploader.deleteFromCloudinary(publicId).catch(() => {});
    }
  }

  await prisma.user.delete({
    where: { id },
  });

  return null;
};

export const LearnerService = {
  createLearner,
  getAllLearners,
  getSingleLearner,
  updateLearner,
  deleteLearner,
};