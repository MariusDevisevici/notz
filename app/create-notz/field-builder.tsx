"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
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
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusIcon,
  XIcon,
  ArrowsInLineHorizontalIcon,
  ArrowsOutLineHorizontalIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { NotzField, FieldType, FieldRow as FieldRowType } from "@/lib/models/notz";
import { FIELD_TYPES, FIELD_TYPE_LABELS, groupFieldsIntoRows, flattenRows } from "@/lib/models/notz";
import { compressImageFile } from "@/lib/utils/image-field";

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

function generateId() {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface FieldBuilderProps {
  fields: NotzField[];
  onChange: (fields: NotzField[]) => void;
  disabled?: boolean;
}

export function FieldBuilder({ fields, onChange, disabled }: FieldBuilderProps) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragRows, setDragRows] = useState<FieldRowType[] | null>(null);
  const dragRowsRef = useRef<FieldRowType[] | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const computedRows = useMemo(() => groupFieldsIntoRows(fields), [fields]);
  const rows = dragRows ?? computedRows;
  const allFields = useMemo(() => rows.flatMap((r) => r.fields), [rows]);
  const activeField = useMemo(
    () => (activeId ? allFields.find((f) => f.id === activeId) ?? null : null),
    [activeId, allFields]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const emitChange = useCallback((newRows: FieldRowType[]) => {
    onChangeRef.current(flattenRows(newRows));
  }, []);

  const findField = (fieldId: string, inRows?: FieldRowType[]) => {
    const source = inRows ?? rows;
    for (let ri = 0; ri < source.length; ri++) {
      const ci = source[ri].fields.findIndex((f) => f.id === fieldId);
      if (ci !== -1) return { rowIndex: ri, colIndex: ci };
    }
    return null;
  };

  const customCollision: CollisionDetection = useCallback((args) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) return pointer;
    return rectIntersection(args);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const currentRows = groupFieldsIntoRows(fields);
    setDragRows(currentRows);
    dragRowsRef.current = currentRows;
  }, [fields]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;
    if (draggedId === overId) return;

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

    setDragRows((prev) => {
      if (!prev) return prev;

      const activeLoc = (() => {
        for (let ri = 0; ri < prev.length; ri++) {
          const ci = prev[ri].fields.findIndex((f) => f.id === draggedId);
          if (ci !== -1) return { rowIndex: ri, colIndex: ci };
        }
        return null;
      })();
      const overLoc = (() => {
        for (let ri = 0; ri < prev.length; ri++) {
          const ci = prev[ri].fields.findIndex((f) => f.id === overId);
          if (ci !== -1) return { rowIndex: ri, colIndex: ci };
        }
        return null;
      })();

      if (!activeLoc || !overLoc) return prev;

      if (activeLoc.rowIndex === overLoc.rowIndex) {
        const row = prev[activeLoc.rowIndex];
        const newFields = [...row.fields];
        const [moved] = newFields.splice(activeLoc.colIndex, 1);
        newFields.splice(overLoc.colIndex, 0, moved);
        const result = prev.map((r, i) =>
          i === activeLoc.rowIndex ? { ...r, fields: newFields } : r
        );
        dragRowsRef.current = result;
        return result;
      }

      // Different rows
      const sourceRow = prev[activeLoc.rowIndex];
      const targetRow = prev[overLoc.rowIndex];

      // If dragged to the left/right edge → merge (place side by side)
      if (isMergeZone) {
        const field = sourceRow.fields[activeLoc.colIndex];
        const result = prev
          .map((r, i) => {
            if (i === activeLoc.rowIndex) {
              return { ...r, fields: r.fields.filter((f) => f.id !== draggedId) };
            }
            if (i === overLoc.rowIndex) {
              const newFields = [...r.fields];
              newFields.splice(overLoc.colIndex, 0, field);
              return { ...r, fields: newFields };
            }
            return r;
          })
          .filter((r) => r.fields.length > 0);
        dragRowsRef.current = result;
        return result;
      }

      // Dragged to center → reorder rows
      if (sourceRow.fields.length === 1) {
        const result = [...prev];
        const [moved] = result.splice(activeLoc.rowIndex, 1);
        result.splice(overLoc.rowIndex, 0, moved);
        dragRowsRef.current = result;
        return result;
      }

      // Source is multi-field row: extract field into its own row at target position
      const field = sourceRow.fields[activeLoc.colIndex];
      const result = prev
        .map((r, i) => {
          if (i === activeLoc.rowIndex) {
            return { ...r, fields: r.fields.filter((f) => f.id !== draggedId) };
          }
          return r;
        })
        .filter((r) => r.fields.length > 0);
      const newTargetIdx = result.findIndex((r) =>
        r.fields.some((f) => f.id === overId)
      );
      const insertIdx = newTargetIdx !== -1 ? newTargetIdx : result.length;
      result.splice(insertIdx, 0, { rowIndex: 0, fields: [field] });
      dragRowsRef.current = result;
      return result;
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    const finalRows = dragRowsRef.current;
    if (finalRows) {
      onChangeRef.current(flattenRows(finalRows));
    }
    setActiveId(null);
    setDragRows(null);
    dragRowsRef.current = null;
  }, []);

  const addField = (type: FieldType) => {
    const newField: NotzField = {
      id: generateId(),
      label: "",
      type,
      ...(type === "rating" ? { max: 5 } : {}),
      ...(type === "tag" ? { options: [] } : {}),
      ...(type === "list" ? { checkable: false } : {}),
    };
    emitChange([...rows, { rowIndex: rows.length, fields: [newField] }]);
    setShowTypePicker(false);
  };

  const updateField = (fieldId: string, patch: Partial<NotzField>) => {
    emitChange(
      rows.map((row) => ({
        ...row,
        fields: row.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
      }))
    );
  };

  const removeField = (fieldId: string) => {
    emitChange(
      rows
        .map((row) => ({ ...row, fields: row.fields.filter((f) => f.id !== fieldId) }))
        .filter((row) => row.fields.length > 0)
    );
  };

  const moveRowUp = (rowIdx: number) => {
    if (rowIdx === 0) return;
    const newRows = [...rows];
    [newRows[rowIdx - 1], newRows[rowIdx]] = [newRows[rowIdx], newRows[rowIdx - 1]];
    emitChange(newRows);
  };

  const moveRowDown = (rowIdx: number) => {
    if (rowIdx >= rows.length - 1) return;
    const newRows = [...rows];
    [newRows[rowIdx], newRows[rowIdx + 1]] = [newRows[rowIdx + 1], newRows[rowIdx]];
    emitChange(newRows);
  };

  const mergeWithRowAbove = (fieldId: string) => {
    const loc = findField(fieldId);
    if (!loc || loc.rowIndex === 0) return;
    const field = rows[loc.rowIndex].fields[loc.colIndex];
    const newRows = rows.map((r, i) => {
      if (i === loc.rowIndex) {
        return { ...r, fields: r.fields.filter((f) => f.id !== fieldId) };
      }
      if (i === loc.rowIndex - 1) {
        return { ...r, fields: [...r.fields, field] };
      }
      return r;
    }).filter((r) => r.fields.length > 0);
    emitChange(newRows);
  };

  const splitToOwnRow = (fieldId: string) => {
    const loc = findField(fieldId);
    if (!loc) return;
    const sourceRow = rows[loc.rowIndex];
    if (sourceRow.fields.length <= 1) return;
    const field = sourceRow.fields[loc.colIndex];
    const newRows = [...rows];
    newRows[loc.rowIndex] = {
      ...sourceRow,
      fields: sourceRow.fields.filter((f) => f.id !== fieldId),
    };
    newRows.splice(loc.rowIndex + 1, 0, { rowIndex: 0, fields: [field] });
    emitChange(newRows);
  };

  const moveFieldLeft = (fieldId: string) => {
    const loc = findField(fieldId);
    if (!loc || loc.colIndex === 0) return;
    const row = rows[loc.rowIndex];
    const newFields = [...row.fields];
    [newFields[loc.colIndex - 1], newFields[loc.colIndex]] = [newFields[loc.colIndex], newFields[loc.colIndex - 1]];
    emitChange(rows.map((r, i) => (i === loc.rowIndex ? { ...r, fields: newFields } : r)));
  };

  const moveFieldRight = (fieldId: string) => {
    const loc = findField(fieldId);
    if (!loc) return;
    const row = rows[loc.rowIndex];
    if (loc.colIndex >= row.fields.length - 1) return;
    const newFields = [...row.fields];
    [newFields[loc.colIndex], newFields[loc.colIndex + 1]] = [newFields[loc.colIndex + 1], newFields[loc.colIndex]];
    emitChange(rows.map((r, i) => (i === loc.rowIndex ? { ...r, fields: newFields } : r)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground">
          Fields
        </span>
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50">
          {fields.length} added
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={customCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((row, rowIdx) => (
              <BuilderRow
                key={row.fields.map((f) => f.id).join(",")}
                row={row}
                rowIdx={rowIdx}
                totalRows={rows.length}
                onUpdate={updateField}
                onRemove={removeField}
                onMoveRowUp={() => moveRowUp(rowIdx)}
                onMoveRowDown={() => moveRowDown(rowIdx)}
                onMergeUp={mergeWithRowAbove}
                onSplitOut={splitToOwnRow}
                onMoveLeft={moveFieldLeft}
                onMoveRight={moveFieldRight}
                disabled={disabled}
              />
            ))}
          </div>
        )}
        <DragOverlay>
          {activeField ? (
            <div className="border-2 border-foreground bg-card px-3 py-2 opacity-85 shadow-[4px_4px_0_0_var(--color-foreground)]">
              <div className="flex items-center gap-2">
                <span className="text-foreground/50">
                  {FIELD_ICONS[activeField.type]}
                </span>
                <span className="truncate text-xs font-black uppercase tracking-[0.14em] text-foreground">
                  {activeField.label || FIELD_TYPE_LABELS[activeField.type]}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showTypePicker ? (
        <div className="border-2 border-foreground bg-background p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-foreground/70">
              Pick a field type
            </span>
            <button
              type="button"
              onClick={() => setShowTypePicker(false)}
              className="inline-flex items-center justify-center border-2 border-foreground bg-background p-0.5 text-foreground transition-colors hover:bg-foreground hover:text-background"
              disabled={disabled}
            >
              <XIcon weight="bold" className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {FIELD_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addField(type)}
                disabled={disabled}
                className="flex flex-col items-center gap-1 border-2 border-foreground bg-background px-2 py-2.5 text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {FIELD_ICONS[type]}
                <span className="text-[0.6rem] font-bold uppercase leading-none tracking-widest">
                  {FIELD_TYPE_LABELS[type]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setShowTypePicker(true)}
          disabled={disabled}
          className="w-full"
        >
          <PlusIcon weight="bold" className="size-3.5" />
          Add Field
        </Button>
      )}
    </div>
  );
}

