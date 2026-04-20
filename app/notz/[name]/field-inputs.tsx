"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import {
  DotsSixVerticalIcon,
  StarIcon,
  PlusIcon,
  XIcon,
  TrashIcon,
  LinkIcon,
  CalendarDotsIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { NotzField } from "@/lib/models/notz";
import { compressImageFile } from "@/lib/utils/image-field";

interface FieldInputProps {
  field: NotzField;
  onChange: (value: NotzField["value"]) => void;
  disabled?: boolean;
}

export function FieldInput({ field, onChange, disabled }: FieldInputProps) {
  switch (field.type) {
    case "board":
      return <BoardFieldInput field={field} onChange={onChange} disabled={disabled} />;
    case "label":
      return null;
    case "text":
      return <TextFieldInput field={field} onChange={onChange} disabled={disabled} />;
    case "number":
      return <NumberFieldInput field={field} onChange={onChange} disabled={disabled} />;
    case "rating":
      return <RatingFieldInput field={field} onChange={onChange} disabled={disabled} />;
    case "checkbox":
      return <CheckboxFieldInput field={field} onChange={onChange} disabled={disabled} />;
    case "date":
      return <DateFieldInput field={field} onChange={onChange} disabled={disabled} />;
    case "tag":
      return <TagFieldInput field={field} onChange={onChange} disabled={disabled} />;
    case "image":
      return <ImageFieldInput field={field} onChange={onChange} disabled={disabled} />;
    case "link":
      return <LinkFieldInput field={field} onChange={onChange} disabled={disabled} />;
    case "list":
      return <ListFieldInput field={field} onChange={onChange} disabled={disabled} />;
    default:
      return null;
  }
}

const BOARD_COLUMNS = [
  { key: "todo", title: "To Do", accentClass: "bg-amber-400" },
  { key: "inProgress", title: "In Progress", accentClass: "bg-sky-500" },
  { key: "done", title: "Done", accentClass: "bg-emerald-500" },
] as const;

type BoardColumnKey = (typeof BOARD_COLUMNS)[number]["key"];

type BoardCard = {
  id: string;
  text: string;
};

type BoardValue = Record<BoardColumnKey, BoardCard[]>;

const EMPTY_BOARD: BoardValue = {
  todo: [],
  inProgress: [],
  done: [],
};

function isBoardCard(value: unknown): value is BoardCard {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { id?: unknown }).id === "string" &&
      typeof (value as { text?: unknown }).text === "string"
  );
}

function normalizeBoardValue(value: NotzField["value"]): BoardValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_BOARD;
  }

  const board = value as Partial<Record<BoardColumnKey, unknown>>;

  return {
    todo: Array.isArray(board.todo) ? board.todo.filter(isBoardCard) : [],
    inProgress: Array.isArray(board.inProgress) ? board.inProgress.filter(isBoardCard) : [],
    done: Array.isArray(board.done) ? board.done.filter(isBoardCard) : [],
  };
}

function createBoardCard(text: string): BoardCard {
  return {
    id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text,
  };
}

function findBoardColumn(board: BoardValue, cardId: string): BoardColumnKey | null {
  for (const column of BOARD_COLUMNS) {
    if (board[column.key].some((card) => card.id === cardId)) {
      return column.key;
    }
  }

  return null;
}

