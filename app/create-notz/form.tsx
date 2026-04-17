"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { createNotz } from "@/app/actions/notz-actions";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useTransition } from "react";
import { createNotzSchema } from "@/lib/validations/notz";
import { MAX_FEATURED_NOTZ } from "@/lib/models/notz";
import type { CreateNotzInput } from "@/lib/models/notz";
import { InfoIcon } from "@phosphor-icons/react";
import { FieldBuilder } from "./field-builder";

interface CreateNotzFormProps {
  featuredCount: number;
  onCreated?: () => void;
}

export function CreateNotzForm({ featuredCount, onCreated }: CreateNotzFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const slotsLeft = MAX_FEATURED_NOTZ - featuredCount;

  useEffect(() => {
    if (!infoOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setInfoOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [infoOpen]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CreateNotzInput>({
    resolver: zodResolver(createNotzSchema),
    defaultValues: { featured: false, fields: [] },
  });

  const fieldsValue = watch("fields");

  const onSubmit = (data: CreateNotzInput) => {
    startTransition(async () => {
      const result = await createNotz(data);

      if ("success" in result && result.success) {
        reset();
        onCreated?.();
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
          <label htmlFor="name" className="neo-label block text-xs font-black uppercase tracking-[0.16em] text-foreground">
            Notz Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="e.g., games, recipes, ideas"
            className="w-full border-2 border-foreground bg-background px-4 py-3 text-sm font-medium text-foreground placeholder-foreground/40 outline-none transition-all focus:border-3 focus:shadow-[2px_2px_0_0_var(--color-foreground)] sm:focus:shadow-[4px_4px_0_0_var(--color-foreground)]"
            disabled={isPending}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Controller
              name="featured"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="featured"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending || slotsLeft <= 0}
                  className="size-5 border-2 border-foreground data-checked:border-foreground data-checked:bg-primary data-checked:text-primary-foreground"
                />
              )}
            />
            <label
              htmlFor="featured"
              className="neo-label flex cursor-pointer items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-foreground"
            >
              Featured
              <div ref={infoRef} className="relative inline-flex">
                <button
                  type="button"
                  className="inline-flex cursor-help items-center justify-center rounded-none border-2 border-foreground bg-accent p-0.5 text-foreground transition-colors hover:bg-foreground hover:text-background"
                  aria-label="Featured info"
                  onClick={() => setInfoOpen((o) => !o)}
                >
                  <InfoIcon size={14} weight="bold" />
                </button>
                {infoOpen && (
                  <div className="absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 border-2 border-foreground bg-foreground px-3 py-2 text-xs font-medium leading-relaxed text-background">
                    Featured notz appear as quick links in the header. On mobile, they show as a ★ star icon instead of the name.
                    <br />
                    <span className="mt-1 inline-block font-black">
                      {slotsLeft > 0
                        ? `${slotsLeft} of ${MAX_FEATURED_NOTZ} slots available`
                        : `All ${MAX_FEATURED_NOTZ} slots taken`}
                    </span>
                  </div>
                )}
              </div>
            </label>
          </div>
          {errors.featured && (
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-destructive">
              {errors.featured.message}
            </p>
          )}
        </div>

        <div className="border-t-2 border-foreground/20 pt-4">
          <FieldBuilder
            fields={fieldsValue ?? []}
            onChange={(newFields) => setValue("fields", newFields)}
            disabled={isPending}
          />
          {errors.fields && (
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-destructive">
              {typeof errors.fields.message === "string"
                ? errors.fields.message
                : "Check your field definitions"}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full border-3 px-4 py-3 text-xs font-black uppercase tracking-[0.16em]"
        >
          {isPending ? "Creating..." : "Create Notz"}
        </Button>
      </form>
  );
}
