import { documents, type KDocument, type DocChunk, type Lang } from "./data";

/**
 * Lightweight offline "semantic" retrieval: concept expansion + weighted
 * term overlap so that conceptually related queries match documents that do
 * not literally contain the query words (demonstrates semantic vs keyword).
 */
const CONCEPTS: Record<string, string[]> = {
  induction: ["induction", "service", "standby", "ibl", "night", "plan", "stabling", "revenue"],
  fitness: ["fitness", "certificate", "validity", "renewal", "expiry", "inspection", "certification"],
  block: ["block", "blocks", "blocking", "prevent", "stop", "restrict", "hold", "bar"],
  fatigue: ["fatigue", "rest", "hours", "shift", "roster", "tired", "duty"],
  safety: ["safety", "msc", "competency", "hazard", "incident", "violation", "risk"],
  signalling: ["signalling", "atp", "cbtc", "transponder", "telecom", "s&t", "job", "card"],
  cleaning: ["cleaning", "clean", "roster", "bay", "housekeeping", "interior"],
  branding: ["branding", "advertiser", "exposure", "contract", "penalty", "wrap"],
  mileage: ["mileage", "km", "wear", "bogie", "wheel", "balancing"],
  staff: ["staff", "employee", "technician", "engineer", "operator", "competency", "training"],
  malayalam: ["malayalam", "മലയാളം", "ഭാഷ"],
};

const ML_HINTS: Record<string, string> = {
  ഫിറ്റ്നസ്: "fitness",
  സർട്ടിഫിക്കറ്റ്: "certificate",
  ഇൻഡക്ഷൻ: "induction",
  സുരക്ഷ: "safety",
  ജീവനക്കാർ: "staff",
  ക്ലീനിംഗ്: "cleaning",
  വിശ്രമം: "rest",
};

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9\u0d00-\u0d7f-]+/i)
    .filter(Boolean);
}

function expand(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    const mapped = ML_HINTS[t];
    if (mapped) out.add(mapped);
    for (const [, group] of Object.entries(CONCEPTS)) {
      if (group.includes(t) || (mapped && group.includes(mapped)))
        group.forEach((g) => out.add(g));
    }
  }
  return out;
}

export interface SearchHit {
  doc: KDocument;
  chunk: DocChunk;
  score: number;
  matched: string[];
}

export function semanticSearch(query: string, docs: KDocument[] = documents): SearchHit[] {
  const raw = tokenize(query);
  if (raw.length === 0) return [];
  const expanded = expand(raw);
  const hits: SearchHit[] = [];

  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      const hay = `${chunk.text} ${chunk.textMl ?? ""} ${chunk.section} ${doc.title} ${doc.titleMl} ${doc.type} ${doc.department} ${doc.tags.join(" ")} ${(doc.trainsets ?? []).join(" ")} ${(doc.employeeIds ?? []).join(" ")}`.toLowerCase();
      let score = 0;
      const matched: string[] = [];
      for (const term of expanded) {
        if (term.length < 2) continue;
        if (hay.includes(term)) {
          const direct = raw.includes(term);
          score += direct ? 3 : 1;
          if (direct) matched.push(term);
        }
      }
      if (score > 0) {
        // small boost for freshness and classification confidence
        score += doc.confidence * 2;
        hits.push({ doc, chunk, score, matched });
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 8);
}

export interface QAResult {
  answer: string;
  answerMl: string;
  confidence: number;
  citations: SearchHit[];
}