interface BuilderRowProps {
  row: FieldRowType;
  rowIdx: number;
  totalRows: number;
  onUpdate: (fieldId: string, patch: Partial<NotzField>) => void;
  onRemove: (fieldId: string) => void;
  onMoveRowUp: () => void;
  onMoveRowDown: () => void;
  onMergeUp: (fieldId: string) => void;
  onSplitOut: (fieldId: string) => void;
  onMoveLeft: (fieldId: string) => void;
  onMoveRight: (fieldId: string) => void;
  disabled?: boolean;
}

function BuilderRow({
  row,
  rowIdx,
  totalRows,
  onUpdate,
  onRemove,
  onMoveRowUp,
  onMoveRowDown,
  onMergeUp,
  onSplitOut,
  onMoveLeft,
  onMoveRight,
  disabled,
}: BuilderRowProps) {
  const isMulti = row.fields.length > 1;

  if (!isMulti) {
    const field = row.fields[0];
    return (
      <SortableContext items={[field.id]} strategy={verticalListSortingStrategy}>
        <BuilderFieldItem
          field={field}
          onUpdate={(patch) => onUpdate(field.id, patch)}
          onRemove={() => onRemove(field.id)}
          disabled={disabled}
          rowControls={
            <div className="flex shrink-0 items-center gap-0.5">
              {rowIdx > 0 && (
                <button
                  type="button"
                  onClick={() => onMergeUp(field.id)}
                  disabled={disabled}
                  className="inline-flex items-center justify-center p-1 text-foreground/50 transition-colors hover:text-foreground disabled:opacity-30"
                  aria-label="Place next to field above"
                  title="Place next to field above"
                >
                  <ArrowsInLineHorizontalIcon weight="bold" className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onMoveRowUp}
                disabled={disabled || rowIdx === 0}
                className="inline-flex items-center justify-center p-1 text-foreground/50 transition-colors hover:text-foreground disabled:opacity-30"
                aria-label="Move up"
              >
                <ArrowUpIcon weight="bold" className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onMoveRowDown}
                disabled={disabled || rowIdx === totalRows - 1}
                className="inline-flex items-center justify-center p-1 text-foreground/50 transition-colors hover:text-foreground disabled:opacity-30"
                aria-label="Move down"
              >
                <ArrowDownIcon weight="bold" className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(field.id)}
                disabled={disabled}
                className="inline-flex items-center justify-center p-1 text-destructive/70 transition-colors hover:text-destructive disabled:opacity-30"
                aria-label="Remove field"
              >
                <TrashIcon weight="bold" className="size-3.5" />
              </button>
            </div>
          }
        />
      </SortableContext>
    );
  }

  // Multi-field row
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-foreground/40">
          Row {rowIdx + 1} · {row.fields.length} fields
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveRowUp}
            disabled={disabled || rowIdx === 0}
            className="inline-flex items-center justify-center p-0.5 text-foreground/40 transition-colors hover:text-foreground disabled:opacity-30"
            aria-label="Move row up"
          >
            <ArrowUpIcon weight="bold" className="size-3" />
          </button>
          <button
            type="button"
            onClick={onMoveRowDown}
            disabled={disabled || rowIdx === totalRows - 1}
            className="inline-flex items-center justify-center p-0.5 text-foreground/40 transition-colors hover:text-foreground disabled:opacity-30"
            aria-label="Move row down"
          >
            <ArrowDownIcon weight="bold" className="size-3" />
          </button>
        </div>
      </div>
      <SortableContext
        items={row.fields.map((f) => f.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
          {row.fields.map((field, colIdx) => (
          <div key={field.id} className="min-w-0 overflow-hidden">
            <BuilderFieldItem
              field={field}
              onUpdate={(patch) => onUpdate(field.id, patch)}
              onRemove={() => onRemove(field.id)}
              disabled={disabled}
              rowControls={
                <div className="flex shrink-0 items-center gap-0.5">
                  {row.fields.length > 1 && colIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => onMoveLeft(field.id)}
                      disabled={disabled}
                      className="inline-flex items-center justify-center p-1 text-foreground/50 transition-colors hover:text-foreground disabled:opacity-30"
                      aria-label="Move left"
                    >
                      <ArrowLeftIcon weight="bold" className="size-3.5" />
                    </button>
                  )}
                  {row.fields.length > 1 && colIdx < row.fields.length - 1 && (
                    <button
                      type="button"
                      onClick={() => onMoveRight(field.id)}
                      disabled={disabled}
                      className="inline-flex items-center justify-center p-1 text-foreground/50 transition-colors hover:text-foreground disabled:opacity-30"
                      aria-label="Move right"
                    >
                      <ArrowRightIcon weight="bold" className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSplitOut(field.id)}
                    disabled={disabled}
                    className="inline-flex items-center justify-center p-1 text-foreground/50 transition-colors hover:text-foreground disabled:opacity-30"
                    aria-label="Move to own row"
                    title="Move to its own row"
                  >
                    <ArrowsOutLineHorizontalIcon weight="bold" className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(field.id)}
                    disabled={disabled}
                    className="inline-flex items-center justify-center p-1 text-destructive/70 transition-colors hover:text-destructive disabled:opacity-30"
                    aria-label="Remove field"
                  >
                    <TrashIcon weight="bold" className="size-3.5" />
                  </button>
                </div>
              }
            />
          </div>
        ))}
        </div>
      </SortableContext>
    </div>
  );
}

