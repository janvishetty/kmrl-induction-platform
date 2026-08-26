import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { StateBlock } from "@/components/common/StateBlock";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { useDocuments } from "@/lib/hooks";
import { formatDateTime } from "@/lib/datetime";
import * as api from "@/lib/api";
import { toast } from "sonner";

export default function Documents() {
  const { t } = useApp();
  const docsQ = useDocuments();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [tsFilter, setTsFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");

  const uploadMut = useMutation({
    mutationFn: (file) => api.uploadDocument(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
    onError: () => toast.error(t("upload_error")),
  });
  
  const verifyMut = useMutation({
    mutationFn: (id) => api.verifyDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document verified and logged to Polygon Amoy blockchain!");
    },
    onError: () => toast.error("Verification failed."),
    onSettled: () => setVerifyingId(null),
  });

  const onPick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) uploadMut.mutate(file);
    e.target.value = "";
  };

  const all = docsQ.data || [];
  const trainsetOptions = useMemo(
    () => Array.from(new Set(all.map((d) => d.trainset).filter((x) => x && x !== "\u2014"))).sort(),
    [all]
  );
  const categoryOptions = useMemo(() => Array.from(new Set(all.map((d) => d.category).filter(Boolean))).sort(), [all]);

  const docs = useMemo(
    () =>
      all.filter(
        (d) => (tsFilter === "all" || d.trainset === tsFilter) && (catFilter === "all" || d.category === catFilter)
      ),
    [all, tsFilter, catFilter]
  );

  return (
    <AppShell>
      <PageHeader
        title={t("documents_title")}
        subtitle={t("documents_sub")}
        action={
          <>
            <input ref={fileRef} type="file" className="sr-only" onChange={onPick} aria-hidden="true" tabIndex={-1} />
            <Button onClick={() => fileRef.current && fileRef.current.click()} disabled={uploadMut.isPending}>
              <Upload className="mr-2 h-4 w-4" />
              {uploadMut.isPending ? t("uploading") : t("upload")}
            </Button>
          </>
        }
      />

      {!docsQ.isLoading && !docsQ.isError && all.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={tsFilter} onValueChange={setTsFilter}>
            <SelectTrigger className="h-9 w-[180px]" aria-label={t("train")}>
              <SelectValue placeholder={t("all_trainsets")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_trainsets")}</SelectItem>
              {trainsetOptions.map((ts) => (
                <SelectItem key={ts} value={ts}>{ts}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-9 w-[200px]" aria-label={t("category")}>
              <SelectValue placeholder={t("all_categories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_categories")}</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {docsQ.isLoading ? (
        <StateBlock label={t("loading")} />
      ) : docsQ.isError ? (
        <StateBlock label={t("error_documents")} tone="error" />
      ) : !docs.length ? (
        <StateBlock label={t("empty_documents")} />
      ) : (
        <div className="card-elevated overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border bg-secondary/50 px-4 py-2.5">
            <span className="mono-label">DOCUMENT</span>
            <span className="mono-label text-center">{t("verify")}</span>
            <span className="mono-label w-[120px] text-right">{t("status")}</span>
          </div>
          <ul className="max-h-[62vh] divide-y divide-border overflow-y-auto">
            {docs.map((d) => {
              const isVerifying = verifyMut.isPending && verifyingId === d.document_id;
              return (
                <li key={d.document_id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3">
                  <div className="min-w-0">
                    {/* Real Filename Display */}
                    <div className="truncate font-medium text-sm text-foreground">
                      {d.filename || d.original_filename || d.file_name || d.name || d.document_id}
                    </div>
                    {/* Secondary ID and metadata */}
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono text-xs opacity-75">ID: {d.document_id}</span>
                      {d.trainset && d.trainset !== "\u2014" && <span className="font-mono">· {d.trainset}</span>}
                      {d.category && <span>· {d.category}</span>}
                      {formatDateTime(d.uploaded_at) && <span className="font-mono">· {formatDateTime(d.uploaded_at)}</span>}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isVerifying}
                    onClick={() => {
                      setVerifyingId(d.document_id);
                      verifyMut.mutate(d.document_id);
                    }}
                  >
                    {isVerifying ? t("verifying") : t("verify")}
                  </Button>
                  <span className="flex w-[120px] justify-end">
                    {isVerifying ? (
                      <span className="font-mono text-xs text-muted-foreground">{t("verifying")}</span>
                    ) : d.status && d.status !== "UNVERIFIED" ? (
                      <StatusBadge status={d.status} />
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">{t("unverified")}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </AppShell>
  );
}