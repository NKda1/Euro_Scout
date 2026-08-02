"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PendingSubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pendingLabel: string;
  children: ReactNode;
}

export default function PendingSubmitButton({ pendingLabel, children, className, disabled, ...props }: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button {...props} type="submit" disabled={disabled || pending} aria-busy={pending} className={className}>
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          {pendingLabel}
        </span>
      ) : children}
    </button>
  );
}
