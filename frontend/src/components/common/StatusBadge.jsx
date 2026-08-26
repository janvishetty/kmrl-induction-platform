import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

// Status -> semantic token mapping. Colour is never the only signal:
// the uppercase label text always communicates the state too.
const MAP = {
  SERVICE: { cls: "bg-success/15 text-success border-success/30", key: "status_service" },
  STANDBY: { cls: "bg-warning/15 text-warning border-warning/30", key: "status_standby" },
  IBL: { cls: "bg-destructive/15 text-destructive border-destructive/30", key: "status_ibl" },
  AUTHENTIC: { cls: "bg-success/15 text-success border-success/30", key: "authentic" },
  TAMPERED: { cls: "bg-destructive/15 text-destructive border-destructive/30", key: "tampered" },
  UNVERIFIED: { cls: "bg-muted text-muted-foreground border-border", key: "unverified" },
};

export function StatusBadge({ status, className }) {
  const { t } = useApp();
  const conf = MAP[status] || MAP.UNVERIFIED;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide",
        conf.cls,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(conf.key)}
    </span>
  );
}
