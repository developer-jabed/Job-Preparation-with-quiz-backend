import type { JwtPayload } from '../../helper/jwtHelper.js';

export type ILoginRequest = {
  email: string;
  password: string;
};

// Your User model has no `needPasswordChange` field — dropped from the
// sample. Add it back to both the schema and here if you want that flow.
export type ILoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export type IRefreshTokenResponse = {
  accessToken: string;
};

export type IChangePasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

export type { JwtPayload };