// Realistic mock KMRL (Kochi Metro Rail Limited) operations data.
// Everything the prototype demonstrates is derived from this module.

export type Lang = "en" | "ml";

export type DocType =
  | "Fitness Certificate"
  | "Job Card"
  | "Maintenance Log"
  | "Training Record"
  | "Safety Circular"
  | "Branding Contract"
  | "Cleaning Roster"
  | "Incident Report"
  | "Mileage Report";

export type Department =
  | "Rolling Stock"
  | "Signalling & Telecom"
  | "Operations"
  | "Safety & Compliance"
  | "Housekeeping"
  | "Commercial";

export interface DocChunk {
  id: string;
  page: number;
  section: string;
  text: string;
  textMl?: string;
}

export interface KDocument {
  id: string;
  title: string;
  titleMl: string;
  fileName: string;
  format: "PDF" | "XLSX" | "DOCX" | "IMAGE" | "EMAIL";
  type: DocType;
  department: Department;
  language: "en" | "ml" | "bilingual";
  uploadedBy: string;
  uploadedAt: string;
  effectiveFrom?: string;
  expiresOn?: string;
  trainsets?: string[];
  employeeIds?: string[];
  confidence: number; // classification confidence 0-1
  status: "Indexed" | "Processing" | "Needs Review";
  tags: string[];
  chunks: DocChunk[];
}

export interface Certification {
  code: string;
  name: string;
  nameMl: string;
  issuedOn: string;
  expiresOn: string;
  docId: string;
}

export interface Staff {
  id: string;
  name: string;
  nameMl: string;
  role: string;
  department: Department;
  depot: "Muttom Depot" | "Aluva Station" | "Kalamassery Yard";
  experienceYears: number;
  languages: ("English" | "Malayalam" | "Hindi")[];
  certifications: Certification[];
  trainingHours12m: number;
  restHoursSinceLastShift: number;
  shiftsLast7Days: number;
  availability: "Available" | "On Leave" | "On Duty" | "Rest Period";
  competencyScore: number; // 0-100
  photoInitials: string;
}

export interface AlertItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  titleMl: string;
  detail: string;
  category: "Compliance" | "Document" | "Induction" | "Safety";
  linkedDocId?: string;
  linkedStaffId?: string;
  raisedAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action:
    | "UPLOAD"
    | "SEARCH"
    | "QA"
    | "APPROVE"
    | "OVERRIDE"
    | "PLAN_GENERATED"
    | "CLASSIFY"
    | "EXPORT";
  target: string;
  detail: string;
}

export const TODAY = new Date("2026-08-16T17:00:00+05:30");

export function daysUntil(dateIso: string): number {
  return Math.round(
    (new Date(dateIso).getTime() - TODAY.getTime()) / 86400000,
  );
}

