"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DotsSixVerticalIcon,
  TextTIcon,
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
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { NotzField, FieldType } from "@/lib/models/notz";
import { FIELD_TYPES, FIELD_TYPE_LABELS } from "@/lib/models/notz";
import { compressImageFile } from "@/lib/utils/image-field";

const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  label: <TextTIcon weight="bold" className="size-4" />,
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
  const [dragFields, setDragFields] = useState<NotzField[] | null>(null);
  const dragFieldsRef = useRef<NotzField[] | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const currentFields = dragFields ?? fields;
  const fieldIds = useMemo(() => currentFields.map((f) => f.id), [currentFields]);
  const activeField = useMemo(
    () => (activeId ? currentFields.find((f) => f.id === activeId) ?? null : null),
    [activeId, currentFields]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDragFields([...fields]);
    dragFieldsRef.current = [...fields];
  }, [fields]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDragFields((prev) => {
      if (!prev) return prev;
      const activeIdx = prev.findIndex((f) => f.id === active.id);
      const overIdx = prev.findIndex((f) => f.id === over.id);
      if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return prev;

      const result = [...prev];
      const [moved] = result.splice(activeIdx, 1);
      result.splice(overIdx, 0, moved);
      dragFieldsRef.current = result;
      return result;
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    const final = dragFieldsRef.current;
    if (final) {
      onChangeRef.current(final.map((f, i) => ({ ...f, row: i, column: 0 })));
    }
    setActiveId(null);
    setDragFields(null);
    dragFieldsRef.current = null;
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
    onChange([...fields, newField]);
    setShowTypePicker(false);
  };

  const updateField = (fieldId: string, patch: Partial<NotzField>) => {
    onChange(fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)));
  };

  const removeField = (fieldId: string) => {
    onChange(fields.filter((f) => f.id !== fieldId));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...fields];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (idx: number) => {
    if (idx >= fields.length - 1) return;
    const next = [...fields];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
          {currentFields.length > 0 && (
            <div className="space-y-2">
              {currentFields.map((field, idx) => (
                <BuilderFieldItem
                  key={field.id}
                  field={field}
                  idx={idx}
                  total={currentFields.length}
                  onUpdate={(patch) => updateField(field.id, patch)}
                  onRemove={() => removeField(field.id)}
                  onMoveUp={() => moveUp(idx)}
                  onMoveDown={() => moveDown(idx)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </SortableContext>
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

interface BuilderFieldItemProps {
  field: NotzField;
  idx: number;
  total: number;
  onUpdate: (patch: Partial<NotzField>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
}

function BuilderFieldItem({
  field,
  idx,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  disabled,
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

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disabled || idx === 0}
            className="inline-flex items-center justify-center p-1 text-foreground/50 transition-colors hover:text-foreground disabled:opacity-30"
            aria-label="Move up"
          >
            <ArrowUpIcon weight="bold" className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={disabled || idx === total - 1}
            className="inline-flex items-center justify-center p-1 text-foreground/50 transition-colors hover:text-foreground disabled:opacity-30"
            aria-label="Move down"
          >
            <ArrowDownIcon weight="bold" className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="inline-flex items-center justify-center p-1 text-destructive/70 transition-colors hover:text-destructive disabled:opacity-30"
            aria-label="Remove field"
          >
            <TrashIcon weight="bold" className="size-3.5" />
          </button>
        </div>
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
