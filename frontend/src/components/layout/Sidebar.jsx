import { NavLink } from "react-router-dom";
import { LayoutDashboard, TrainFront, Train, FileCheck2, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

const ITEMS = [
  { to: "/", key: "nav_dashboard", label: "Dashboard", malayalam: "ഡാഷ്‌ബോർഡ്", icon: LayoutDashboard, end: true },
  { to: "/trains", key: "nav_trains", label: "Train Induction", malayalam: "ട്രെയിൻ ഇൻഡക്ഷൻ", icon: Train },
  { to: "/train-plan", key: "nav_trainplan", label: "Fleet Inventory", malayalam: "ഫ്ലീറ്റ് ഇൻവെന്ററി", icon: TrainFront },
  { to: "/documents", key: "nav_documents", label: "Documents", malayalam: "രേഖകൾ", icon: FileCheck2 },
  { to: "/map", key: "nav_map", label: "Operations Map", malayalam: "ഓപ്പറേഷൻസ് മാപ്പ്", icon: MapIcon },
];

export function SidebarContent({ onNavigate }) {
  const { lang } = useApp();
  const isMalayalam = lang === "ml" || lang?.toLowerCase()?.includes("malayalam");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[hsl(213_33%_9%)] p-1.5 ring-1 ring-sidebar-border">
          <img src="/kmrl-mark.png" alt="Kochi Metro Rail Limited" className="h-full w-full object-contain" />
        </span>
        <div className="min-w-0">
          <div className="truncate font-display text-[15px] font-bold text-sidebar-foreground">Rail Dhara</div>
          <div className="mono-label text-[10px]">KMRL OPS</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary">
        {ITEMS.map(({ to, label, malayalam, icon: Icon, end }) => {
          const displayText = isMalayalam ? malayalam : label;

          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{displayText}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="mono-label text-[10px] leading-relaxed">KMRL TRAINSET INDUCTION</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent />
      </div>
    </aside>
  );
}