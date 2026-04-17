"use client";

import { useState, useCallback, useTransition, useRef, useEffect, useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DotsSixVerticalIcon,
  TextAaIcon,
  HashIcon,
  StarIcon,
  CheckSquareIcon,
  CalendarIcon,
  TagIcon,
  ImageIcon,
  LinkIcon,
  ListBulletsIcon,
  FloppyDiskIcon,
  CheckIcon,
  PencilSimpleIcon,
  ArrowsOutLineHorizontalIcon,
  ArrowsInLineHorizontalIcon,
} from "@phosphor-icons/react";
import type { NotzField, FieldType, FieldRow } from "@/lib/models/notz";
import { FIELD_TYPE_LABELS, groupFieldsIntoRows, flattenRows } from "@/lib/models/notz";
import { updateNotzFields } from "@/app/actions/notz-actions";
import { FieldInput } from "./field-inputs";

const noop = () => {};

const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  text: <TextAaIcon weight="bold" className="size-4" />,
  number: <HashIcon weight="bold" className="size-4" />,
  rating: <StarIcon weight="bold" className="size-4" />,
  checkbox: <CheckSquareIcon weight="bold" className="size-4" />,
  date: <CalendarIcon weight="bold" className="size-4" />,
  tag: <TagIcon weight="bold" className="size-4" />,
  image: <ImageIcon weight="bold" className="size-4" />,
  link: <LinkIcon weight="bold" className="size-4" />,
  list: <ListBulletsIcon weight="bold" className="size-4" />,
};

interface NotzWorkspaceProps {
  notzId: string;
  notzName: string;
  featured: boolean;
  initialFields: NotzField[];
}

