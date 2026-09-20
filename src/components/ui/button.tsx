import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        // Tinted glass: the primary colour shows through the material.
        default:
          "sheen-fill bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(16_35_28/0.12),0_10px_24px_-10px_var(--primary)] hover:brightness-110",
        secondary:
          "glass glass-sheen text-secondary-foreground hover:bg-[var(--glass-tint-strong)]",
        outline:
          "glass-soft text-foreground hover:bg-[var(--glass-tint)]",
        ghost:
          "text-muted-foreground hover:bg-[var(--glass-tint-soft)] hover:text-foreground",
        destructive:
          "sheen-fill bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12),0_10px_24px_-10px_var(--destructive)] hover:brightness-110",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-10 min-h-10 px-4",
        lg: "h-13 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
