import { z } from "zod";

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;
