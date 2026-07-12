import { z } from "zod";
import { publicUserSchema } from "./user";

export const circleRoleSchema = z.enum(["owner", "member"]);
export type CircleRole = z.infer<typeof circleRoleSchema>;

export const circleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  inviteCode: z.string().length(8),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type Circle = z.infer<typeof circleSchema>;

export const circleMemberSchema = z.object({
  circleId: z.string().uuid(),
  userId: z.string().uuid(),
  role: circleRoleSchema,
  joinedAt: z.string().datetime(),
  user: publicUserSchema,
});
export type CircleMember = z.infer<typeof circleMemberSchema>;

export const createCircleDtoSchema = z.object({
  name: z.string().min(1).max(80),
});
export type CreateCircleDto = z.infer<typeof createCircleDtoSchema>;

export const joinCircleDtoSchema = z.object({
  inviteCode: z.string().length(8),
});
export type JoinCircleDto = z.infer<typeof joinCircleDtoSchema>;
