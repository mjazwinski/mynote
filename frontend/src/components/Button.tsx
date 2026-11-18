import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg border-accent hover:opacity-90",
  secondary: "bg-surface text-fg border-border hover:bg-surface-raised",
  danger: "bg-danger text-danger-fg border-danger hover:opacity-90",
  ghost: "bg-transparent text-fg border-transparent hover:bg-surface-raised",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Token-styled button with a minimum 44×44 px touch target (constitution II). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors focus-visible:outline-3 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
});
