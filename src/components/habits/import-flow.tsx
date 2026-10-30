"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { Download, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Segmented } from "@/components/controls";
import { StatusPill } from "@/components/status-pill";
import { parseImportRow, type ParsedRow } from "@/lib/csv";
import { importHabits } from "@/app/(app)/habits/import/actions";
import { formatAmount } from "@/lib/format";

const MAX_BYTES = 512 * 1024;
const MAX_ROWS = 200;

export function ImportFlow({ today, existingNames }: { today: string; existingNames: string[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<"skip" | "keep-both">("skip");
  const [pending, start] = useTransition();

  const existing = useMemo(() => new Set(existingNames.map((n) => n.toLowerCase())), [existingNames]);
  const dupNames = useMemo(() => {
    const seen = new Set<string>();
    const dups = new Set<number>();
    for (const r of rows ?? []) {
      const k = r.name.toLowerCase();
      if (existing.has(k) || seen.has(k)) dups.add(r.line);
      seen.add(k);
    }
    return dups;
  }, [rows, existing]);

  const valid = rows?.filter((r) => r.input) ?? [];
  const invalid = rows?.filter((r) => !r.input) ?? [];
  const willCreate = valid.filter((r) => duplicates === "keep-both" || !dupNames.has(r.line)).length;

  function onFile(file: File | undefined) {
    setFileError(null);
    setRows(null);
    if (!file) return;
    if (file.size > MAX_BYTES) return setFileError("That file is over 512 KB. Split it into smaller files.");
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (res) => {
        if (!res.meta.fields?.includes("name")) return setFileError("The file needs a “name” column. Start from the template.");
        if (res.data.length === 0) return setFileError("The file has no rows.");
        if (res.data.length > MAX_ROWS) return setFileError(`The file has ${res.data.length} rows. Import at most ${MAX_ROWS} at a time.`);
        setRows(res.data.map((rec, i) => parseImportRow(rec, i + 2, today)));
      },
      error: () => setFileError("That file couldn't be read as CSV."),
    });
  }

  function submit() {
    const inputs = valid.map((r) => r.input!);
    start(async () => {
      const res = await importHabits({ rows: inputs, duplicates });
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Added ${res.created} ${res.created === 1 ? "habit" : "habits"}${res.skipped ? `, skipped ${res.skipped} duplicates` : ""}`);
      router.push("/habits");
    });
  }

  return (
    <div className="mt-8 grid gap-4">
      <section className="grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
        <div>
          <h2 className="text-base font-medium">Your file</h2>
          <p className="mt-1 text-sm text-muted-foreground">One habit per row. Columns follow the template.</p>
        </div>
        <div className="grid gap-3">
          <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-dashed border-control bg-background px-4 py-5 hover:border-ring focus-within:border-ring">
            <FileUp className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">{fileName || "Choose a .csv file"}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            <span className="text-sm font-medium">Browse</span>
          </label>
          {fileError && (
            <p role="alert" className="text-sm text-negative">
              {fileError}
            </p>
          )}
          <LinkButton variant="ghost" href="/api/export/template" prefetch={false} className="justify-self-start">
            <Download /> Download the template
          </LinkButton>
        </div>
      </section>

      {rows && (
        <section aria-labelledby="preview-title" className="rounded-2xl bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="preview-title" className="text-base font-medium">
                Preview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {valid.length} ready, {invalid.length} with problems{dupNames.size ? `, ${dupNames.size} with a name you already use` : ""}.
              </p>
            </div>
            {dupNames.size > 0 && (
              <div className="grid gap-1">
                <span className="text-sm text-muted-foreground">Same name as an existing habit</span>
                <Segmented
                  label="Duplicates"
                  value={duplicates}
                  onChange={setDuplicates}
                  options={[
                    { value: "skip", label: "Skip them" },
                    { value: "keep-both", label: "Add as new" },
                  ]}
                />
              </div>
            )}
          </div>

          <ul className="mt-4 grid gap-1">
            {rows.map((r) => (
              <li key={r.line} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl bg-background px-3 py-2.5">
                <span className="num w-14 text-sm text-muted-foreground">Row {r.line}</span>
                <span className="min-w-0 flex-1 font-medium">{r.name || <span className="text-muted-foreground">No name</span>}</span>
                {r.input ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {r.input.frequency.toLowerCase()}
                      {r.input.targetType !== "CHECKBOX" && ` · ${formatAmount(r.input.targetValue, r.input.targetType, r.input.targetUnit)}`}
                      {r.category && ` · ${r.category}`}
                    </span>
                    {dupNames.has(r.line) ? (
                      <StatusPill tone="warning">{duplicates === "skip" ? "Skipped: duplicate" : "Duplicate, added"}</StatusPill>
                    ) : (
                      <StatusPill tone="positive">Ready</StatusPill>
                    )}
                  </>
                ) : (
                  <span className="basis-full pl-[68px] text-sm text-negative">{r.errors.join(" ")}</span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground">
              {invalid.length ? "Rows with problems are left out. Fix them in the file and upload again to include them." : "Every row checks out."}
            </p>
            <Button onClick={submit} disabled={pending || willCreate === 0}>
              {pending ? "Importing…" : `Import ${willCreate} ${willCreate === 1 ? "habit" : "habits"}`}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