export const documents: KDocument[] = [
  {
    id: "DOC-1042",
    title: "Rolling Stock Fitness Certificate — Trainset TS-07",
    titleMl: "റോളിംഗ് സ്റ്റോക്ക് ഫിറ്റ്നസ് സർട്ടിഫിക്കറ്റ് — TS-07",
    fileName: "RS_Fitness_TS07_2026.pdf",
    format: "PDF",
    type: "Fitness Certificate",
    department: "Rolling Stock",
    language: "bilingual",
    uploadedBy: "A. Menon (Rolling Stock)",
    uploadedAt: "2026-08-02T09:14:00+05:30",
    effectiveFrom: "2026-02-15",
    expiresOn: "2026-08-20",
    trainsets: ["TS-07"],
    employeeIds: ["KM-2291"],
    confidence: 0.96,
    status: "Indexed",
    tags: ["fitness", "TS-07", "expiring"],
    chunks: [
      {
        id: "DOC-1042#p2s3",
        page: 2,
        section: "3. Validity & Renewal",
        text: "The rolling stock fitness certificate for trainset TS-07 remains valid until 20 August 2026. Renewal inspection must be completed at Muttom Depot at least 72 hours before expiry, failing which the trainset shall not be inducted into revenue service.",
        textMl:
          "TS-07 ട്രെയിൻസെറ്റിന്റെ ഫിറ്റ്നസ് സർട്ടിഫിക്കറ്റ് 2026 ഓഗസ്റ്റ് 20 വരെ സാധുവാണ്. കാലാവധി തീരുന്നതിന് 72 മണിക്കൂർ മുൻപ് മുട്ടം ഡിപ്പോയിൽ പുതുക്കൽ പരിശോധന പൂർത്തിയാക്കണം.",
      },
      {
        id: "DOC-1042#p3s1",
        page: 3,
        section: "4. Brake & Bogie Observations",
        text: "Brake pad wear on bogie 2 measured at 62% of service limit. Acceptable for service; re-measure at next B-check. No restriction on maximum operating speed.",
      },
    ],
  },
  {
    id: "DOC-1088",
    title: "Job Card Backlog — Signalling, Week 33",
    titleMl: "ജോബ് കാർഡ് ബാക്ക്‌ലോഗ് — സിഗ്നലിംഗ്, ആഴ്ച 33",
    fileName: "JobCards_Signalling_W33.xlsx",
    format: "XLSX",
    type: "Job Card",
    department: "Signalling & Telecom",
    language: "en",
    uploadedBy: "R. Pillai (S&T)",
    uploadedAt: "2026-08-14T18:40:00+05:30",
    trainsets: ["TS-03", "TS-11", "TS-19"],
    employeeIds: ["KM-3310", "KM-2288"],
    confidence: 0.91,
    status: "Indexed",
    tags: ["job-card", "backlog", "S&T"],
    chunks: [
      {
        id: "DOC-1088#p1s2",
        page: 1,
        section: "Sheet: OpenJobs",
        text: "Three open job cards remain against trainsets TS-03, TS-11 and TS-19. JC-4471 (TS-11, ATP transponder replacement) is safety-critical and blocks induction into SERVICE until closed and countersigned by a certified S&T technician.",
      },
      {
        id: "DOC-1088#p2s1",
        page: 2,
        section: "Sheet: Closure SLA",
        text: "Average closure time for safety-critical job cards is 26 hours against an SLA of 24 hours. Escalation to the Chief Signalling Engineer is required beyond 36 hours.",
      },
    ],
  },
  {
    id: "DOC-1121",
    title: "Night Induction Plan Guidelines (Revision 4)",
    titleMl: "രാത്രി ഇൻഡക്ഷൻ പ്ലാൻ മാർഗ്ഗനിർദ്ദേശങ്ങൾ (പതിപ്പ് 4)",
    fileName: "Induction_Guidelines_Rev4.docx",
    format: "DOCX",
    type: "Safety Circular",
    department: "Operations",
    language: "bilingual",
    uploadedBy: "S. Thomas (Ops Control)",
    uploadedAt: "2026-07-28T11:02:00+05:30",
    effectiveFrom: "2026-08-01",
    confidence: 0.98,
    status: "Indexed",
    tags: ["induction", "policy", "night"],
    chunks: [
      {
        id: "DOC-1121#p4s2",
        page: 4,
        section: "6.2 Staff Eligibility",
        text: "Staff nominated for night induction duty must hold a valid Metro Safety Competency (MSC) certificate, must have completed a minimum of 11 hours continuous rest since the previous shift, and must not exceed 6 rostered shifts in a rolling 7-day window.",
        textMl:
          "രാത്രി ഇൻഡക്ഷൻ ഡ്യൂട്ടിക്ക് നിർദ്ദേശിക്കപ്പെടുന്ന ജീവനക്കാർക്ക് സാധുവായ MSC സർട്ടിഫിക്കറ്റ് ഉണ്ടായിരിക്കണം, മുൻ ഷിഫ്റ്റിന് ശേഷം കുറഞ്ഞത് 11 മണിക്കൂർ വിശ്രമം വേണം.",
      },
      {
        id: "DOC-1121#p5s1",
        page: 5,
        section: "6.5 Trainset Readiness",
        text: "A trainset may be inducted into SERVICE only when fitness certificate validity, open job cards, branding exposure commitment, cleaning slot and stabling geometry are simultaneously reconciled by the duty controller.",
      },
    ],
  },
  {
    id: "DOC-1156",
    title: "Muttom Depot Cleaning Roster — August 2026",
    titleMl: "മുട്ടം ഡിപ്പോ ക്ലീനിംഗ് റോസ്റ്റർ — ഓഗസ്റ്റ് 2026",
    fileName: "Cleaning_Roster_Aug2026.xlsx",
    format: "XLSX",
    type: "Cleaning Roster",
    department: "Housekeeping",
    language: "en",
    uploadedBy: "L. George (Housekeeping)",
    uploadedAt: "2026-07-31T08:20:00+05:30",
    trainsets: ["TS-02", "TS-07", "TS-15", "TS-21"],
    confidence: 0.88,
    status: "Indexed",
    tags: ["cleaning", "roster", "depot"],
    chunks: [
      {
        id: "DOC-1156#p1s1",
        page: 1,
        section: "Deep Clean Slots",
        text: "Only two deep-clean bays are available per night at Muttom Depot. On 16 August the bays are allocated to TS-07 and TS-21; any additional trainset requiring interior deep clean must be deferred to the following night.",
      },
    ],
  },
  {
    id: "DOC-1163",
    title: "Branding Exposure Contract — Kerala Bank Wrap",
    titleMl: "ബ്രാൻഡിംഗ് എക്സ്പോഷർ കരാർ — കേരള ബാങ്ക് റാപ്പ്",
    fileName: "Branding_KeralaBank_Contract.pdf",
    format: "PDF",
    type: "Branding Contract",
    department: "Commercial",
    language: "en",
    uploadedBy: "N. Rajan (Commercial)",
    uploadedAt: "2026-06-11T15:31:00+05:30",
    effectiveFrom: "2026-06-15",
    expiresOn: "2026-12-15",
    trainsets: ["TS-15"],
    confidence: 0.94,
    status: "Indexed",
    tags: ["branding", "contract", "exposure"],
    chunks: [
      {
        id: "DOC-1163#p6s2",
        page: 6,
        section: "Clause 9 — Minimum Exposure",
        text: "The wrapped trainset TS-15 must accumulate a minimum of 380 revenue service hours per calendar month. Shortfall beyond 5% attracts a pro-rata penalty payable to the advertiser.",
      },
    ],
  },
  {
    id: "DOC-1170",
    title: "Metro Safety Competency Training Record — Batch 22",
    titleMl: "മെട്രോ സേഫ്റ്റി കോംപിറ്റൻസി പരിശീലന രേഖ — ബാച്ച് 22",
    fileName: "MSC_Training_Batch22.pdf",
    format: "PDF",
    type: "Training Record",
    department: "Safety & Compliance",
    language: "bilingual",
    uploadedBy: "P. Varghese (Safety)",
    uploadedAt: "2026-08-09T10:05:00+05:30",
    employeeIds: ["KM-2291", "KM-3310", "KM-4102", "KM-1877"],
    confidence: 0.93,
    status: "Indexed",
    tags: ["training", "MSC", "competency"],
    chunks: [
      {
        id: "DOC-1170#p2s1",
        page: 2,
        section: "Annexure A — Certified Candidates",
        text: "Candidates KM-2291, KM-3310 and KM-4102 cleared the Metro Safety Competency assessment with scores above 85%. Candidate KM-1877 was marked ABSENT and must be re-assessed before being rostered for safety-critical duty.",
        textMl:
          "KM-2291, KM-3310, KM-4102 എന്നിവർ 85% ന് മുകളിൽ സ്കോർ നേടി MSC വിലയിരുത്തൽ വിജയിച്ചു. KM-1877 ഹാജരായില്ല.",
      },
    ],
  },
  {
    id: "DOC-1184",
    title: "Trainset Mileage Balancing Report — Aug W2",
    titleMl: "ട്രെയിൻസെറ്റ് മൈലേജ് ബാലൻസിംഗ് റിപ്പോർട്ട് — ഓഗസ്റ്റ് W2",
    fileName: "Mileage_Balancing_AugW2.xlsx",
    format: "XLSX",
    type: "Mileage Report",
    department: "Rolling Stock",
    language: "en",
    uploadedBy: "A. Menon (Rolling Stock)",
    uploadedAt: "2026-08-15T21:12:00+05:30",
    trainsets: ["TS-03", "TS-07", "TS-15", "TS-21", "TS-11"],
    confidence: 0.9,
    status: "Indexed",
    tags: ["mileage", "balancing"],
    chunks: [
      {
        id: "DOC-1184#p1s1",
        page: 1,
        section: "Cumulative km by trainset",
        text: "TS-21 has accumulated 412,900 km, which is 18,400 km above fleet average. Preferential stabling on the inner line and reduced service allocation is recommended for the next 10 days to equalise bogie and wheel wear.",
      },
    ],
  },
  {
    id: "DOC-1190",
    title: "Platform Screen Door Incident — Aluva, 12 Aug",
    titleMl: "പ്ലാറ്റ്ഫോം സ്ക്രീൻ ഡോർ സംഭവം — ആലുവ, ഓഗസ്റ്റ് 12",
    fileName: "PSD_Incident_Aluva_12Aug.jpg",
    format: "IMAGE",
    type: "Incident Report",
    department: "Safety & Compliance",
    language: "ml",
    uploadedBy: "Station Controller, Aluva",
    uploadedAt: "2026-08-12T23:47:00+05:30",
    employeeIds: ["KM-1877"],
    confidence: 0.72,
    status: "Needs Review",
    tags: ["incident", "PSD", "OCR"],
    chunks: [
      {
        id: "DOC-1190#p1s1",
        page: 1,
        section: "OCR — Handwritten log",
        text: "Platform screen door 4B at Aluva failed to close on the 22:41 service. Manual override applied by station staff. Signalling team informed. No injury. Root cause pending; interim speed restriction not required.",
        textMl:
          "ആലുവയിൽ 4B പ്ലാറ്റ്ഫോം സ്ക്രീൻ ഡോർ 22:41 സർവീസിൽ അടയാൻ പരാജയപ്പെട്ടു. സ്റ്റേഷൻ ജീവനക്കാർ മാനുവൽ ഓവർറൈഡ് ഉപയോഗിച്ചു. പരിക്കുകളില്ല.",
      },
    ],
  },
  {
    id: "DOC-1195",
    title: "Stabling Geometry Plan — Muttom, Night 16 Aug",
    titleMl: "സ്റ്റേബ്ലിംഗ് ജ്യാമിതി പ്ലാൻ — മുട്ടം, ഓഗസ്റ്റ് 16 രാത്രി",
    fileName: "Stabling_Muttom_16Aug.pdf",
    format: "PDF",
    type: "Maintenance Log",
    department: "Operations",
    language: "en",
    uploadedBy: "S. Thomas (Ops Control)",
    uploadedAt: "2026-08-16T16:05:00+05:30",
    trainsets: ["TS-02", "TS-03", "TS-07", "TS-11", "TS-15", "TS-21"],
    confidence: 0.89,
    status: "Processing",
    tags: ["stabling", "night-plan"],
    chunks: [
      {
        id: "DOC-1195#p1s1",
        page: 1,
        section: "Line allocation",
        text: "Stabling lines 1 to 4 are occupied. TS-11 is placed on line 5 nearest the IBL entry to allow direct movement into the inspection bay without shunting other trainsets.",
      },
    ],
  },
];