function BoardFieldInput({ field, onChange, disabled }: FieldInputProps) {
  const board = normalizeBoardValue(field.value);
  const [drafts, setDrafts] = useState<Record<BoardColumnKey, string>>({
    todo: "",
    inProgress: "",
    done: "",
  });
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeCard = useMemo(() => {
    if (!activeCardId) {
      return null;
    }

    for (const column of BOARD_COLUMNS) {
      const match = board[column.key].find((card) => card.id === activeCardId);
      if (match) {
        return match;
      }
    }

    return null;
  }, [activeCardId, board]);

  const updateBoard = (nextBoard: BoardValue) => {
    onChange(nextBoard);
  };

  const setDraft = (column: BoardColumnKey, value: string) => {
    setDrafts((current) => ({ ...current, [column]: value }));
  };

  const addCard = (column: BoardColumnKey) => {
    const text = drafts[column].trim();
    if (!text) {
      return;
    }

    updateBoard({
      ...board,
      [column]: [...board[column], createBoardCard(text)],
    });
    setDraft(column, "");
  };

  const removeCard = (column: BoardColumnKey, cardId: string) => {
    updateBoard({
      ...board,
      [column]: board[column].filter((card) => card.id !== cardId),
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) {
      return;
    }

    const activeId = String(event.active.id);
    const activeColumn = findBoardColumn(board, activeId);
    const overColumn = BOARD_COLUMNS.some((column) => column.key === overId)
      ? (overId as BoardColumnKey)
      : findBoardColumn(board, overId);

    if (!activeColumn || !overColumn || activeColumn === overColumn) {
      return;
    }

    const activeCards = board[activeColumn];
    const overCards = board[overColumn];
    const activeIndex = activeCards.findIndex((card) => card.id === activeId);
    const overIndex = BOARD_COLUMNS.some((column) => column.key === overId)
      ? overCards.length
      : overCards.findIndex((card) => card.id === overId);

    if (activeIndex === -1) {
      return;
    }

    const movedCard = activeCards[activeIndex];
    const nextActiveCards = activeCards.filter((card) => card.id !== activeId);
    const nextOverCards = [...overCards];

    nextOverCards.splice(overIndex === -1 ? nextOverCards.length : overIndex, 0, movedCard);

    updateBoard({
      ...board,
      [activeColumn]: nextActiveCards,
      [overColumn]: nextOverCards,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null);

    const overId = event.over ? String(event.over.id) : null;
    if (!overId) {
      return;
    }

    const activeId = String(event.active.id);
    const activeColumn = findBoardColumn(board, activeId);
    const overColumn = BOARD_COLUMNS.some((column) => column.key === overId)
      ? (overId as BoardColumnKey)
      : findBoardColumn(board, overId);

    if (!activeColumn || !overColumn || activeColumn !== overColumn) {
      return;
    }

    if (BOARD_COLUMNS.some((column) => column.key === overId)) {
      return;
    }

    const cards = board[activeColumn];
    const activeIndex = cards.findIndex((card) => card.id === activeId);
    const overIndex = cards.findIndex((card) => card.id === overId);

    if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
      return;
    }

    updateBoard({
      ...board,
      [activeColumn]: arrayMove(cards, activeIndex, overIndex),
    });
  };

  if (!isHydrated) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-3">
          {BOARD_COLUMNS.map((column) => (
            <BoardColumnSectionStatic
              key={column.key}
              title={column.title}
              accentClass={column.accentClass}
              cards={board[column.key]}
              draft={drafts[column.key]}
              onDraftChange={(value) => setDraft(column.key, value)}
              onAddCard={() => addCard(column.key)}
              onRemoveCard={(cardId) => removeCard(column.key, cardId)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {BOARD_COLUMNS.map((column) => (
            <BoardColumnSection
              key={column.key}
              columnKey={column.key}
              title={column.title}
              accentClass={column.accentClass}
              cards={board[column.key]}
              draft={drafts[column.key]}
              onDraftChange={(value) => setDraft(column.key, value)}
              onAddCard={() => addCard(column.key)}
              onRemoveCard={(cardId) => removeCard(column.key, cardId)}
              disabled={disabled}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="border-3 border-foreground bg-card px-3 py-2 shadow-[4px_4px_0_0_var(--color-foreground)]">
              <p className="text-sm font-bold text-foreground">{activeCard.text}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

type BoardColumnSectionProps = {
  columnKey: BoardColumnKey;
  title: string;
  accentClass: string;
  cards: BoardCard[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAddCard: () => void;
  onRemoveCard: (cardId: string) => void;
  disabled?: boolean;
};

type BoardColumnSectionStaticProps = {
  title: string;
  accentClass: string;
  cards: BoardCard[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAddCard: () => void;
  onRemoveCard: (cardId: string) => void;
  disabled?: boolean;
};

function BoardColumnSectionStatic({
  title,
  accentClass,
  cards,
  draft,
  onDraftChange,
  onAddCard,
  onRemoveCard,
  disabled,
}: BoardColumnSectionStaticProps) {
  return (
    <div className="border-3 border-foreground bg-muted/40 p-3 transition-colors">
      <div className="mb-3 flex items-center justify-between gap-2 border-b-2 border-foreground/20 pb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block size-3 border border-foreground ${accentClass}`} />
          <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground">
            {title}
          </span>
        </div>
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50">
          {cards.length}
        </span>
      </div>

      <div className="min-h-24 space-y-2">
        {cards.length > 0 ? (
          cards.map((card) => (
            <BoardCardItemStatic
              key={card.id}
              card={card}
              onRemove={() => onRemoveCard(card.id)}
              disabled={disabled}
            />
          ))
        ) : (
          <div className="border-2 border-dashed border-foreground/30 px-3 py-4 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/35">
            Drop here
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-1.5">
        <Input
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddCard();
            }
          }}
          placeholder="Add card..."
          disabled={disabled}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={onAddCard}
          disabled={disabled || !draft.trim()}
        >
          <PlusIcon weight="bold" className="size-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

function BoardColumnSection({
  columnKey,
  title,
  accentClass,
  cards,
  draft,
  onDraftChange,
  onAddCard,
  onRemoveCard,
  disabled,
}: BoardColumnSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  return (
    <div
      ref={setNodeRef}
      className={`border-3 border-foreground bg-muted/40 p-3 transition-colors ${
        isOver ? "bg-secondary/45" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 border-b-2 border-foreground/20 pb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block size-3 border border-foreground ${accentClass}`} />
          <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground">
            {title}
          </span>
        </div>
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50">
          {cards.length}
        </span>
      </div>

      <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-24 space-y-2">
          {cards.length > 0 ? (
            cards.map((card) => (
              <BoardCardItem
                key={card.id}
                card={card}
                onRemove={() => onRemoveCard(card.id)}
                disabled={disabled}
              />
            ))
          ) : (
            <div className="border-2 border-dashed border-foreground/30 px-3 py-4 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/35">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>

      <div className="mt-3 flex gap-1.5">
        <Input
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddCard();
            }
          }}
          placeholder="Add card..."
          disabled={disabled}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={onAddCard}
          disabled={disabled || !draft.trim()}
        >
          <PlusIcon weight="bold" className="size-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

type BoardCardItemProps = {
  card: BoardCard;
  onRemove: () => void;
  disabled?: boolean;
};

function BoardCardItemStatic({ card, onRemove, disabled }: BoardCardItemProps) {
  return (
    <div className="border-3 border-foreground bg-card px-3 py-2 shadow-[3px_3px_0_0_var(--color-foreground)]">
      <div className="flex items-start gap-2">
        <span className="shrink-0 p-0.5 text-foreground/40">
          <DotsSixVerticalIcon weight="bold" className="size-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm font-bold text-foreground">{card.text}</p>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="shrink-0 p-0.5 text-foreground/35 transition-colors hover:text-destructive disabled:opacity-50"
          aria-label={`Remove ${card.text}`}
        >
          <XIcon weight="bold" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function BoardCardItem({ card, onRemove, disabled }: BoardCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-3 border-foreground bg-card px-3 py-2 shadow-[3px_3px_0_0_var(--color-foreground)] ${
        isDragging ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none p-0.5 text-foreground/40 transition-colors hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Move ${card.text}`}
        >
          <DotsSixVerticalIcon weight="bold" className="size-4" />
        </button>
        <p className="min-w-0 flex-1 text-sm font-bold text-foreground">{card.text}</p>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="shrink-0 p-0.5 text-foreground/35 transition-colors hover:text-destructive disabled:opacity-50"
          aria-label={`Remove ${card.text}`}
        >
          <XIcon weight="bold" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function TextFieldInput({ field, onChange, disabled }: FieldInputProps) {
  return (
    <Textarea
      value={typeof field.value === "string" ? field.value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${field.label.toLowerCase()}…`}
      disabled={disabled}
      rows={3}
      className="resize-y"
    />
  );
}

function NumberFieldInput({ field, onChange, disabled }: FieldInputProps) {
  return (
    <Input
      type="number"
      value={typeof field.value === "number" ? field.value : ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      placeholder="0"
      disabled={disabled}
    />
  );
}

function RatingFieldInput({ field, onChange, disabled }: FieldInputProps) {
  const max = field.max ?? 5;
  const current = typeof field.value === "number" ? field.value : 0;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === current ? 0 : star)}
          disabled={disabled}
          className="p-0.5 transition-colors disabled:opacity-50"
          aria-label={`Rate ${star} of ${max}`}
        >
          <StarIcon
            weight={star <= current ? "fill" : "regular"}
            className={`size-6 sm:size-7 ${
              star <= current
                ? "text-primary"
                : "text-foreground/30"
            }`}
          />
        </button>
      ))}
      {current > 0 && (
        <span className="ml-2 text-xs font-black uppercase tracking-[0.14em] text-foreground/60">
          {current}/{max}
        </span>
      )}
    </div>
  );
}

function CheckboxFieldInput({ field, onChange, disabled }: FieldInputProps) {
  const checked = typeof field.value === "boolean" ? field.value : false;

  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(Boolean(v))}
        disabled={disabled}
        className="size-6 border-2 border-foreground data-checked:border-foreground data-checked:bg-primary data-checked:text-primary-foreground"
      />
      <span className="text-sm font-bold text-foreground/70">
        {checked ? "Yes" : "No"}
      </span>
    </label>
  );
}

function DateFieldInput({ field, onChange, disabled }: FieldInputProps) {
  const selectedDate =
    typeof field.value === "string" && field.value
      ? parseISO(field.value)
      : undefined;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between text-left"
            disabled={disabled}
          />
        }
      >
        <span className={selectedDate ? "text-foreground" : "text-foreground/40"}>
          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
        </span>
        <CalendarDotsIcon weight="bold" className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
        />
      </PopoverContent>
    </Popover>
  );
}

function TagFieldInput({ field, onChange, disabled }: FieldInputProps) {
  const selected = Array.isArray(field.value) ? (field.value as string[]) : [];
  const options = field.options ?? [];

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            disabled={disabled}
            className={`inline-flex items-center border-2 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${
              isSelected
                ? "border-foreground bg-primary text-primary-foreground"
                : "border-foreground bg-background text-foreground hover:bg-secondary"
            }`}
          >
            {opt}
          </button>
        );
      })}
      {options.length === 0 && (
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/40">
          No options defined
        </span>
      )}
    </div>
  );
}

