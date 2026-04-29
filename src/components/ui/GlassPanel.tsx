import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

export default function GlassPanel({ children, className }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/70 bg-white/75 shadow-[0_20px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