export const staff: Staff[] = [
  {
    id: "KM-2291",
    name: "Anand Menon",
    nameMl: "ആനന്ദ് മേനോൻ",
    role: "Senior Rolling Stock Technician",
    department: "Rolling Stock",
    depot: "Muttom Depot",
    experienceYears: 11,
    languages: ["English", "Malayalam"],
    certifications: [
      {
        code: "MSC",
        name: "Metro Safety Competency",
        nameMl: "മെട്രോ സേഫ്റ്റി കോംപിറ്റൻസി",
        issuedOn: "2026-08-09",
        expiresOn: "2027-08-09",
        docId: "DOC-1170",
      },
      {
        code: "RS-B",
        name: "Rolling Stock B-Check Authorisation",
        nameMl: "റോളിംഗ് സ്റ്റോക്ക് B-ചെക്ക് അധികാരം",
        issuedOn: "2025-09-01",
        expiresOn: "2026-09-01",
        docId: "DOC-1042",
      },
    ],
    trainingHours12m: 96,
    restHoursSinceLastShift: 14,
    shiftsLast7Days: 4,
    availability: "Available",
    competencyScore: 94,
    photoInitials: "AM",
  },
  {
    id: "KM-3310",
    name: "Reshma Pillai",
    nameMl: "രേഷ്മ പിള്ള",
    role: "Signalling & Telecom Engineer",
    department: "Signalling & Telecom",
    depot: "Muttom Depot",
    experienceYears: 7,
    languages: ["English", "Malayalam", "Hindi"],
    certifications: [
      {
        code: "MSC",
        name: "Metro Safety Competency",
        nameMl: "മെട്രോ സേഫ്റ്റി കോംപിറ്റൻസി",
        issuedOn: "2026-08-09",
        expiresOn: "2027-08-09",
        docId: "DOC-1170",
      },
      {
        code: "ATP",
        name: "ATP / CBTC Maintenance Licence",
        nameMl: "ATP / CBTC മെയിന്റനൻസ് ലൈസൻസ്",
        issuedOn: "2024-08-25",
        expiresOn: "2026-08-25",
        docId: "DOC-1088",
      },
    ],
    trainingHours12m: 74,
    restHoursSinceLastShift: 12,
    shiftsLast7Days: 5,
    availability: "Available",
    competencyScore: 89,
    photoInitials: "RP",
  },
  {
    id: "KM-4102",
    name: "Fathima Noushad",
    nameMl: "ഫാത്തിമ നൗഷാദ്",
    role: "Depot Safety Inspector",
    department: "Safety & Compliance",
    depot: "Muttom Depot",
    experienceYears: 9,
    languages: ["English", "Malayalam"],
    certifications: [
      {
        code: "MSC",
        name: "Metro Safety Competency",
        nameMl: "മെട്രോ സേഫ്റ്റി കോംപിറ്റൻസി",
        issuedOn: "2026-08-09",
        expiresOn: "2027-08-09",
        docId: "DOC-1170",
      },
      {
        code: "IBL",
        name: "Inspection Bay Line Authorisation",
        nameMl: "ഇൻസ്പെക്ഷൻ ബേ ലൈൻ അധികാരം",
        issuedOn: "2025-08-20",
        expiresOn: "2026-08-19",
        docId: "DOC-1121",
      },
    ],
    trainingHours12m: 110,
    restHoursSinceLastShift: 20,
    shiftsLast7Days: 3,
    availability: "Available",
    competencyScore: 92,
    photoInitials: "FN",
  },
  {
    id: "KM-1877",
    name: "Joseph Kurian",
    nameMl: "ജോസഫ് കുര്യൻ",
    role: "Station Controller",
    department: "Operations",
    depot: "Aluva Station",
    experienceYears: 14,
    languages: ["English", "Malayalam"],
    certifications: [
      {
        code: "MSC",
        name: "Metro Safety Competency",
        nameMl: "മെട്രോ സേഫ്റ്റി കോംപിറ്റൻസി",
        issuedOn: "2025-08-01",
        expiresOn: "2026-08-01",
        docId: "DOC-1170",
      },
    ],
    trainingHours12m: 38,
    restHoursSinceLastShift: 26,
    shiftsLast7Days: 2,
    availability: "Available",
    competencyScore: 71,
    photoInitials: "JK",
  },
  {
    id: "KM-5520",
    name: "Devika Nair",
    nameMl: "ദേവിക നായർ",
    role: "Rolling Stock Technician",
    department: "Rolling Stock",
    depot: "Muttom Depot",
    experienceYears: 4,
    languages: ["Malayalam"],
    certifications: [
      {
        code: "MSC",
        name: "Metro Safety Competency",
        nameMl: "മെട്രോ സേഫ്റ്റി കോംപിറ്റൻസി",
        issuedOn: "2026-01-12",
        expiresOn: "2027-01-12",
        docId: "DOC-1170",
      },
    ],
    trainingHours12m: 52,
    restHoursSinceLastShift: 8,
    shiftsLast7Days: 6,
    availability: "Rest Period",
    competencyScore: 78,
    photoInitials: "DN",
  },
  {
    id: "KM-2288",
    name: "Vishnu Prasad",
    nameMl: "വിഷ്ണു പ്രസാദ്",
    role: "Signalling Technician",
    department: "Signalling & Telecom",
    depot: "Kalamassery Yard",
    experienceYears: 6,
    languages: ["English", "Malayalam"],
    certifications: [
      {
        code: "ATP",
        name: "ATP / CBTC Maintenance Licence",
        nameMl: "ATP / CBTC മെയിന്റനൻസ് ലൈസൻസ്",
        issuedOn: "2025-03-04",
        expiresOn: "2027-03-04",
        docId: "DOC-1088",
      },
    ],
    trainingHours12m: 61,
    restHoursSinceLastShift: 15,
    shiftsLast7Days: 3,
    availability: "Available",
    competencyScore: 83,
    photoInitials: "VP",
  },
  {
    id: "KM-6001",
    name: "Sreelakshmi R",
    nameMl: "ശ്രീലക്ഷ്മി ആർ",
    role: "Housekeeping Supervisor",
    department: "Housekeeping",
    depot: "Muttom Depot",
    experienceYears: 5,
    languages: ["Malayalam", "English"],
    certifications: [
      {
        code: "MSC",
        name: "Metro Safety Competency",
        nameMl: "മെട്രോ സേഫ്റ്റി കോംപിറ്റൻസി",
        issuedOn: "2025-11-02",
        expiresOn: "2026-11-02",
        docId: "DOC-1156",
      },
    ],
    trainingHours12m: 44,
    restHoursSinceLastShift: 18,
    shiftsLast7Days: 4,
    availability: "Available",
    competencyScore: 80,
    photoInitials: "SR",
  },
  {
    id: "KM-7314",
    name: "Ajay Krishnan",
    nameMl: "അജയ് കൃഷ്ണൻ",
    role: "Train Operator",
    department: "Operations",
    depot: "Muttom Depot",
    experienceYears: 8,
    languages: ["English", "Malayalam"],
    certifications: [
      {
        code: "MSC",
        name: "Metro Safety Competency",
        nameMl: "മെട്രോ സേഫ്റ്റി കോംപിറ്റൻസി",
        issuedOn: "2026-03-18",
        expiresOn: "2027-03-18",
        docId: "DOC-1170",
      },
      {
        code: "IBL",
        name: "Inspection Bay Line Authorisation",
        nameMl: "ഇൻസ്പെക്ഷൻ ബേ ലൈൻ അധികാരം",
        issuedOn: "2026-02-01",
        expiresOn: "2027-02-01",
        docId: "DOC-1121",
      },
    ],
    trainingHours12m: 88,
    restHoursSinceLastShift: 10,
    shiftsLast7Days: 5,
    availability: "On Leave",
    competencyScore: 87,
    photoInitials: "AK",
  },
];