function ImageFieldInput({ field, onChange, disabled }: FieldInputProps) {
  const url = typeof field.value === "string" ? field.value : "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const compressedImage = await compressImageFile(file);
      onChange(compressedImage);
    } catch {
      setUploadError("Could not process image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        type="url"
        value={url}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="https://example.com/image.png"
        disabled={disabled}
      />
      <div className="flex flex-wrap gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={disabled || isUploading}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await handleFileUpload(file);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <PlusIcon weight="bold" className="size-3.5" />
          {isUploading ? "Compressing..." : "Upload image"}
        </Button>
        {url && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={disabled || isUploading}
            onClick={() => {
              onChange(undefined);
              setUploadError(null);
            }}
          >
            <XIcon weight="bold" className="size-3.5" />
            Clear
          </Button>
        )}
      </div>
      {uploadError && (
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-destructive">
          {uploadError}
        </p>
      )}
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50">
        Uploads are automatically compressed before saving.
      </p>
      {url && (
        <div className="border-2 border-foreground bg-background p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={field.label}
            className="max-h-48 w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}

function LinkFieldInput({ field, onChange, disabled }: FieldInputProps) {
  const url = typeof field.value === "string" ? field.value : "";

  return (
    <div className="space-y-1.5">
      <Input
        type="url"
        value={url}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="https://…"
        disabled={disabled}
      />
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-primary underline"
        >
          <LinkIcon weight="bold" className="size-3" />
          Open link
        </a>
      )}
    </div>
  );
}

function ListFieldInput({ field, onChange, disabled }: FieldInputProps) {
  const checkable = Boolean(field.checkable);
  const items = Array.isArray(field.value) ? field.value : [];
  const [draft, setDraft] = useState("");

  const normalizedItems: { text: string; completed: boolean }[] = checkable
    ? (items as Array<{ text?: unknown; completed?: unknown }>).map((item) => {
        if (typeof item === "string") {
          return { text: item, completed: false };
        }

        return {
          text: typeof item?.text === "string" ? item.text : "",
          completed: Boolean(item?.completed),
        };
      })
    : (items as unknown[])
        .map((item) => (typeof item === "string" ? item : ""))
        .filter((item) => item.length > 0)
        .map((item) => ({ text: item, completed: false }));

  const saveItems = (nextItems: { text: string; completed: boolean }[]) => {
    if (checkable) {
      onChange(nextItems);
      return;
    }

    onChange(nextItems.map((item) => item.text));
  };

  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    saveItems([...normalizedItems, { text: trimmed, completed: false }]);
    setDraft("");
  };

  const removeItem = (index: number) => {
    saveItems(normalizedItems.filter((_, i) => i !== index));
  };

  const toggleComplete = (index: number) => {
    if (!checkable) return;

    saveItems(
      normalizedItems.map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <div className="space-y-2">
      {normalizedItems.length > 0 && (
        <ul className="space-y-1">
          {normalizedItems.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2 border-2 border-foreground/30 bg-background px-3 py-1.5"
            >
              {checkable ? (
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleComplete(i)}
                  disabled={disabled}
                  className="size-5 border-2 border-foreground data-checked:border-foreground data-checked:bg-primary data-checked:text-primary-foreground"
                />
              ) : null}
              <span
                className={`min-w-0 flex-1 text-sm font-medium ${
                  item.completed
                    ? "text-foreground/50 line-through"
                    : "text-foreground"
                }`}
              >
                {item.text}
              </span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={disabled}
                className="shrink-0 p-0.5 text-destructive/70 transition-colors hover:text-destructive disabled:opacity-50"
                aria-label={`Remove "${item.text}"`}
              >
                <TrashIcon weight="bold" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1.5">
        <Input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Add item…"
          disabled={disabled}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={addItem}
          disabled={disabled || !draft.trim()}
        >
          <PlusIcon weight="bold" className="size-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
