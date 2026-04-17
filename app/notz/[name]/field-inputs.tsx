"use client";

import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
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
