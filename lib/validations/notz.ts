import { z } from "zod";

const notzNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .refine((val) => !/\s/.test(val), "Name cannot contain spaces");

const fieldTypeSchema = z.enum([
  "board",
  "label",
  "text",
  "number",
  "rating",
  "checkbox",
  "date",
  "tag",
  "image",
  "link",
  "list",
]);

const boardCardSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1),
});

const boardValueSchema = z.object({
  todo: z.array(boardCardSchema),
  inProgress: z.array(boardCardSchema),
  done: z.array(boardCardSchema),
});

export const notzFieldSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().trim(),
    type: fieldTypeSchema,
    max: z.number().int().min(2).max(10).optional(),
    options: z.array(z.string().trim().min(1)).optional(),
    checkable: z.boolean().optional(),
    row: z.number().int().min(0).optional(),
    column: z.number().int().min(0).optional(),
    value: z
      .union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string()),
        z.array(
          z.object({
            text: z.string(),
            completed: z.boolean(),
          })
        ),
        boardValueSchema,
        z.null(),
      ])
      .optional(),
  })
  .refine(
    (field) => field.type === "image" || field.type === "label" || field.label.length > 0,
    { message: "Label is required", path: ["label"] }
  );

export const createNotzSchema = z.object({
  name: notzNameSchema,
  featured: z.boolean(),
  fields: z.array(notzFieldSchema),
});

export const updateNotzSchema = z.object({
  id: z.string().min(1, "Notz id is required"),
  name: notzNameSchema,
  featured: z.boolean(),
  fields: z.array(notzFieldSchema).optional(),
});

export const updateNotzFieldsSchema = z.object({
  id: z.string().min(1, "Notz id is required"),
  fields: z.array(notzFieldSchema),
});

export const deleteNotzSchema = z.object({
  id: z.string().min(1, "Notz id is required"),
});

