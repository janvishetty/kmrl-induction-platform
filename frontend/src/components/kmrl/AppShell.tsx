import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  GitBranch,
  FileStack,
  Search,
  ShieldCheck,
  Users,
  Bell,
  ScrollText,
  TrainFront,
  Map as MapIcon,
  Sun,
  Moon,
} from "lucide-react";
import { useApp } from "@/lib/kmrl/store";
import { useApiData } from "@/lib/kmrl/hooks";
import { fetchAlerts } from "@/lib/kmrl/api";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", key: "nav_dashboard", icon: LayoutDashboard },
  { to: "/planner", key: "nav_planner", icon: GitBranch, hero: true },
  { to: "/smartmap", key: "nav_smartmap", icon: MapIcon, hero: true },
  { to: "/documents", key: "nav_documents", icon: FileStack },
  { to: "/search", key: "nav_search", icon: Search },
  { to: "/compliance", key: "nav_compliance", icon: ShieldCheck },
  { to: "/staff", key: "nav_staff", icon: Users },
  { to: "/alerts", key: "nav_alerts", icon: Bell },
  { to: "/audit", key: "nav_audit", icon: ScrollText },
] as const;

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useApp();
  return (
    <div className={cn("flex gap-1 rounded-md border border-border p-1", !compact && "w-full")}>
      {(["light", "dark"] as const).map((m) => {
        const Icon = m === "light" ? Sun : Moon;
        return (
          <button
            key={m}
            onClick={() => setTheme(m)}
            aria-label={m === "light" ? "Light mode" : "Dark mode"}
            aria-pressed={theme === m}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
              theme === m
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {!compact && <span>{m === "light" ? "Light" : "Dark"}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: alerts } = useApiData(fetchAlerts);
  const criticals = (alerts ?? []).filter((alertItem) => alertItem.severity === "critical").length;


  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="grid size-10 place-items-center rounded-md bg-primary/15 text-primary">
            <TrainFront className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{t("appName")}</p>
            <p className="mono-label truncate">{t("appSub")}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--color-primary)]"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className={cn("size-4", active && "text-primary")} />
                <span className="flex-1 truncate">{t(item.key)}</span>
                {"hero" in item && item.hero && (
                  <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent">
                    CORE
                  </span>
                )}
                {item.to === "/alerts" && criticals > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    {criticals}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <p className="mono-label mb-2">Language / ഭാഷ</p>
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(["en", "ml"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                  lang === l
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l === "en" ? "English" : "മലയാളം"}
              </button>
            ))}
          </div>
          <p className="mono-label mt-4 mb-2">Appearance</p>
          <ThemeToggle />
        </div>

      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-background/85 px-5 py-3 backdrop-blur">
          <div className="lg:hidden">
            <p className="text-sm font-semibold">{t("appName")}</p>
          </div>
          <nav className="flex flex-wrap gap-1 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
            <ThemeToggle compact />
            <span className="hidden sm:inline">
              Duty Controller · Muttom OCC · 16 Aug 2026, 22:10 IST
            </span>

            <span className="flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Live feed
            </span>
            <div className="flex gap-1 lg:hidden">
              {(["en", "ml"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded px-2 py-1",
                    lang === l ? "bg-primary text-primary-foreground" : "border border-border",
                  )}
                >
                  {l === "en" ? "EN" : "ML"}
                </button>
              ))}
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  tag,
  action,
}: {
  title: string;
  subtitle: string;
  tag?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {tag && <p className="mono-label mb-1 text-accent">{tag}</p>}
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Citation({ docId, refLabel }: { docId: string; refLabel: string }) {
  return (
    <Link
      to="/documents"
      search={{ doc: docId } as never}
      className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary hover:bg-primary/20"
    >
      {docId} · {refLabel}
    </Link>
  );
}
