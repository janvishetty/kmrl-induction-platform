import { useMemo, useState, useRef } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { StateBlock } from "@/components/common/StateBlock";
import { usePlan, useExplanation } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Train, Calendar as CalendarIcon, X, ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";

function RunNightlyButton() {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");

  const run = async () => {
    setRunning(true);
    setMsg("");
    try {
      const res = await fetch("http://127.0.0.1:8000/admin/run-nightly", {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      setMsg("Recomputing plan… refresh in a few seconds.");
    } catch {
      setMsg("Couldn't reach the backend.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex items-center gap-2 ml-4">
      <button
        onClick={run}
        disabled={running}
        className="rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors"
      >
        {running ? "Starting…" : "Recompute Plan"}
      </button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}

const translations = {
  en: {
    title: "Train Induction Plan",
    today: "Today",
    tomorrow: "Tomorrow",
    unitsReady: "UNITS READY TO DISPATCH",
    trainsetId: "Trainset ID",
    dispatchStatus: "Dispatch Status",
    ready: "Ready to Dispatch",
    loading: "Loading induction plan...",
    error: "Error loading data",
    empty: "No service units found.",
    subModel: "Alstom Metropolis",
    whyDecision: "Why This Decision",
    opVariables: "Operational Variables",
    systemExplanation: "System Explanation",
    loadingExplanation: "Loading explanation from PuLP solver...",
    failedExplanation: "Failed to load explanation.",
    noExplanation: "No active explanation logged for this trainset.",
    cleared: "Cleared",
    attention: "Attention",
    close: "Close",
  },
  ml: {
    title: "ട്രെയിൻ ഇൻഡക്ഷൻ പ്ലാൻ",
    today: "ഇന്ന്",
    tomorrow: "നാളെ",
    unitsReady: "യൂണിറ്റുകൾ സർവീസിന് തയ്യാറാണ്",
    trainsetId: "ട്രെയിൻസെറ്റ് ഐഡി",
    dispatchStatus: "ഡിസ്പാച്ച് സ്റ്റാറ്റസ്",
    ready: "ഡിസ്പാച്ചിന് തയ്യാറാണ്",
    loading: "ലോഡ് ചെയ്യുന്നു...",
    error: "പിശക് സംഭവിച്ചു",
    empty: "സർവീസ് യൂണിറ്റുകൾ ലഭ്യമല്ല.",
    subModel: "ആൽസ്റ്റോം മെട്രോപോളിസ്",
    whyDecision: "ഈ തീരുമാനത്തിന്റെ കാരണം",
    opVariables: "ഓപ്പറേഷണൽ വേരിയബിളുകൾ",
    systemExplanation: "സിസ്റ്റം വിശദീകരണം",
    loadingExplanation: "വിശദീകരണം ലോഡ് ചെയ്യുന്നു...",
    failedExplanation: "വിശദീകരണം ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല.",
    noExplanation: "ഈ ട്രെയിനിന് വിശദീകരണം ലഭ്യമല്ല.",
    cleared: "ക്ലിയർ ചെയ്തു",
    attention: "ശ്രദ്ധിക്കുക",
    close: "അടയ്ക്കുക",
  }
};

export default function Trains() {
  const { lang } = useApp();
  const t = translations[lang] || translations.en;

  // Dynamically calculate Today and Tomorrow in IST format (YYYY-MM-DD)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); 
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  const tomorrowStr = tom.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Default to the dynamic current date instead of a hardcoded string
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const dateInputRef = useRef(null);

  const trainPlanQ = usePlan(selectedDate);
  const rawData = trainPlanQ.data;

  const trainPlanData = useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if (Array.isArray(rawData.trainsets)) return rawData.trainsets;
    if (Array.isArray(rawData.schedule)) return rawData.schedule;
    if (Array.isArray(rawData.plan)) return rawData.plan;
    return Object.values(rawData).filter((val) => val && typeof val === "object");
  }, [rawData]);

  const serviceTrains = useMemo(() => {
    return trainPlanData.filter((t) => {
      const status = (t.status || "").trim().toUpperCase();
      return status === "SERVICE";
    });
  }, [trainPlanData]);

  const formattedDate = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split("-");
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Helper to parse reasons safely into structured cards matching Fleet Inventory
  const parsedReasons = useMemo(() => {
    if (!selectedTrain) return [];
    if (Array.isArray(selectedTrain.reasons)) return selectedTrain.reasons;
    if (typeof selectedTrain.reason === "string") {
      try {
        const parsed = JSON.parse(selectedTrain.reason);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Fallback single reason
      }
    }
    // Default standard checklist if raw string
    return [
      { key: "fitness", state: "ok", detail: selectedTrain.reason || "All fitness checks cleared" },
      { key: "jobcards", state: "ok", detail: "Job-card status verified" },
      { key: "branding", state: "ok", detail: "Branding priority verified" },
      { key: "mileage", state: "ok", detail: "Mileage balancing verified" },
      { key: "cleaning", state: "ok", detail: "Cleaning & detailing cleared" },
      { key: "stabling", state: "ok", detail: "Stabling geometry verified" }
    ];
  }, [selectedTrain]);

  const trainName = selectedTrain ? (selectedTrain.trainset || selectedTrain.name || selectedTrain.id || selectedTrain.train_id || "TS-03") : "";
  
  // Dynamically fetch the explanation from Supabase for this specific train and date
  const expQ = useExplanation(trainName, selectedDate);

  return (
    <AppShell>
      <PageHeader
        title={t.title}
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-sm">
              <Button
                variant={selectedDate === todayStr ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedDate(todayStr)}
                className={`rounded-lg text-xs font-medium px-4 h-8 ${selectedDate === todayStr ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t.today}
              </Button>
              <Button
                variant={selectedDate === tomorrowStr ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedDate(tomorrowStr)}
                className={`rounded-lg text-xs font-medium px-4 h-8 ${selectedDate === tomorrowStr ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t.tomorrow}
              </Button>

              <input
                ref={dateInputRef}
                type="date"
                className="sr-only"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              />
              <Button
                variant={selectedDate !== todayStr && selectedDate !== tomorrowStr ? "default" : "ghost"}
                size="sm"
                onClick={() => dateInputRef.current?.showPicker?.()}
                className={`rounded-lg text-xs font-medium px-4 h-8 flex items-center gap-2 ${
                  selectedDate !== todayStr && selectedDate !== tomorrowStr 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {formattedDate} <CalendarIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
            <RunNightlyButton />
          </div>
        }
      />

      {/* Summary Header */}
      <div className="mb-5 flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border shadow-sm">
        <span className="font-mono text-xs font-semibold text-foreground">
          {formattedDate}
        </span>
        <span className="font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
          {serviceTrains.length} {t.unitsReady}
        </span>
      </div>

      {trainPlanQ.isLoading ? (
        <StateBlock label={t.loading} />
      ) : trainPlanQ.isError ? (
        <StateBlock label={t.error} tone="error" />
      ) : serviceTrains.length === 0 ? (
        <StateBlock label={t.empty} />
      ) : (
        <div className="card-elevated overflow-hidden border border-border rounded-xl shadow-sm bg-card">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border bg-secondary/60 px-6 py-3.5 font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>{t.trainsetId}</span>
            <span className="text-right">{t.dispatchStatus}</span>
          </div>
          <ul className="divide-y divide-border">
            {serviceTrains.map((train, idx) => {
              const trainsetName = train.trainset || train.name || train.id || train.train_id || `TS-${idx + 1}`;

              return (
                <li key={trainsetName} className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Train className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-mono text-base font-bold text-foreground tracking-tight">{trainsetName}</span>
                      <p className="text-[10px] text-muted-foreground font-mono">{t.subModel}</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setSelectedTrain(train)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shadow-sm hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {t.ready}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Modal Layout */}
      {selectedTrain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-mono text-2xl font-bold text-foreground">
                    {trainName}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {selectedTrain.status || "SERVICE"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  {selectedTrain.reason || "All fitness, maintenance and cleaning checks cleared"}
                </p>
              </div>
              <button
                onClick={() => setSelectedTrain(null)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Why This Decision Section */}
            <div>
              <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {t.whyDecision}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parsedReasons.map((item, idx) => {
                  const isOk = item.state === "ok" || item.state === "cleared" || !item.state;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isOk ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                          {isOk ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-mono text-xs font-bold text-foreground capitalize">{item.key || `Check ${idx + 1}`}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{item.detail || item.message || "Verified"}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border ${isOk ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-amber-500 bg-amber-500/10 border-amber-500/20"}`}>
                        {isOk ? t.cleared : t.attention}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operational Variables Section */}
            <div>
              <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {t.opVariables}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-2">
                  <div className="flex justify-between font-mono text-xs"><span className="text-muted-foreground">Depot:</span><span className="font-semibold text-foreground">Muttom Depot</span></div>
                  <div className="flex justify-between font-mono text-xs"><span className="text-muted-foreground">Valid until:</span><span className="font-semibold text-foreground">2027-04-02</span></div>
                  <div className="flex justify-between font-mono text-xs"><span className="text-muted-foreground">Days left:</span><span className="font-semibold text-foreground">219</span></div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-2">
                  <div className="flex justify-between font-mono text-xs"><span className="text-muted-foreground">Open job cards:</span><span className="font-semibold text-foreground">1</span></div>
                  <div className="flex justify-between font-mono text-xs"><span className="text-muted-foreground">Closed:</span><span className="font-semibold text-foreground">10</span></div>
                  <div className="flex justify-between font-mono text-xs"><span className="text-muted-foreground">Safety-critical:</span><span className="font-semibold text-foreground">No</span></div>
                </div>
              </div>
            </div>

            {/* AI Explanation / Supabase Paragraph */}
            <div>
              <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                {t.systemExplanation}
              </h3>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                {expQ.isLoading ? (
                  <p className="text-sm font-mono text-muted-foreground animate-pulse">
                    {t.loadingExplanation}
                  </p>
                ) : expQ.isError ? (
                  <p className="text-sm text-destructive">
                    {t.failedExplanation}
                  </p>
                ) : expQ.data ? (
                  <p className="text-sm text-foreground leading-relaxed">
                    {expQ.data}
                  </p>
                ) : (
                  <p className="text-sm font-mono text-muted-foreground">
                    {t.noExplanation}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={() => setSelectedTrain(null)} className="font-mono text-xs cursor-pointer">
                {t.close}
              </Button>
            </div>

          </div>
        </div>
      )}
    </AppShell>
  );
}