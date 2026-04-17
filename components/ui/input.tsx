import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-none border-2 border-foreground bg-background px-3 py-2 text-sm font-medium text-foreground shadow-[2px_2px_0_0_var(--color-foreground)] outline-none transition-all placeholder:text-foreground/40 focus:border-3 focus:shadow-[4px_4px_0_0_var(--color-foreground)] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }