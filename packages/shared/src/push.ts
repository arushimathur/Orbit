import { z } from "zod";

export const updatePushTokenDtoSchema = z.object({
  pushToken: z.string().min(1),
});
export type UpdatePushTokenDto = z.infer<typeof updatePushTokenDtoSchema>;