export const trainsets = [
  { id: "TS-02", status: "SERVICE", km: 388400, cleaning: "Done", jobCards: 0 },
  { id: "TS-03", status: "SERVICE", km: 394100, cleaning: "Pending", jobCards: 1 },
  { id: "TS-07", status: "STANDBY", km: 401200, cleaning: "Scheduled", jobCards: 0 },
  { id: "TS-11", status: "IBL", km: 379800, cleaning: "Pending", jobCards: 1 },
  { id: "TS-15", status: "SERVICE", km: 396500, cleaning: "Done", jobCards: 0 },
  { id: "TS-21", status: "STANDBY", km: 412900, cleaning: "Scheduled", jobCards: 1 },
] as const;

export const alerts: AlertItem[] = [
  {
    id: "ALT-01",
    severity: "critical",
    title: "MSC certificate expired — Joseph Kurian (KM-1877)",
    titleMl: "MSC സർട്ടിഫിക്കറ്റ് കാലഹരണപ്പെട്ടു — ജോസഫ് കുര്യൻ (KM-1877)",
    detail:
      "Metro Safety Competency expired on 01 Aug 2026 and re-assessment was marked ABSENT in Training Record Batch 22. Staff is blocked from all safety-critical induction duty.",
    category: "Compliance",
    linkedDocId: "DOC-1170",
    linkedStaffId: "KM-1877",
    raisedAt: "2026-08-09T10:20:00+05:30",
  },
  {
    id: "ALT-02",
    severity: "critical",
    title: "Fitness certificate expiring in 4 days — TS-07",
    titleMl: "ഫിറ്റ്നസ് സർട്ടിഫിക്കറ്റ് 4 ദിവസത്തിനുള്ളിൽ കാലഹരണപ്പെടും — TS-07",
    detail:
      "Rolling stock fitness certificate for TS-07 lapses on 20 Aug 2026. Renewal inspection must start by 17 Aug 2026 per the 72-hour rule.",
    category: "Document",
    linkedDocId: "DOC-1042",
    raisedAt: "2026-08-16T06:00:00+05:30",
  },
  {
    id: "ALT-03",
    severity: "warning",
    title: "IBL authorisation expires in 3 days — Fathima Noushad",
    titleMl: "IBL അധികാരം 3 ദിവസത്തിനുള്ളിൽ അവസാനിക്കും — ഫാത്തിമ നൗഷാദ്",
    detail:
      "Inspection Bay Line authorisation for KM-4102 expires 19 Aug 2026. Renewal paperwork not yet indexed.",
    category: "Compliance",
    linkedStaffId: "KM-4102",
    raisedAt: "2026-08-16T06:00:00+05:30",
  },
  {
    id: "ALT-04",
    severity: "warning",
    title: "Safety-critical job card open — JC-4471 (TS-11)",
    titleMl: "സുരക്ഷാ നിർണായക ജോബ് കാർഡ് തുറന്നിരിക്കുന്നു — JC-4471 (TS-11)",
    detail:
      "ATP transponder replacement is open beyond the 24-hour SLA and blocks TS-11 induction into SERVICE.",
    category: "Induction",
    linkedDocId: "DOC-1088",
    raisedAt: "2026-08-15T19:10:00+05:30",
  },
  {
    id: "ALT-05",
    severity: "warning",
    title: "ATP licence expires in 9 days — Reshma Pillai",
    titleMl: "ATP ലൈസൻസ് 9 ദിവസത്തിനുള്ളിൽ അവസാനിക്കും — രേഷ്മ പിള്ള",
    detail:
      "ATP / CBTC maintenance licence for KM-3310 expires 25 Aug 2026. Schedule recertification before roster week 35.",
    category: "Compliance",
    linkedStaffId: "KM-3310",
    raisedAt: "2026-08-16T06:00:00+05:30",
  },
  {
    id: "ALT-06",
    severity: "info",
    title: "Incident report awaiting review — PSD 4B Aluva",
    titleMl: "സംഭവ റിപ്പോർട്ട് അവലോകനത്തിനായി കാത്തിരിക്കുന്നു — PSD 4B ആലുവ",
    detail:
      "OCR confidence 72% on a handwritten Malayalam log. Human verification required before it is used in compliance scoring.",
    category: "Safety",
    linkedDocId: "DOC-1190",
    raisedAt: "2026-08-13T08:00:00+05:30",
  },
  {
    id: "ALT-07",
    severity: "info",
    title: "Branding exposure shortfall risk — TS-15",
    titleMl: "ബ്രാൻഡിംഗ് എക്സ്പോഷർ കുറവിന്റെ സാധ്യത — TS-15",
    detail:
      "TS-15 has logged 291 of the contracted 380 revenue hours this month. Penalty threshold at 361 hours.",
    category: "Compliance",
    linkedDocId: "DOC-1163",
    raisedAt: "2026-08-16T06:00:00+05:30",
  },
];

