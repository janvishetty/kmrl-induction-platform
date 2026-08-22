import type { Lang } from "./data";

type Dict = Record<string, { en: string; ml: string }>;

export const dict: Dict = {
  appName: { en: "KMRL Induction Intelligence", ml: "കെഎംആർഎൽ ഇൻഡക്ഷൻ ഇന്റലിജൻസ്" },
  appSub: { en: "Kochi Metro Rail Limited · Operations Control", ml: "കൊച്ചി മെട്രോ റെയിൽ ലിമിറ്റഡ് · ഓപ്പറേഷൻസ് കൺട്രോൾ" },
  nav_dashboard: { en: "Operations Dashboard", ml: "ഓപ്പറേഷൻസ് ഡാഷ്ബോർഡ്" },
  nav_planner: { en: "Induction Planner", ml: "ഇൻഡക്ഷൻ പ്ലാനർ" },
  nav_smartmap: { en: "Kochi Metro SmartMap", ml: "കൊച്ചി മെട്രോ സ്മാർട്ട്മാപ്പ്" },
  nav_documents: { en: "Document Intelligence", ml: "ഡോക്യുമെന്റ് ഇന്റലിജൻസ്" },
  nav_search: { en: "Semantic Search & Q&A", ml: "സെമാന്റിക് തിരയലും ചോദ്യോത്തരവും" },
  nav_compliance: { en: "Compliance", ml: "കംപ്ലയൻസ്" },
  nav_staff: { en: "Staff Competency", ml: "ജീവനക്കാരുടെ കഴിവ്" },
  nav_alerts: { en: "Alerts", ml: "അലേർട്ടുകൾ" },
  nav_audit: { en: "Audit Trail", ml: "ഓഡിറ്റ് ട്രെയിൽ" },
  nav_fares: { en: "Fare Calculator", ml: "ഫെയർ കാൽക്കുലേറ്റർ" },
  hero: { en: "Hero feature", ml: "പ്രധാന സവിശേഷത" },
  shift: { en: "Shift", ml: "ഷിഫ്റ്റ്" },
  requirement: { en: "Operational requirement", ml: "പ്രവർത്തന ആവശ്യകത" },
  generate: { en: "Generate explainable plan", ml: "വിശദീകരണ പ്ലാൻ സൃഷ്ടിക്കുക" },
  recommended: { en: "Recommended", ml: "ശുപാർശ ചെയ്തത്" },
  eligible: { en: "Eligible staff", ml: "യോഗ്യരായ ജീവനക്കാർ" },
  rejected: { en: "Rejected candidates", ml: "നിരസിച്ച ഉദ്യോഗാർത്ഥികൾ" },
  why: { en: "Why selected", ml: "എന്തുകൊണ്ട് തിരഞ്ഞെടുത്തു" },
  whyNot: { en: "Why rejected", ml: "എന്തുകൊണ്ട് നിരസിച്ചു" },
  conflicts: { en: "Conflicts & violations", ml: "വൈരുദ്ധ്യങ്ങളും ലംഘനങ്ങളും" },
  sources: { en: "Source citations", ml: "സ്രോതസ്സ് ഉദ്ധരണികൾ" },
  ask: { en: "Ask a question about KMRL documents", ml: "കെഎംആർഎൽ രേഖകളെക്കുറിച്ച് ചോദിക്കുക" },
  answer: { en: "AI answer", ml: "AI ഉത്തരം" },
  upload: { en: "Upload & index documents", ml: "രേഖകൾ അപ്‌ലോഡ് ചെയ്ത് ഇൻഡെക്സ് ചെയ്യുക" },
  page: { en: "page", ml: "പേജ്" },
  expired: { en: "Expired", ml: "കാലഹരണപ്പെട്ടു" },
  expiring: { en: "Expiring", ml: "കാലഹരണപ്പെടുന്നു" },
  valid: { en: "Valid", ml: "സാധുവാണ്" },
  critical: { en: "Critical", ml: "ഗുരുതരം" },
  warning: { en: "Warning", ml: "മുന്നറിയിപ്പ്" },
  info: { en: "Info", ml: "വിവരം" },
  search_ph: { en: "e.g. what blocks TS-11 from entering service tonight?", ml: "ഉദാ: ഇന്ന് രാത്രി TS-11 സർവീസിൽ കയറുന്നത് എന്ത് തടയുന്നു?" },
};

export function translate(key: string, lang: Lang): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang];
}
