import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import type {
  IChangePasswordRequest,
  ILoginRequest,
  ILoginResponse,
  IRefreshTokenResponse,
  JwtPayload,
} from './auth.interface.js';
import { prisma } from '../../shared/prisma.js';
import ApiError from '../../errors/api.error.js';
import { jwtHelpers } from '../../helper/jwtHelper.js';
import config from '../../config/index.js';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_TTL_SECONDS,
  refreshTokenRedisKey,
} from './auth.constant.js';
import { redis } from '../../shared/redis.js';

const loginUser = async (payload: ILoginRequest): Promise<ILoginResponse> => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.isActive) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Your account has been deactivated');
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }

  const jwtPayload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt.access_secret as string,
    ACCESS_TOKEN_EXPIRES_IN
  );
  const refreshToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt.refresh_secret as string,
    REFRESH_TOKEN_EXPIRES_IN
  );

  // Record this refresh token in Redis so it can be checked on refresh and
  // revoked on logout. Without this, any refresh token stays valid for its
  // full 2-year JWT lifetime no matter what logout does.
  await redis.set(refreshTokenRedisKey(refreshToken), user.id, 'EX', REFRESH_TOKEN_TTL_SECONDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token: string): Promise<IRefreshTokenResponse> => {
  let decoded: JwtPayload;

  try {
    decoded = jwtHelpers.verifyToken(token, config.jwt.refresh_secret as string);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired refresh token');
  }

  // Confirms this exact token hasn't been revoked (logged out, rotated,
  // or manually invalidated) even though its JWT signature is still valid.
  const storedUserId = await redis.get(refreshTokenRedisKey(token));

  if (!storedUserId || storedUserId !== decoded.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token has been revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.isActive) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Your account has been deactivated');
  }

  const jwtPayload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt.access_secret as string,
    ACCESS_TOKEN_EXPIRES_IN
  );

  return { accessToken };
};

// Called from the controller's logout handler. Deleting the Redis record
// is what actually revokes the token — clearing the cookie alone (the
// original implementation) does nothing if the token leaked elsewhere.
const logoutUser = async (token: string | undefined): Promise<void> => {
  if (!token) return;
  await redis.del(refreshTokenRedisKey(token));
};

const changePassword = async (
  userPayload: JwtPayload,
  payload: IChangePasswordRequest
): Promise<void> => {
  const { oldPassword, newPassword } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userPayload.id },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const isPasswordMatched = await bcrypt.compare(oldPassword, user.password);

  if (!isPasswordMatched) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Old password is incorrect');
  }

  const isSameAsOld = await bcrypt.compare(newPassword, user.password);
  if (isSameAsOld) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'New password cannot be the same as the old password'
    );
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
    },
  });
};

const getMe = async (userPayload: JwtPayload) => {
  const user = await prisma.user.findUnique({
    where: { id: userPayload.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatar: true,
      preferredLanguage: true,
      isEmailVerified: true,
      isActive: true,
      streakDays: true,
      lastActiveAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user;
};

export const AuthService = {
  loginUser,
  refreshToken,
  logoutUser,
  changePassword,
  getMe,
};