export function NotzWorkspace({
  notzId,
  notzName,
  featured,
  initialFields,
}: NotzWorkspaceProps) {
  const [rows, setRows] = useState<FieldRow[]>(() => groupFieldsIntoRows(initialFields));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveVersion, setSaveVersion] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const savedTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const allFields = useMemo(() => rows.flatMap((r) => r.fields), [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateFieldValue = useCallback((fieldId: string, value: NotzField["value"]) => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        fields: row.fields.map((f) => (f.id === fieldId ? { ...f, value } : f)),
      }))
    );
    setDirty(true);
    setSaved(false);
  }, []);

  const findFieldLocation = useCallback((fieldId: string, currentRows: FieldRow[]) => {
    for (let ri = 0; ri < currentRows.length; ri++) {
      const ci = currentRows[ri].fields.findIndex((f) => f.id === fieldId);
      if (ci !== -1) return { rowIndex: ri, colIndex: ci };
    }
    return null;
  }, []);

  // Merge field with the row above (make side-by-side)
  const mergeWithRowAbove = useCallback((fieldId: string) => {
    setRows((prev) => {
      const loc = findFieldLocation(fieldId, prev);
      if (!loc || loc.rowIndex === 0) return prev;

      const field = prev[loc.rowIndex].fields[loc.colIndex];
      const sourceRow = prev[loc.rowIndex];
      const targetRowIndex = loc.rowIndex - 1;

      const newRows = [...prev];
      // Add field to end of target row
      newRows[targetRowIndex] = {
        ...newRows[targetRowIndex],
        fields: [...newRows[targetRowIndex].fields, field],
      };
      // Remove from source row
      const remaining = sourceRow.fields.filter((f) => f.id !== fieldId);
      if (remaining.length === 0) {
        newRows.splice(loc.rowIndex, 1);
      } else {
        newRows[loc.rowIndex] = { ...sourceRow, fields: remaining };
      }
      return newRows;
    });
    setDirty(true);
    setSaved(false);
  }, [findFieldLocation]);

  // Split field into its own row below
  const splitToOwnRow = useCallback((fieldId: string) => {
    setRows((prev) => {
      const loc = findFieldLocation(fieldId, prev);
      if (!loc) return prev;
      const sourceRow = prev[loc.rowIndex];
      if (sourceRow.fields.length <= 1) return prev; // already alone

      const field = sourceRow.fields[loc.colIndex];
      const newRows = [...prev];
      newRows[loc.rowIndex] = {
        ...sourceRow,
        fields: sourceRow.fields.filter((f) => f.id !== fieldId),
      };
      // Insert new row after current
      newRows.splice(loc.rowIndex + 1, 0, {
        rowIndex: 0,
        fields: [field],
      });
      return newRows;
    });
    setDirty(true);
    setSaved(false);
  }, [findFieldLocation]);

  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // First try pointer within
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    // Fallback to rect intersection
    return rectIntersection(args);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeFieldId = active.id as string;
    const overId = over.id as string;

    if (activeFieldId === overId) return;

    // Determine if pointer is on the left/right edge of the target (merge zone)
    const overRect = over.rect;
    const activeTranslated = active.rect.current.translated;
    let isMergeZone = false;
    if (overRect && activeTranslated) {
      const activeCenterX = activeTranslated.left + activeTranslated.width / 2;
      const edgeThreshold = overRect.width * 0.25;
      isMergeZone =
        activeCenterX < overRect.left + edgeThreshold ||
        activeCenterX > overRect.left + overRect.width - edgeThreshold;
    }

    setRows((prev) => {
      const activeLoc = findFieldLocation(activeFieldId, prev);
      if (!activeLoc) return prev;

      // Check if over is a field
      const overLoc = findFieldLocation(overId, prev);
      if (!overLoc) {
        // over might be a row container id like "row-0"
        const rowMatch = overId.match(/^row-(\d+)$/);
        if (!rowMatch) return prev;
        const targetRowIdx = Number(rowMatch[1]);
        if (targetRowIdx === activeLoc.rowIndex) return prev;
        if (targetRowIdx >= prev.length) return prev;

        // move field to target row
        const field = prev[activeLoc.rowIndex].fields[activeLoc.colIndex];
        const newRows = prev.map((r, i) => {
          if (i === activeLoc.rowIndex) {
            return { ...r, fields: r.fields.filter((f) => f.id !== activeFieldId) };
          }
          if (i === targetRowIdx) {
            return { ...r, fields: [...r.fields, field] };
          }
          return r;
        }).filter((r) => r.fields.length > 0);

        return newRows;
      }

      // Same row, same position — no-op
      if (activeLoc.rowIndex === overLoc.rowIndex && activeLoc.colIndex === overLoc.colIndex) {
        return prev;
      }

      // Both are fields — if in same row, just reorder within row
      if (activeLoc.rowIndex === overLoc.rowIndex) {
        const row = prev[activeLoc.rowIndex];
        const newFields = [...row.fields];
        const [moved] = newFields.splice(activeLoc.colIndex, 1);
        newFields.splice(overLoc.colIndex, 0, moved);
        return prev.map((r, i) =>
          i === activeLoc.rowIndex ? { ...r, fields: newFields } : r
        );
      }

      // Different rows
      const sourceRow = prev[activeLoc.rowIndex];
      const targetRow = prev[overLoc.rowIndex];

      // If dragged to the left/right edge → merge (place side by side)
      if (isMergeZone) {
        const field = sourceRow.fields[activeLoc.colIndex];
        const newRows = prev.map((r, i) => {
          if (i === activeLoc.rowIndex) {
            return { ...r, fields: r.fields.filter((f) => f.id !== activeFieldId) };
          }
          if (i === overLoc.rowIndex) {
            const newFields = [...r.fields];
            newFields.splice(overLoc.colIndex, 0, field);
            return { ...r, fields: newFields };
          }
          return r;
        }).filter((r) => r.fields.length > 0);
        return newRows;
      }

      // Dragged to center → reorder rows (move source row to target position)
      if (sourceRow.fields.length === 1) {
        const newRows = [...prev];
        const [moved] = newRows.splice(activeLoc.rowIndex, 1);
        newRows.splice(overLoc.rowIndex, 0, moved);
        return newRows;
      }

      // Source is multi-field row: extract field into its own row at target position
      const field = sourceRow.fields[activeLoc.colIndex];
      const newRows = prev
        .map((r, i) => {
          if (i === activeLoc.rowIndex) {
            return { ...r, fields: r.fields.filter((f) => f.id !== activeFieldId) };
          }
          return r;
        })
        .filter((r) => r.fields.length > 0);
      // Find where the target row ended up after possible removal
      const newTargetIdx = newRows.findIndex((r) =>
        r.fields.some((f) => f.id === overId)
      );
      const insertIdx = newTargetIdx !== -1 ? newTargetIdx : newRows.length;
      newRows.splice(insertIdx, 0, { rowIndex: 0, fields: [field] });
      return newRows;
    });
  }, [findFieldLocation]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Final position is already set by handleDragOver
    setDirty(true);
    setSaved(false);
  }, []);

  const save = () => {
    const flatFields = flattenRows(rows);
    startTransition(async () => {
      const result = await updateNotzFields({ id: notzId, fields: flatFields });
      if ("success" in result && result.success) {
        setDirty(false);
        setSaved(true);
        setSaveVersion((current) => current + 1);
        if (savedTimeout.current) clearTimeout(savedTimeout.current);
        savedTimeout.current = setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  useEffect(() => {
    return () => {
      if (savedTimeout.current) clearTimeout(savedTimeout.current);
    };
  }, []);

  const activeField = useMemo(
    () => (activeId ? allFields.find((f) => f.id === activeId) ?? null : null),
    [activeId, allFields]
  );

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:gap-6">
      {/* Header */}
      <div className="neo-panel flex flex-col gap-3 bg-card p-4 shadow-[4px_4px_0_0_var(--color-foreground)] sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:shadow-[6px_6px_0_0_var(--color-foreground)]">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black uppercase tracking-[0.18em] text-foreground sm:text-3xl">
            {notzName}
          </h1>
          {featured && (
            <span className="inline-flex shrink-0 items-center border-2 border-foreground bg-primary px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-primary-foreground">
              ★ Featured
            </span>
          )}
        </div>
        {allFields.length > 0 && (
          <button
            type="button"
            onClick={save}
            disabled={isPending || !dirty}
            className={`inline-flex w-full items-center justify-center gap-2 border-3 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition-colors disabled:opacity-50 sm:w-auto ${
              saved
                ? "border-foreground bg-secondary text-foreground"
                : dirty
                  ? "border-foreground bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-foreground bg-background text-foreground"
            }`}
          >
            {isPending ? (
              "Saving…"
            ) : saved ? (
              <>
                <CheckIcon weight="bold" className="size-4" />
                Saved
              </>
            ) : (
              <>
                <FloppyDiskIcon weight="bold" className="size-4" />
                Save
              </>
            )}
          </button>
        )}
      </div>

      {/* Fields */}
      {allFields.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-3 sm:gap-4">
            {rows.map((row, rowIdx) => (
              <SortableRow
                key={row.fields[0]?.id ?? `row-${rowIdx}`}
                row={row}
                rowIdx={rowIdx}
                totalRows={rows.length}
                onValueChange={updateFieldValue}
                onMergeUp={mergeWithRowAbove}
                onSplitOut={splitToOwnRow}
                disabled={isPending}
                saveVersion={saveVersion}
              />
            ))}
          </div>
          <DragOverlay>
            {activeField ? (
              <div className="neo-panel bg-card opacity-80 shadow-[8px_8px_0_0_var(--color-foreground)]">
                <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
                  <span className="inline-flex items-center gap-1.5 text-foreground/50">
                    {FIELD_ICONS[activeField.type]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-black uppercase tracking-[0.14em] text-foreground">
                    {activeField.label}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="neo-panel bg-card p-6 text-center shadow-[4px_4px_0_0_var(--color-foreground)] sm:p-10 sm:shadow-[6px_6px_0_0_var(--color-foreground)]">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-foreground/60">
            No fields defined for this notz yet.
          </p>
        </div>
      )}
    </section>
  );
}

interface SortableRowProps {
  row: FieldRow;
  rowIdx: number;
  totalRows: number;
  onValueChange: (fieldId: string, value: NotzField["value"]) => void;
  onMergeUp: (fieldId: string) => void;
  onSplitOut: (fieldId: string) => void;
  disabled?: boolean;
  saveVersion: number;
}

function SortableRow({
  row,
  rowIdx,
  totalRows,
  onValueChange,
  onMergeUp,
  onSplitOut,
  disabled,
  saveVersion,
}: SortableRowProps) {
  const isMultiField = row.fields.length > 1;

  if (!isMultiField) {
    // Single field row — render like before, no extra wrapper needed
    const field = row.fields[0];
    return (
      <SortableFieldCard
        key={field.id}
        field={field}
        onValueChange={(value) => onValueChange(field.id, value)}
        disabled={disabled}
        saveVersion={saveVersion}
        canMergeUp={rowIdx > 0}
        canSplitOut={false}
        onMergeUp={() => onMergeUp(field.id)}
        onSplitOut={noop}
        isInRow={false}
      />
    );
  }

  // Multi-field row — render fields side by side
  return (
    <SortableContext
      items={row.fields.map((f) => f.id)}
      strategy={horizontalListSortingStrategy}
    >
      <div
        id={`row-${rowIdx}`}
        className="flex flex-col gap-3 sm:flex-row sm:gap-4"
      >
        {row.fields.map((field) => (
          <SortableFieldCard
            key={field.id}
            field={field}
            onValueChange={(value) => onValueChange(field.id, value)}
            disabled={disabled}
            saveVersion={saveVersion}
            canMergeUp={false}
            canSplitOut={true}
            onMergeUp={() => onMergeUp(field.id)}
            onSplitOut={() => onSplitOut(field.id)}
            isInRow={true}
          />
        ))}
      </div>
    </SortableContext>
  );
}

interface SortableFieldCardProps {
  field: NotzField;
  onValueChange: (value: NotzField["value"]) => void;
  disabled?: boolean;
  saveVersion: number;
  canMergeUp: boolean;
  canSplitOut: boolean;
  onMergeUp: () => void;
  onSplitOut: () => void;
  isInRow: boolean;
}

function SortableFieldCard({
  field,
  onValueChange,
  disabled,
  saveVersion,
  canMergeUp,
  canSplitOut,
  onMergeUp,
  onSplitOut,
  isInRow,
}: SortableFieldCardProps) {
  const [isImageEditing, setIsImageEditing] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    setIsImageEditing(false);
  }, [saveVersion]);

  const mergeButton = canMergeUp && (
    <button
      type="button"
      onClick={onMergeUp}
      disabled={disabled}
      className="inline-flex items-center justify-center p-1 text-foreground/40 transition-colors hover:text-foreground disabled:opacity-30"
      aria-label="Merge with row above"
      title="Place next to field above"
    >
      <ArrowsInLineHorizontalIcon weight="bold" className="size-4" />
    </button>
  );

  const splitButton = canSplitOut && (
    <button
      type="button"
      onClick={onSplitOut}
      disabled={disabled}
      className="inline-flex items-center justify-center p-1 text-foreground/40 transition-colors hover:text-foreground disabled:opacity-30"
      aria-label="Move to own row"
      title="Move to its own row"
    >
      <ArrowsOutLineHorizontalIcon weight="bold" className="size-4" />
    </button>
  );

  if (field.type === "image") {
    const imageValue = typeof field.value === "string" ? field.value : "";

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`neo-panel overflow-hidden bg-card shadow-[4px_4px_0_0_var(--color-foreground)] sm:shadow-[6px_6px_0_0_var(--color-foreground)] ${
          isInRow ? "flex-1 min-w-0" : ""
        } ${
          isDragging ? "z-50 opacity-90 shadow-[8px_8px_0_0_var(--color-foreground)]" : ""
        }`}
      >
        <div className="relative">
          <div className="absolute left-2 top-2 z-10 flex gap-1">
            <button
              type="button"
              className="inline-flex items-center justify-center border-2 border-foreground bg-card p-1 text-foreground/60 transition-colors hover:text-foreground"
              {...attributes}
              {...listeners}
              aria-label={`Reorder ${field.label}`}
            >
              <DotsSixVerticalIcon weight="bold" className="size-4" />
            </button>
            {mergeButton}
            {splitButton}
          </div>
          <button
            type="button"
            onClick={() => setIsImageEditing((current) => !current)}
            disabled={disabled}
            className="absolute right-2 top-2 z-10 inline-flex items-center justify-center border-2 border-foreground bg-card p-1 text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
            aria-label={`${isImageEditing ? "Close" : "Edit"} image ${field.label}`}
          >
            <PencilSimpleIcon weight="bold" className="size-4" />
          </button>

          {imageValue ? (
            <div className="bg-background p-2 sm:p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageValue}
                alt={field.label}
                className="max-h-128 w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center bg-muted px-4 py-12 text-center">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/45">
                Add an image for {field.label}
              </span>
            </div>
          )}
        </div>

        {isImageEditing && (
          <div className="border-t-2 border-foreground/20 px-3 py-3 sm:px-4 sm:py-4">
            <FieldInput
              field={field}
              onChange={onValueChange}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`neo-panel bg-card shadow-[4px_4px_0_0_var(--color-foreground)] sm:shadow-[6px_6px_0_0_var(--color-foreground)] ${
        isInRow ? "flex-1 min-w-0" : ""
      } ${
        isDragging ? "z-50 opacity-90 shadow-[8px_8px_0_0_var(--color-foreground)]" : ""
      }`}
    >
      {/* Field header */}
      <div className="flex items-center gap-2 border-b-2 border-foreground/20 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none p-1 text-foreground/40 transition-colors hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${field.label}`}
        >
          <DotsSixVerticalIcon weight="bold" className="size-5" />
        </button>
        <span className="inline-flex items-center gap-1.5 text-foreground/50">
          {FIELD_ICONS[field.type]}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-black uppercase tracking-[0.14em] text-foreground">
          {field.label}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {mergeButton}
          {splitButton}
          <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-widest text-foreground/40">
            {FIELD_TYPE_LABELS[field.type]}
          </span>
        </div>
      </div>

      {/* Field input */}
      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <FieldInput
          field={field}
          onChange={onValueChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
