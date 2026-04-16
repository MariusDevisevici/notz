import { z } from "zod";

const notzNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .refine((val) => !/\s/.test(val), "Name cannot contain spaces");

export const createNotzSchema = z.object({
  name: notzNameSchema,
  featured: z.boolean(),
});

export const updateNotzSchema = createNotzSchema.extend({
  id: z.string().min(1, "Notz id is required"),
});

export const deleteNotzSchema = z.object({
  id: z.string().min(1, "Notz id is required"),
});

