import { z } from "zod";

// Quiet hours are plain "HH:mm" (24h) strings compared against server UTC time -- no
// per-user timezone is stored yet, so this only suppresses push sends, not the in-app
// notification list. `notifyRunningLate` is stored/rendered but not wired to any real
// lateness detection (no such model exists yet), matching the design mockup default (off).
const quietHourSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .nullable();

export const notificationPreferencesSchema = z.object({
  notifyArrivals: z.boolean(),
  notifyLowBattery: z.boolean(),
  notifyRunningLate: z.boolean(),
  quietHoursStart: quietHourSchema,
  quietHoursEnd: quietHourSchema,
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const updateNotificationPreferencesDtoSchema = notificationPreferencesSchema.partial();
export type UpdateNotificationPreferencesDto = z.infer<typeof updateNotificationPreferencesDtoSchema>;

export const mutedMemberSchema = z.object({
  userId: z.string().uuid(),
});
export type MutedMember = z.infer<typeof mutedMemberSchema>;
