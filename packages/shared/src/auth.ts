import { z } from "zod";
import { publicUserSchema } from "./user";

export const registerDtoSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type RegisterDto = z.infer<typeof registerDtoSchema>;

export const loginDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});
export type LoginDto = z.infer<typeof loginDtoSchema>;

export const refreshDtoSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDto = z.infer<typeof refreshDtoSchema>;

export const forgotPasswordDtoSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordDtoSchema>;

export const resetPasswordDtoSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(200),
});
export type ResetPasswordDto = z.infer<typeof resetPasswordDtoSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const authResponseSchema = z.object({
  user: publicUserSchema,
  tokens: authTokensSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