export const seedAudit: AuditEntry[] = [
  {
    id: "AUD-101",
    at: "2026-08-16T16:05:00+05:30",
    actor: "S. Thomas (Ops Control)",
    action: "UPLOAD",
    target: "DOC-1195 Stabling_Muttom_16Aug.pdf",
    detail: "Classified as Maintenance Log / Operations at 89% confidence.",
  },
  {
    id: "AUD-100",
    at: "2026-08-16T15:22:00+05:30",
    actor: "Duty Controller (You)",
    action: "PLAN_GENERATED",
    target: "Induction Plan — Night Shift 16 Aug",
    detail: "3 eligible of 8 staff; 1 compliance block, 2 rest-rule rejections.",
  },
  {
    id: "AUD-099",
    at: "2026-08-16T14:48:00+05:30",
    actor: "P. Varghese (Safety)",
    action: "APPROVE",
    target: "ALT-01 escalation",
    detail: "Acknowledged expired MSC for KM-1877; re-assessment booked 20 Aug.",
  },
  {
    id: "AUD-098",
    at: "2026-08-16T11:31:00+05:30",
    actor: "R. Pillai (S&T)",
    action: "SEARCH",
    target: '"ATP transponder blocking induction"',
    detail: "6 semantic matches returned; opened DOC-1088 p.1.",
  },
  {
    id: "AUD-097",
    at: "2026-08-15T21:12:00+05:30",
    actor: "A. Menon (Rolling Stock)",
    action: "UPLOAD",
    target: "DOC-1184 Mileage_Balancing_AugW2.xlsx",
    detail: "Extracted 5 trainset IDs, 1 date range.",
  },
  {
    id: "AUD-096",
    at: "2026-08-15T09:04:00+05:30",
    actor: "Duty Controller (You)",
    action: "OVERRIDE",
    target: "Induction Plan — Night Shift 14 Aug",
    detail: "Manually replaced KM-5520 with KM-2288; reason logged: fatigue risk.",
  },
  {
    id: "AUD-095",
    at: "2026-08-14T18:40:00+05:30",
    actor: "R. Pillai (S&T)",
    action: "CLASSIFY",
    target: "DOC-1088",
    detail: "Auto-tagged job-card backlog; 3 trainset IDs, 2 employee IDs extracted.",
  },
];

export const findDoc = (id: string) => documents.find((d) => d.id === id);
export const findStaff = (id: string) => staff.find((s) => s.id === id);
