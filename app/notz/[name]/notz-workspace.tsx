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
  FloppyDiskIcon,
  CheckIcon,
  PencilSimpleIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { NotzField, FieldType } from "@/lib/models/notz";
import { FIELD_TYPES, FIELD_TYPE_LABELS } from "@/lib/models/notz";
import { updateNotzFields } from "@/app/actions/notz-actions";
import { FieldInput } from "./field-inputs";

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
  const [fields, setFields] = useState<NotzField[]>(initialFields);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveVersion, setSaveVersion] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const savedTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fieldIds = useMemo(() => fields.map((f) => f.id), [fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateFieldValue = useCallback((fieldId: string, value: NotzField["value"]) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, value } : f))
    );
    setDirty(true);
    setSaved(false);
  }, []);

  const addField = useCallback((type: FieldType) => {
    const newField: NotzField = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: "",
      type,
      ...(type === "rating" ? { max: 5 } : {}),
      ...(type === "tag" ? { options: [] } : {}),
      ...(type === "list" ? { checkable: false } : {}),
    };
    setFields((prev) => [...prev, newField]);
    setShowTypePicker(false);
    setDirty(true);
    setSaved(false);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFields((prev) => {
      const activeIdx = prev.findIndex((f) => f.id === active.id);
      const overIdx = prev.findIndex((f) => f.id === over.id);
      if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return prev;

      const result = [...prev];
      const [moved] = result.splice(activeIdx, 1);
      result.splice(overIdx, 0, moved);
      return result;
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDirty(true);
    setSaved(false);
  }, []);

  const save = () => {
    const normalized = fields.map((f, i) => ({ ...f, row: i, column: 0 }));
    startTransition(async () => {
      const result = await updateNotzFields({ id: notzId, fields: normalized });
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
    () => (activeId ? fields.find((f) => f.id === activeId) ?? null : null),
    [activeId, fields]
  );

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:gap-6">
      {/* Header */}
      <div className="neo-panel flex flex-col gap-3 bg-card p-3 shadow-[3px_3px_0_0_var(--color-foreground)] sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:shadow-[6px_6px_0_0_var(--color-foreground)]">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black uppercase tracking-[0.18em] text-foreground sm:text-3xl">
            {notzName}
          </h1>
          {featured && (
            <span className="inline-flex shrink-0 items-center border-2 border-foreground bg-primary px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-primary-foreground">
              ★ Featured
            </span>
          )}
        </div>
        {fields.length > 0 && (
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
      {fields.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
            <div className="grid gap-2 sm:gap-4">
              {fields.map((field) => (
                <SortableFieldCard
                  key={field.id}
                  field={field}
                  onValueChange={(value) => updateFieldValue(field.id, value)}
                  disabled={isPending}
                  saveVersion={saveVersion}
                />
              ))}
            </div>
          </SortableContext>
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
        <div className="neo-panel bg-card p-6 text-center shadow-[3px_3px_0_0_var(--color-foreground)] sm:p-10 sm:shadow-[6px_6px_0_0_var(--color-foreground)]">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-foreground/60">
            No fields defined for this notz yet.
          </p>
        </div>
      )}

      {/* Add Field */}
      {showTypePicker ? (
        <div className="neo-panel bg-card p-3 shadow-[3px_3px_0_0_var(--color-foreground)] sm:p-5 sm:shadow-[6px_6px_0_0_var(--color-foreground)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground">
              Pick a field type
            </span>
            <button
              type="button"
              onClick={() => setShowTypePicker(false)}
              className="inline-flex items-center justify-center border-2 border-foreground bg-background p-1 text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <XIcon weight="bold" className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {FIELD_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addField(type)}
                disabled={isPending}
                className="flex flex-col items-center gap-1.5 border-2 border-foreground bg-background px-2 py-3 text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
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
        <button
          type="button"
          onClick={() => setShowTypePicker(true)}
          disabled={isPending}
          className="neo-panel flex w-full items-center justify-center gap-2 border-dashed bg-card p-3 text-xs font-black uppercase tracking-[0.16em] text-foreground/60 shadow-[3px_3px_0_0_var(--color-foreground)] transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50 sm:p-4 sm:shadow-[6px_6px_0_0_var(--color-foreground)]"
        >
          <PlusIcon weight="bold" className="size-4" />
          Add Field
        </button>
      )}
    </section>
  );
}

interface SortableFieldCardProps {
  field: NotzField;
  onValueChange: (value: NotzField["value"]) => void;
  disabled?: boolean;
  saveVersion: number;
}

function SortableFieldCard({
  field,
  onValueChange,
  disabled,
  saveVersion,
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

  if (field.type === "image") {
    const imageValue = typeof field.value === "string" ? field.value : "";

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`neo-panel overflow-hidden bg-card shadow-[3px_3px_0_0_var(--color-foreground)] sm:shadow-[6px_6px_0_0_var(--color-foreground)] ${
          isDragging ? "z-50 opacity-90 shadow-[8px_8px_0_0_var(--color-foreground)]" : ""
        }`}
      >
        <div className="relative">
          <div className="absolute left-1.5 top-1.5 z-10 flex gap-1 sm:left-2 sm:top-2">
            <button
              type="button"
              className="inline-flex items-center justify-center border-2 border-foreground bg-card p-1 text-foreground/60 transition-colors hover:text-foreground"
              {...attributes}
              {...listeners}
              aria-label={`Reorder ${field.label || "image"}`}
            >
              <DotsSixVerticalIcon weight="bold" className="size-4" />
            </button>
          </div>
          <div className="absolute right-1.5 top-1.5 z-10 flex gap-1 sm:right-2 sm:top-2">
            <button
              type="button"
              onClick={() => setIsImageEditing((current) => !current)}
              disabled={disabled}
              className="inline-flex items-center justify-center border-2 border-foreground bg-card p-1 text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
              aria-label={`${isImageEditing ? "Close" : "Edit"} image ${field.label || "field"}`}
            >
              <PencilSimpleIcon weight="bold" className="size-4" />
            </button>
            {imageValue && (
              <button
                type="button"
                onClick={() => onValueChange(undefined)}
                disabled={disabled}
                className="inline-flex items-center justify-center border-2 border-foreground bg-card p-1 text-destructive transition-colors hover:bg-destructive hover:text-primary-foreground disabled:opacity-50"
                aria-label="Remove image"
              >
                <XIcon weight="bold" className="size-4" />
              </button>
            )}
          </div>

          {imageValue ? (
            <div className="bg-background p-1.5 sm:p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageValue}
                alt={field.label || "Image"}
                className="max-h-80 w-full object-contain sm:max-h-128"
              />
            </div>
          ) : (
            <div className="flex min-h-32 items-center justify-center bg-muted px-4 py-8 text-center sm:min-h-48 sm:py-12">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/45">
                {field.label ? `Add an image for ${field.label}` : "Add an image"}
              </span>
            </div>
          )}
        </div>

        {isImageEditing && (
          <div className="border-t-2 border-foreground/20 px-2.5 py-2.5 sm:px-4 sm:py-4">
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
      className={`neo-panel bg-card shadow-[3px_3px_0_0_var(--color-foreground)] sm:shadow-[6px_6px_0_0_var(--color-foreground)] ${
        isDragging ? "z-50 opacity-90 shadow-[8px_8px_0_0_var(--color-foreground)]" : ""
      }`}
    >
      {/* Field header */}
      <div className="flex items-center gap-1.5 border-b-2 border-foreground/20 px-2.5 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
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
        <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-widest text-foreground/40">
          {FIELD_TYPE_LABELS[field.type]}
        </span>
      </div>

      {/* Field input */}
      {field.type !== "label" && (
        <div className="px-2.5 py-2.5 sm:px-4 sm:py-4">
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
