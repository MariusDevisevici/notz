import { z } from "zod";
import {
	createNotzSchema,
	deleteNotzSchema,
	updateNotzSchema,
	updateNotzFieldsSchema,
	notzFieldSchema,
} from "@/lib/validations/notz";

export const MAX_FEATURED_NOTZ = 3;

export const FIELD_TYPES = [
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
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
	board: "Board",
	label: "Label",
	text: "Text",
	number: "Number",
	rating: "Rating",
	checkbox: "Checkbox",
	date: "Date",
	tag: "Tag / Select",
	image: "Image",
	link: "Link",
	list: "List",
};

export type NotzField = z.infer<typeof notzFieldSchema>;

export type CreateNotzInput = z.infer<typeof createNotzSchema>;
export type UpdateNotzInput = z.infer<typeof updateNotzSchema>;
export type UpdateNotzFieldsInput = z.infer<typeof updateNotzFieldsSchema>;
export type DeleteNotzInput = z.infer<typeof deleteNotzSchema>;

export interface ManageNotzItem {
	id: string;
	name: string;
	featured: boolean;
	fieldCount: number;
	fields: NotzField[];
}
