import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "border border-primary bg-primary text-primary-foreground shadow-sm hover:bg-red-700",
        secondary: "border border-secondary bg-secondary text-secondary-foreground hover:bg-slate-200 dark:hover:bg-slate-700",
        ghost: "border border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        outline: "border border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-accent",
        danger: "border border-destructive bg-destructive text-destructive-foreground hover:bg-red-800"
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-sm",
        icon: "h-10 w-10 p-0"
      }
    },
    defaultVariants: { variant: "primary", size: "md" }
  }
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));

Button.displayName = "Button";

export default Button;
