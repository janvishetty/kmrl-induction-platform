import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  FileType2,
  Image as ImageIcon,
  Mail,
  Upload,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/kmrl/AppShell";
import { useApp } from "@/lib/kmrl/store";
import { daysUntil, type KDocument } from "@/lib/kmrl/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/documents")({
  validateSearch: (s: Record<string, unknown>) => ({
    doc:
      typeof s["doc"] === "string"
        ? (s["doc"] as string)
        : undefined,
  }),

  head: () => ({
    meta: [
      {
        title: "Unified Document Intelligence — KMRL Ops Intelligence",
      },
      {
        name: "description",
        content:
          "Index KMRL PDFs, spreadsheets, Word files, emails and scanned images with automatic classification and entity extraction.",
      },
      {
        property: "og:title",
        content: "Unified Document Intelligence — KMRL",
      },
      {
        property: "og:description",
        content:
          "Auto-classified KMRL documents with extracted departments, dates, trainsets and employee IDs.",
      },
    ],
  }),

  component: DocumentsPage,
});

const ICONS = {
  PDF: FileText,
  XLSX: FileSpreadsheet,
  DOCX: FileType2,
  IMAGE: ImageIcon,
  EMAIL: Mail,
} as const;

function DocumentsPage() {
  const { docs, addDoc, lang, log, t } = useApp();
  const { doc: docParam } = Route.useSearch();

  const [openId, setOpenId] = useState<string | null>(
    docParam ?? docs[0]?.id ?? null,
  );

  const [filter, setFilter] = useState<string>("All");
  const [ingesting, setIngesting] = useState<string | null>(null);

  const types = [
    "All",
    ...Array.from(new Set(docs.map((d) => d.type))),
  ];

  const list = docs.filter(
    (d) => filter === "All" || d.type === filter,
  );

  const open =
    docs.find((d) => d.id === openId) ?? list[0];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!file) return;

    setIngesting(file.name);

    const ext =
      file.name.split(".").pop()?.toLowerCase() ?? "";

    const format: KDocument["format"] =
      ext === "xlsx" ||
      ext === "xls" ||
      ext === "csv"
        ? "XLSX"
        : ext === "docx" || ext === "doc"
          ? "DOCX"
          : ["png", "jpg", "jpeg", "webp"].includes(ext)
            ? "IMAGE"
            : ext === "eml" || ext === "msg"
              ? "EMAIL"
              : "PDF";

    try {
      console.log("Uploading:", file.name);
      console.log("Detected format:", format);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://127.0.0.1:8000/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      console.log(
        "Upload response status:",
        response.status,
      );

      if (!response.ok) {
        let errorMessage = "Upload failed";

        try {
          const errorData = await response.json();

          console.error(
            "Backend error:",
            errorData,
          );

          errorMessage =
            errorData?.detail ??
            errorData?.message ??
            errorMessage;
        } catch {
          console.error(
            "Backend returned a non-JSON error response.",
          );
        }

        throw new Error(
          `${errorMessage} (${response.status})`,
        );
      }

      const result = await response.json();

      // DEBUG: See exactly what backend returns
      console.log(
        "UPLOAD RESPONSE:",
        result,
      );

      /*
       * Support the expected backend response:
       *
       * {
       *   doc_id: "...",
       *   filename: "...",
       *   hash: "..."
       * }
       */

      const docId =
        result.doc_id ??
        result.id ??
        result.document_id;

      const filename =
        result.filename ??
        result.fileName ??
        file.name;

      const hash =
        result.hash ??
        result.file_hash ??
        "";

      if (!docId) {
        console.error(
          "Backend response does not contain doc_id:",
          result,
        );

        throw new Error(
          "Upload succeeded but backend did not return a document ID.",
        );
      }

      // Fetch the full record back
      // because /upload may only return a count/ID.
      let savedDoc: any = null;

      try {
        const {
          fetchDocuments,
        } = await import("@/lib/kmrl/api");

        const allDocs = await fetchDocuments();

        console.log(
          "All documents:",
          allDocs,
        );

        savedDoc = allDocs.find(
          (d: any) =>
            String(d.id) === String(docId),
        );

        console.log(
          "Saved document:",
          savedDoc,
        );
      } catch (fetchError) {
        console.error(
          "Error fetching documents:",
          fetchError,
        );
      }

      const doc: KDocument = {
        id: String(docId),

        title: file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]+/g, " "),

        titleMl: `അപ്‌ലോഡ് ചെയ്ത രേഖ — ${file.name}`,

        fileName: filename,

        format,

        type:
          savedDoc?.type ??
          "Maintenance Log",

        department:
          savedDoc?.department ??
          "Operations",

        language:
          savedDoc?.language ??
          "en",

        uploadedBy:
          savedDoc?.uploadedBy ??
          "Duty Controller (You)",

        uploadedAt:
          savedDoc?.uploadedAt ??
          new Date().toISOString(),

        trainsets:
          savedDoc?.trainsets ?? [],

        employeeIds:
          savedDoc?.employeeIds ?? [],

        confidence:
          typeof savedDoc?.confidence === "number"
            ? savedDoc.confidence
            : typeof result.confidence ===
                "number"
              ? result.confidence
              : 0,

        status:
          savedDoc?.status ??
          "Indexed",

        tags:
          savedDoc?.tags ??
          ["uploaded"],

        chunks: Array.isArray(
          savedDoc?.chunks,
        )
          ? savedDoc.chunks.map(
              (c: any, i: number) => ({
                id:
                  c.id ??
                  `p${i + 1}s1`,
                page:
                  c.page ?? 1,
                section:
                  c.section ??
                  "Content",
                text:
                  c.text ?? "",
                ...(c.textMl
                  ? {
                      textMl:
                        c.textMl,
                    }
                  : {}),
              }),
            )
          : [],
      };

      console.log(
        "Final document added to frontend:",
        doc,
      );

      addDoc(doc);

      setOpenId(String(docId));

      setIngesting(null);

      log({
        actor: "Duty Controller (You)",
        action: "UPLOAD",
        target: `${docId} ${file.name}`,
        detail: hash
          ? `Uploaded and hashed: ${hash.slice(0, 12)}...`
          : `Uploaded successfully: ${file.name}`,
      });
    } catch (err) {
      console.error(
        "UPLOAD ERROR:",
        err,
      );

      setIngesting(null);

      const message =
        err instanceof Error
          ? err.message
          : "Unknown upload error.";

      alert(
        `Upload failed — ${message}\n\nCheck that the backend server is running.`,
      );
    }
  }

  return (
    <AppShell>
      <PageHeader
        tag="Ingestion · Classification · Extraction"
        title={t("nav_documents")}
        subtitle="Every KMRL source — maintenance PDFs, job-card spreadsheets, Word circulars, scanned Malayalam logs and emails — is ingested into one index with automatic type, department, date, trainset and employee-ID extraction."
      />

      <label className="panel mb-5 flex cursor-pointer flex-wrap items-center gap-4 border-dashed p-5 hover:border-primary/60">
        <input
          type="file"
          className="hidden"
          onChange={(e) =>
            handleFiles(e.target.files)
          }
          accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.webp,.eml,.msg,.txt"
        />

        <span className="grid size-11 place-items-center rounded-md bg-primary/15 text-primary">
          <Upload className="size-5" />
        </span>

        <span>
          <span className="block text-sm font-medium">
            {t("upload")}
          </span>

          <span className="mono-label">
            PDF · XLSX · DOCX · IMAGE (OCR) · EMAIL
            — max 20 MB
          </span>
        </span>

        {ingesting && (
          <span className="ml-auto animate-pulse text-xs text-accent">
            Indexing {ingesting} — OCR, chunking,
            classification…
          </span>
        )}
      </label>

      <div className="mb-4 flex flex-wrap gap-2">
        {types.map((ty) => (
          <button
            key={ty}
            onClick={() => setFilter(ty)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              filter === ty
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {ty}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-2 xl:col-span-3">
          {list.map((d) => {
            /*
             * FIX:
             * If d.format is something unexpected,
             * don't pass undefined to React.
             *
             * FileText is the fallback icon.
             */
            const Icon =
              ICONS[
                d.format as keyof typeof ICONS
              ] ?? FileText;

            const exp = d.expiresOn
              ? daysUntil(d.expiresOn)
              : null;

            return (
              <button
                key={d.id}
                onClick={() =>
                  setOpenId(d.id)
                }
                className={cn(
                  "panel flex w-full items-start gap-3 p-3 text-left transition-colors",
                  open?.id === d.id
                    ? "border-primary"
                    : "hover:border-primary/40",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded bg-secondary text-primary">
                  <Icon className="size-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {lang === "ml"
                      ? d.titleMl
                      : d.title}
                  </span>

                  <span className="mono-label block truncate">
                    {d.id} · {d.fileName} ·{" "}
                    {d.department}
                  </span>

                  <span className="mt-1 flex flex-wrap gap-1">
                    <Tag>{d.type}</Tag>

                    <Tag>{d.format}</Tag>

                    <Tag>
                      {d.language ===
                      "bilingual"
                        ? "EN + ML"
                        : d.language ===
                            "ml"
                          ? "മലയാളം"
                          : "EN"}
                    </Tag>

                    <Tag
                      tone={
                        d.status ===
                        "Indexed"
                          ? "ok"
                          : d.status ===
                              "Processing"
                            ? "warn"
                            : "bad"
                      }
                    >
                      {d.status}
                    </Tag>

                    {exp !== null && (
                      <Tag
                        tone={
                          exp < 0
                            ? "bad"
                            : exp <= 7
                              ? "warn"
                              : "ok"
                        }
                      >
                        {exp < 0
                          ? `expired ${-exp}d`
                          : `expires in ${exp}d`}
                      </Tag>
                    )}
                  </span>
                </span>

                <span className="mono-label shrink-0">
                  {(
                    d.confidence * 100
                  ).toFixed(0)}
                  %
                </span>
              </button>
            );
          })}
        </div>

        <div className="panel h-fit p-5 xl:col-span-2">
          {open ? (
            <>
              <p className="mono-label">
                Extraction result · {open.id}
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                {lang === "ml"
                  ? open.titleMl
                  : open.title}
              </h2>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Field
                  label="Document type"
                  value={open.type}
                />

                <Field
                  label="Department"
                  value={open.department}
                />

                <Field
                  label="Uploaded by"
                  value={open.uploadedBy}
                />

                <Field
                  label="Uploaded at"
                  value={new Date(
                    open.uploadedAt,
                  ).toLocaleString("en-IN")}
                />

                <Field
                  label="Effective from"
                  value={
                    open.effectiveFrom ??
                    "—"
                  }
                />

                <Field
                  label="Expires on"
                  value={
                    open.expiresOn ??
                    "—"
                  }
                />

                <Field
                  label="Trainset IDs"
                  value={
                    open.trainsets?.length
                      ? open.trainsets.join(
                          ", ",
                        )
                      : "—"
                  }
                />

                <Field
                  label="Employee IDs"
                  value={
                    open.employeeIds?.length
                      ? open.employeeIds.join(
                          ", ",
                        )
                      : "—"
                  }
                />

                <Field
                  label="Language"
                  value={open.language}
                />

                <Field
                  label="Classifier confidence"
                  value={`${(
                    open.confidence * 100
                  ).toFixed(0)}%`}
                />
              </dl>

              <p className="mono-label mt-5">
                Indexed passages (
                {open.chunks.length})
              </p>

              <div className="mt-2 space-y-3">
                {open.chunks.length > 0 ? (
                  open.chunks.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md border border-border bg-secondary/40 p-3"
                    >
                      <p className="mono-label text-primary">
                        {t("page")}{" "}
                        {c.page} ·{" "}
                        {c.section}
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {lang === "ml" &&
                        c.textMl
                          ? c.textMl
                          : c.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                    No indexed passages
                    available.
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a document.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Tag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 text-[10px]",
        tone === "ok"
          ? "border-success/40 bg-success/10 text-success"
          : tone === "warn"
            ? "border-accent/40 bg-accent/10 text-accent"
            : tone === "bad"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="mono-label">
        {label}
      </dt>

      <dd className="mt-0.5 break-words text-foreground">
        {value}
      </dd>
    </div>
  );
}
