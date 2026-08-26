import { cn } from "@/lib/utils";

// Compact loading / empty / error blocks — minimal, no illustrations or marketing copy.
export function StateBlock({ label, tone = "muted", className }) {
  const toneCls =
    tone === "error" ? "text-destructive" : tone === "strong" ? "text-foreground" : "text-muted-foreground";
  return (
    <div
      role="status"
      className={cn(
        "flex min-h-[120px] items-center justify-center rounded-xl border border-border bg-card px-4 py-8 text-center text-sm shadow-card",
        toneCls,
        className
      )}
    >
      {label}
    </div>
  );
}
