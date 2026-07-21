import { z } from "zod";

// Nicknames are private to the viewer: how *I* refer to a circle member, never shared
// with anyone else (including the person being nicknamed).
export const nicknameSchema = z.object({
  targetUserId: z.string().uuid(),
  nickname: z.string().min(1).max(40),
});
export type Nickname = z.infer<typeof nicknameSchema>;

export const setNicknameDtoSchema = z.object({
  nickname: z.string().min(1).max(40),
});
export type SetNicknameDto = z.infer<typeof setNicknameDtoSchema>;
