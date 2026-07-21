import { z } from "zod";
import { publicUserSchema } from "./user";
import { locationPrecisionSchema } from "./sharing";

export const circleRoleSchema = z.enum(["owner", "member"]);
export type CircleRole = z.infer<typeof circleRoleSchema>;

// Invite codes are derived from the circle name where possible (e.g. "Mathur Family" ->
// "MATHUR"), falling back to a random 8-character code -- so length varies.
const inviteCodeSchema = z.string().min(4).max(12);

export const circleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  inviteCode: inviteCodeSchema,
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type Circle = z.infer<typeof circleSchema>;

export const circleMemberSchema = z.object({
  circleId: z.string().uuid(),
  userId: z.string().uuid(),
  role: circleRoleSchema,
  locationPrecision: locationPrecisionSchema,
  joinedAt: z.string().datetime(),
  user: publicUserSchema,
});
export type CircleMember = z.infer<typeof circleMemberSchema>;

export const createCircleDtoSchema = z.object({
  name: z.string().min(1).max(80),
  // Lets the client pin the exact code shown in the onboarding preview (including after
  // "regenerate") rather than risk the server deriving a different one at creation time.
  inviteCode: inviteCodeSchema.optional(),
});
export type CreateCircleDto = z.infer<typeof createCircleDtoSchema>;

export const joinCircleDtoSchema = z.object({
  inviteCode: inviteCodeSchema,
});
export type JoinCircleDto = z.infer<typeof joinCircleDtoSchema>;

// GET /circles/preview/:inviteCode -- unauthenticated preview shown before committing to
// join (deep-link landing screen). Same trust level as knowing the invite code itself.
export const circlePreviewSchema = z.object({
  name: z.string(),
  memberCount: z.number().int().nonnegative(),
  memberInitials: z.array(z.string()).max(3),
});
export type CirclePreview = z.infer<typeof circlePreviewSchema>;
