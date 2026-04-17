"use client"

import * as React from "react"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
import { DayPicker } from "react-day-picker"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-4",
        caption: "relative flex items-center justify-center px-8 pt-1",
        caption_label: "text-xs font-black uppercase tracking-[0.16em]",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "absolute left-0 top-0 h-8 w-8 shadow-[3px_3px_0_0_var(--color-foreground)]"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "absolute right-0 top-0 h-8 w-8 shadow-[3px_3px_0_0_var(--color-foreground)]"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "w-9 text-[0.65rem] font-black uppercase tracking-[0.14em] text-foreground/50",
        week: "mt-1 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "h-9 w-9 rounded-none border-2 px-0 py-0 text-xs font-black shadow-none"
        ),
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground",
        today: "[&>button]:bg-secondary [&>button]:text-secondary-foreground",
        outside: "text-foreground/30 [&>button]:text-foreground/30",
        disabled: "opacity-30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName }) =>
          orientation === "left" ? (
            <CaretLeftIcon className={cn("size-4", iconClassName)} weight="bold" />
          ) : (
            <CaretRightIcon className={cn("size-4", iconClassName)} weight="bold" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }