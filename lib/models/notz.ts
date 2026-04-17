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

export interface FieldRow {
	rowIndex: number;
	fields: NotzField[];
}

/**
 * Groups a flat field array into rows based on the `row` property.
 * Fields without a `row` value each get their own row.
 * Within each row, fields are sorted by `column`.
 */
export function groupFieldsIntoRows(fields: NotzField[]): FieldRow[] {
	const rows: FieldRow[] = [];
	let autoRow = 0;

	// First pass: determine the max explicit row so auto rows don't collide
	for (const f of fields) {
		if (f.row !== undefined && f.row >= autoRow) {
			autoRow = f.row + 1;
		}
	}

	const rowMap = new Map<number, NotzField[]>();
	const rowOrder: number[] = [];

	for (const field of fields) {
		const r = field.row ?? autoRow++;
		const fieldWithRow = field.row !== undefined ? field : { ...field, row: r, column: 0 };
		if (!rowMap.has(r)) {
			rowMap.set(r, []);
			rowOrder.push(r);
		}
		rowMap.get(r)!.push(fieldWithRow);
	}

	for (const r of rowOrder) {
		const rowFields = rowMap.get(r)!;
		rowFields.sort((a, b) => (a.column ?? 0) - (b.column ?? 0));
		rows.push({ rowIndex: r, fields: rowFields });
	}

	return rows;
}

/**
 * Flattens rows back into a flat field array with normalized row/column values.
 */
export function flattenRows(rows: FieldRow[]): NotzField[] {
	const result: NotzField[] = [];
	rows.forEach((row, rowIdx) => {
		row.fields.forEach((field, colIdx) => {
			result.push({ ...field, row: rowIdx, column: colIdx });
		});
	});
	return result;
}