interface BuilderFieldItemProps {
  field: NotzField;
  onUpdate: (patch: Partial<NotzField>) => void;
  onRemove: () => void;
  disabled?: boolean;
  rowControls: React.ReactNode;
}

function BuilderFieldItem({
  field,
  onUpdate,
  onRemove,
  disabled,
  rowControls,
}: BuilderFieldItemProps) {
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
    opacity: isDragging ? 0.4 : 1,
  };

  const [tagInput, setTagInput] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isImageEditing, setIsImageEditing] = useState(
    !(typeof field.value === "string" && field.value)
  );
  const imageInputRef = useRef<HTMLInputElement>(null);

  const addTagOption = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    const current = field.options ?? [];
    if (current.includes(trimmed)) return;
    onUpdate({ options: [...current, trimmed] });
    setTagInput("");
  };

  const removeTagOption = (opt: string) => {
    onUpdate({ options: (field.options ?? []).filter((o) => o !== opt) });
  };

  const handleImageUpload = async (file: File) => {
    setImageBusy(true);
    setImageError(null);

    try {
      const compressedImage = await compressImageFile(file);
      onUpdate({ value: compressedImage });
      setIsImageEditing(false);
    } catch {
      setImageError("Could not process image");
    } finally {
      setImageBusy(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="overflow-hidden border-2 border-foreground bg-background">
      <div className="flex items-center gap-2 px-2.5 py-2 sm:px-3">
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none p-0.5 text-foreground/30 transition-colors hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${field.label || "field"}`}
        >
          <DotsSixVerticalIcon weight="bold" className="size-3.5" />
        </button>
        <span className="flex shrink-0 items-center gap-1 text-foreground/60">
          {FIELD_ICONS[field.type]}
        </span>

        <Input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder={`${FIELD_TYPE_LABELS[field.type]} label…`}
          disabled={disabled}
          className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm font-medium shadow-none focus:border-0 focus:shadow-none"
        />

        {rowControls}
      </div>

      {/* Rating max config */}
      {field.type === "rating" && (
        <div className="flex items-center gap-2 border-t border-foreground/20 px-2.5 py-2 sm:px-3">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/60">
            Max
          </span>
          <select
            value={field.max ?? 5}
            onChange={(e) => onUpdate({ max: Number(e.target.value) })}
            disabled={disabled}
            className="border border-foreground bg-background px-2 py-1 text-xs font-medium text-foreground outline-none"
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tag options config */}
      {field.type === "tag" && (
        <div className="border-t border-foreground/20 px-2.5 py-2 sm:px-3">
          <div className="flex flex-wrap gap-1.5">
            {(field.options ?? []).map((opt) => (
              <span
                key={opt}
                className="inline-flex items-center gap-1 border border-foreground bg-secondary px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-foreground"
              >
                {opt}
                <button
                  type="button"
                  onClick={() => removeTagOption(opt)}
                  disabled={disabled}
                  className="text-foreground/60 hover:text-destructive"
                >
                  <XIcon weight="bold" className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <Input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTagOption();
                }
              }}
              placeholder="Add option…"
              disabled={disabled}
              className="min-w-0 h-8 flex-1 border px-2 py-1 text-xs shadow-none focus:shadow-none"
            />
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={addTagOption}
              disabled={disabled || !tagInput.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Image value config */}
      {field.type === "image" && (
        <div className="space-y-2 border-t border-foreground/20 px-2.5 py-2 sm:px-3">
          {!isImageEditing && typeof field.value === "string" && field.value ? (
            <div className="relative overflow-hidden border-2 border-foreground bg-background p-1">
              <button
                type="button"
                onClick={() => setIsImageEditing(true)}
                disabled={disabled}
                className="absolute right-2 top-2 z-10 inline-flex items-center justify-center border-2 border-foreground bg-card p-1 text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
                aria-label={`Edit image ${field.label || "field"}`}
              >
                <ImageIcon weight="bold" className="size-3.5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={field.value}
                alt={field.label || "Image preview"}
                className="max-h-40 w-full object-contain"
              />
            </div>
          ) : (
            <>
              <Input
                type="url"
                value={typeof field.value === "string" ? field.value : ""}
                onChange={(e) => {
                  onUpdate({ value: e.target.value || undefined });
                  setImageError(null);
                }}
                placeholder="https://example.com/image.png"
                disabled={disabled || imageBusy}
                className="h-9 text-xs"
              />
              <div className="flex flex-wrap gap-1.5">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  disabled={disabled || imageBusy}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleImageUpload(file);
                    if (imageInputRef.current) imageInputRef.current.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={disabled || imageBusy}
                >
                  <PlusIcon weight="bold" className="size-3.5" />
                  {imageBusy ? "Compressing..." : "Upload image"}
                </Button>
                {field.value && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setIsImageEditing(false)}
                      disabled={disabled || imageBusy}
                    >
                      Done
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        onUpdate({ value: undefined });
                        setImageError(null);
                        setIsImageEditing(true);
                      }}
                      disabled={disabled || imageBusy}
                    >
                      <XIcon weight="bold" className="size-3.5" />
                      Clear
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
          {imageError && (
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-destructive">
              {imageError}
            </p>
          )}
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50">
            Uploads are compressed before save.
          </p>
          {typeof field.value === "string" && field.value && (
            <div className="border-2 border-foreground bg-background p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={field.value}
                alt={field.label || "Image preview"}
                className="max-h-40 w-full object-contain"
              />
            </div>
          )}
        </div>
      )}

      {/* List behavior config */}
      {field.type === "list" && (
        <div className="flex items-center justify-between gap-3 border-t border-foreground/20 px-2.5 py-2 sm:px-3">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/60">
            Checkable items
          </span>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground">
            <Checkbox
              checked={Boolean(field.checkable)}
              onCheckedChange={(checked) => onUpdate({ checkable: Boolean(checked) })}
              disabled={disabled}
              className="size-4 border-2 border-foreground data-checked:border-foreground data-checked:bg-primary data-checked:text-primary-foreground"
            />
            Allow complete + strike
          </label>
        </div>
      )}
    </div>
  );
}
