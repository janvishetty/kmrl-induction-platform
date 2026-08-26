import { Menu, Moon, Sun } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";
import { useEffect, useState } from "react";
import { nowLabel } from "@/lib/datetime";
import { cn } from "@/lib/utils";

function Clock() {
  const [label, setLabel] = useState(nowLabel());
  useEffect(() => {
    const id = setInterval(() => setLabel(nowLabel()), 30000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs text-muted-foreground">{label}</span>;
}

function LangSwitch() {
  const { lang, setLang, t } = useApp();
  const base = "px-2 py-1 text-xs font-semibold rounded transition-colors";
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5" role="group" aria-label={t("lang_toggle")}>
      <button className={cn(base, lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        onClick={() => setLang("en")} aria-pressed={lang === "en"}>EN</button>
      <button className={cn(base, "font-sans", lang === "ml" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        onClick={() => setLang("ml")} aria-pressed={lang === "ml"}>മലയാളം</button>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme, t } = useApp();
  return (
    <button
      onClick={toggleTheme}
      aria-label={t("theme_toggle")}
      title={theme === "dark" ? t("theme_light") : t("theme_dark")}
      className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

export function Header() {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open navigation">
            <Menu className="h-[18px] w-[18px]" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">{t("appName")}</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden sm:block"><Clock /></div>
      <div className="ml-auto flex items-center gap-2">
        <LangSwitch />
        <ThemeToggle />
      </div>
    </header>
  );
}
