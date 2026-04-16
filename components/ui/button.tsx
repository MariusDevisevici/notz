import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border-3 border-foreground bg-clip-padding text-xs font-black uppercase whitespace-nowrap tracking-[0.16em] transition-all outline-none select-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[6px_6px_0_0_var(--color-foreground)]",
        outline:
          "bg-background text-foreground shadow-[6px_6px_0_0_var(--color-foreground)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[6px_6px_0_0_var(--color-foreground)]",
        ghost:
          "bg-accent text-accent-foreground shadow-[6px_6px_0_0_var(--color-foreground)]",
        destructive:
          "bg-destructive text-primary-foreground shadow-[6px_6px_0_0_var(--color-foreground)]",
        link: "border-0 bg-transparent px-0 py-0 text-foreground shadow-none underline decoration-2 underline-offset-4",
      },
      size: {
        default:
          "min-h-11 gap-2 px-4 py-2 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "min-h-8 gap-1 px-2.5 py-1 text-[0.65rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-9 gap-1.5 px-3 py-1.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-12 gap-2 px-5 py-3 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-11",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-none",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
