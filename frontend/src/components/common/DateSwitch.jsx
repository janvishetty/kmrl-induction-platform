import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { formatDate } from "@/lib/datetime";

// Compact Today | Tomorrow [ | Select Date ] control. No large calendar UI.
export function DateSwitch({ mode, onMode, customDate, onCustomDate, allowCustom = false, className }) {
  const { t } = useApp();
  const base =
    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const active = "bg-primary text-primary-foreground";
  const idle = "text-muted-foreground hover:text-foreground hover:bg-secondary";

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1", className)}>
      <button type="button" className={cn(base, mode === "today" ? active : idle)} onClick={() => onMode("today")}
        aria-pressed={mode === "today"}>
        {t("today")}
      </button>
      <button type="button" className={cn(base, mode === "tomorrow" ? active : idle)} onClick={() => onMode("tomorrow")}
        aria-pressed={mode === "tomorrow"}>
        {t("tomorrow")}
      </button>
      {allowCustom && (
        <label
          className={cn(
            base,
            "flex items-center gap-2 cursor-pointer",
            mode === "custom" ? active : idle
          )}
        >
          <span>{mode === "custom" && customDate ? formatDate(customDate) : t("select_date")}</span>
          <input
            type="date"
            aria-label={t("select_date")}
            value={customDate || ""}
            onChange={(e) => {
              if (e.target.value) {
                onCustomDate(e.target.value);
                onMode("custom");
              }
            }}
            className="w-4 bg-transparent text-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
          />
        </label>
      )}
    </div>
  );
}