const CURATED: {
  match: RegExp;
  answer: string;
  answerMl: string;
  docs: string[];
}[] = [
  {
    match: /ts-?11|transponder|atp/i,
    answer:
      "TS-11 cannot be inducted into SERVICE tonight. Safety-critical job card JC-4471 (ATP transponder replacement) is still open and has crossed the 24-hour closure SLA, and induction guidelines require all open safety-critical job cards to be closed and countersigned by a certified S&T technician before revenue service. TS-11 is currently stabled on line 5 adjacent to the IBL entry, so movement into the inspection bay needs no shunting.",
    answerMl:
      "ഇന്ന് രാത്രി TS-11 സർവീസിലേക്ക് ഉൾപ്പെടുത്താൻ കഴിയില്ല. സുരക്ഷാ നിർണായക ജോബ് കാർഡ് JC-4471 (ATP ട്രാൻസ്‌പോണ്ടർ മാറ്റം) ഇപ്പോഴും തുറന്നിരിക്കുന്നു, 24 മണിക്കൂർ SLA കടന്നു. TS-11 ഇപ്പോൾ IBL പ്രവേശനത്തിനടുത്ത് 5-ാം ലൈനിൽ നിർത്തിയിരിക്കുന്നു.",
    docs: ["DOC-1088", "DOC-1121", "DOC-1195"],
  },
  {
    match: /ts-?07|fitness/i,
    answer:
      "The rolling stock fitness certificate for TS-07 is valid only until 20 August 2026. Because renewal inspection must begin at least 72 hours before expiry, the inspection has to start by 17 August 2026 at Muttom Depot. Brake pad wear on bogie 2 is at 62% of the service limit — acceptable for service with re-measurement at the next B-check.",
    answerMl:
      "TS-07 ന്റെ ഫിറ്റ്നസ് സർട്ടിഫിക്കറ്റ് 2026 ഓഗസ്റ്റ് 20 വരെ മാത്രമേ സാധുവുള്ളൂ. കാലാവധിക്ക് 72 മണിക്കൂർ മുൻപ് പുതുക്കൽ പരിശോധന ആരംഭിക്കണം, അതായത് ഓഗസ്റ്റ് 17 ന് മുൻപ്.",
    docs: ["DOC-1042", "DOC-1121"],
  },
  {
    match: /(who|eligible|staff|rest|fatigue|competen)/i,
    answer:
      "Eligibility for night induction duty requires a valid Metro Safety Competency (MSC) certificate, at least 11 hours of continuous rest since the previous shift, and no more than 6 rostered shifts in a rolling 7-day window. On today's roster KM-1877 is blocked (MSC expired 01 Aug 2026, re-assessment marked ABSENT) and KM-5520 fails the rest rule with only 8 hours since the last shift.",
    answerMl:
      "രാത്രി ഇൻഡക്ഷൻ ഡ്യൂട്ടിക്ക് സാധുവായ MSC സർട്ടിഫിക്കറ്റ്, കുറഞ്ഞത് 11 മണിക്കൂർ വിശ്രമം, 7 ദിവസത്തിൽ 6 ഷിഫ്റ്റിൽ കൂടരുത് എന്നിവ ആവശ്യമാണ്. KM-1877 തടയപ്പെട്ടു, KM-5520 വിശ്രമ നിയമം പാലിക്കുന്നില്ല.",
    docs: ["DOC-1121", "DOC-1170"],
  },
  {
    match: /brand|advertis|exposure|penalty/i,
    answer:
      "TS-15 carries the Kerala Bank wrap and is contractually required to log 380 revenue service hours per calendar month. It has logged 291 hours so far this month; a shortfall beyond 5% (below 361 hours) triggers a pro-rata penalty payable to the advertiser, so TS-15 should be prioritised for SERVICE allocation.",
    answerMl:
      "TS-15 കേരള ബാങ്ക് റാപ്പ് വഹിക്കുന്നു, മാസത്തിൽ 380 സർവീസ് മണിക്കൂർ ആവശ്യമാണ്. ഇതുവരെ 291 മണിക്കൂർ മാത്രം. 361 മണിക്കൂറിൽ താഴെയായാൽ പിഴ ബാധകമാകും.",
    docs: ["DOC-1163", "DOC-1184"],
  },
  {
    match: /clean|bay|housekeep/i,
    answer:
      "Muttom Depot has only two deep-clean bays per night. For 16 August they are allocated to TS-07 and TS-21, so any further trainset needing an interior deep clean must be deferred to the next night — this is a hard constraint when reconciling the induction list.",
    answerMl:
      "മുട്ടം ഡിപ്പോയിൽ രാത്രിയിൽ രണ്ട് ഡീപ്-ക്ലീൻ ബേകൾ മാത്രം. ഓഗസ്റ്റ് 16 ന് അവ TS-07, TS-21 എന്നിവയ്ക്കാണ്.",
    docs: ["DOC-1156", "DOC-1121"],
  },
];

export function askQuestion(question: string, docs: KDocument[] = documents): QAResult {
  const hits = semanticSearch(question, docs);
  const curated = CURATED.find((c) => c.match.test(question));

  if (curated) {
    const cited = curated.docs
      .map((id) => hits.find((h) => h.doc.id === id) ?? fallbackHit(id, docs))
      .filter(Boolean) as SearchHit[];
    return {
      answer: curated.answer,
      answerMl: curated.answerMl,
      confidence: 0.93,
      citations: cited.length ? cited : hits.slice(0, 3),
    };
  }

  if (hits.length === 0) {
    return {
      answer:
        "No indexed KMRL document supports an answer to that question. Upload the relevant source document, or rephrase using an operational term such as fitness certificate, job card, stabling, branding exposure or staff competency.",
      answerMl:
        "ആ ചോദ്യത്തിന് ഉത്തരം നൽകാൻ ഇൻഡെക്സ് ചെയ്ത രേഖകളൊന്നുമില്ല. പ്രസക്തമായ രേഖ അപ്‌ലോഡ് ചെയ്യുക അല്ലെങ്കിൽ ചോദ്യം മാറ്റി ചോദിക്കുക.",
      confidence: 0.2,
      citations: [],
    };
  }

  const top = hits.slice(0, 3);
  const first = top[0]!;
  const summary = top
    .map((h) => h.chunk.text.split(". ")[0] ?? h.chunk.text)
    .join(". ")
    .concat(".");
  return {
    answer: `Based on ${top.length} indexed passages: ${summary}`,
    answerMl: `${top.length} ഇൻഡെക്സ് ചെയ്ത ഭാഗങ്ങളെ അടിസ്ഥാനമാക്കി: ${top
      .map((h) => h.chunk.textMl ?? h.chunk.text.split(". ")[0])
      .join(" ")}`,
    confidence: Math.min(0.9, 0.45 + first.score / 40),
    citations: top,
  };
}

function fallbackHit(docId: string, docs: KDocument[]): SearchHit | null {
  const doc = docs.find((d) => d.id === docId);
  const chunk = doc?.chunks[0];
  if (!doc || !chunk) return null;
  return { doc, chunk, score: 1, matched: [] };
}

export function localized<T extends { text: string; textMl?: string }>(
  chunk: T,
  lang: Lang,
): string {
  return lang === "ml" && chunk.textMl ? chunk.textMl : chunk.text;
}
