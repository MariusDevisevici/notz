import { z } from "zod";
import {
	createNotzSchema,
	deleteNotzSchema,
	updateNotzSchema,
} from "@/lib/validations/notz";

export const MAX_FEATURED_NOTZ = 3;

export type CreateNotzInput = z.infer<typeof createNotzSchema>;
export type UpdateNotzInput = z.infer<typeof updateNotzSchema>;
export type DeleteNotzInput = z.infer<typeof deleteNotzSchema>;

export interface ManageNotzItem {
	id: string;
	name: string;
	featured: boolean;
}
