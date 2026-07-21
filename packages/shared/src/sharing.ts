import { z } from "zod";

export const locationPrecisionSchema = z.enum(["exact", "city"]);
export type LocationPrecision = z.infer<typeof locationPrecisionSchema>;

export const sharingStatusSchema = z.object({
  sharingPausedUntil: z.string().datetime().nullable(),
});
export type SharingStatus = z.infer<typeof sharingStatusSchema>;

export const pauseSharingDtoSchema = z.object({
  until: z.string().datetime(),
});
export type PauseSharingDto = z.infer<typeof pauseSharingDtoSchema>;

export const setPrecisionDtoSchema = z.object({
  precision: locationPrecisionSchema,
});
export type SetPrecisionDto = z.infer<typeof setPrecisionDtoSchema>;
