"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileArrowUp,
  X,
  WarningCircle,
  CheckCircle,
  SpinnerGap,
  DownloadSimple,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { parseCSV, mapCSVToTestCases, type InvalidRow } from "@/components/test-management/csv-parser";
import type { TestCaseRow } from "@/components/test-management/test-case-detail-helpers";
import { cn } from "@/lib/utils";

type ImportStep = "upload" | "preview" | "importing" | "done";

interface ImportResult {
  succeeded: number;
  failed: number;
  errors: string[];
}

export function TestCaseImportButton({ suiteId }: { suiteId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
      >
        <FileArrowUp size={18} weight="bold" />
        Import CSV
      </button>
      {open && (
        <TestCaseImportModal suiteId={suiteId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function TestCaseImportModal({
  suiteId,
  onClose,
}: {
  suiteId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [validRows, setValidRows] = useState<TestCaseRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([]);
  const [allParsedRows, setAllParsedRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast("Please select a .csv file", "error");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows } = parseCSV(text);
      setHeaders(h);
      setAllParsedRows(rows);
      const { valid, invalid } = mapCSVToTestCases(h, rows, suiteId);
      setValidRows(valid);
      setInvalidRows(invalid);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    setStep("importing");
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const fd = new FormData();
        fd.append("testSuiteId", suiteId);
        fd.append("tcId", row.tcId);
        fd.append("caseName", row.caseName);
        fd.append("typeCase", row.typeCase);
        fd.append("preCondition", row.preCondition);
        fd.append("testStep", row.testStep);
        fd.append("expectedResult", row.expectedResult);
        fd.append("actualResult", row.actualResult || "");
        fd.append("status", row.status);
        fd.append("priority", row.priority);
        fd.append("evidence", "");

        const res = await fetch("/api/items/test-cases", { method: "POST", body: fd });
        if (res.ok) {
          succeeded++;
        } else {
          failed++;
          const data = await res.json().catch(() => ({ error: "Unknown error" }));
          errors.push(`Row ${row.tcId}: ${data.error || "Failed"}`);
        }
      } catch {
        failed++;
        errors.push(`Row ${row.tcId}: Network error`);
      }
      setProgress(i + 1);
    }

    setResult({ succeeded, failed, errors });
    setStep("done");

    if (succeeded > 0) {
      toast(`${succeeded} test case(s) imported successfully`, "success");
      router.refresh();
    }
    if (failed > 0) {
      toast(`${failed} test case(s) failed to import`, "error");
    }
  }

  function handleDownloadTemplate() {
    const templateHeaders = "TC ID,Case Name,Type Case,Pre-condition,Test Step,Expected Result,Actual Result,Status,Priority";
    const sampleRow = "TC-001,Login with valid credentials,Positive,User is on login page,Enter valid email and password then click Login,User is redirected to dashboard,,Pending,High";
    const csv = `${templateHeaders}\n${sampleRow}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-cases-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClose() {
    if (step === "importing") return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col bg-white border border-gray-200 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-bold text-gray-900">Import Test Cases from CSV</h2>
          <button
            onClick={handleClose}
            disabled={step === "importing"}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-5 py-4">
          {step === "upload" && (
            <UploadStep
              fileRef={fileRef}
              onFileChange={handleFileChange}
              onDownloadTemplate={handleDownloadTemplate}
            />
          )}
          {step === "preview" && (
            <PreviewStep
              fileName={fileName}
              headers={headers}
              allRows={allParsedRows}
              validRows={validRows}
              invalidRows={invalidRows}
            />
          )}
          {step === "importing" && (
            <ImportingStep progress={progress} total={validRows.length} />
          )}
          {step === "done" && result && (
            <DoneStep result={result} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          {step === "upload" && (
            <button
              onClick={handleClose}
              className="h-8 border border-gray-200 px-4 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          {step === "preview" && (
            <>
              <button
                onClick={() => { setStep("upload"); setFileName(""); setValidRows([]); setInvalidRows([]); }}
                className="h-8 border border-gray-200 px-4 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={validRows.length === 0}
                className="flex h-8 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <FileArrowUp size={14} weight="bold" />
                Import {validRows.length} Valid Row{validRows.length !== 1 ? "s" : ""}
              </button>
            </>
          )}
          {step === "done" && (
            <button
              onClick={handleClose}
              className="h-8 bg-gray-800 px-4 text-xs font-bold text-white hover:bg-gray-900"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadStep({
  fileRef,
  onFileChange,
  onDownloadTemplate,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <FileArrowUp size={40} weight="bold" className="text-gray-300" />
        <p className="text-sm font-medium text-gray-700">
          Upload a CSV file to bulk import test cases
        </p>
        <p className="text-xs text-gray-400">
          Expected columns: TC ID, Case Name, Type Case, Pre-condition, Test Step, Expected Result, Actual Result, Status, Priority
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-9 items-center gap-2 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
        >
          <FileArrowUp size={14} weight="bold" />
          Choose CSV File
        </button>
        <button
          onClick={onDownloadTemplate}
          className="flex h-9 items-center gap-2 border border-gray-200 px-4 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <DownloadSimple size={14} weight="bold" />
          Download Template
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  );
}

function PreviewStep({
  fileName,
  headers,
  allRows,
  validRows,
  invalidRows,
}: {
  fileName: string;
  headers: string[];
  allRows: string[][];
  validRows: TestCaseRow[];
  invalidRows: InvalidRow[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="flex items-center gap-4 text-xs">
        <span className="font-medium text-gray-700">File: {fileName}</span>
        <span className="flex items-center gap-1 text-emerald-600">
          <CheckCircle size={14} weight="bold" />
          {validRows.length} valid
        </span>
        {invalidRows.length > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <WarningCircle size={14} weight="bold" />
            {invalidRows.length} invalid
          </span>
        )}
      </div>

      {/* Invalid rows errors */}
      {invalidRows.length > 0 && (
        <div className="border border-red-100 bg-red-50 p-3">
          <p className="mb-1 text-xs font-bold text-red-700">Validation Errors:</p>
          <ul className="max-h-24 overflow-auto text-[11px] text-red-600 space-y-0.5">
            {invalidRows.slice(0, 10).map((inv) => (
              <li key={inv.row}>
                Row {inv.row}: {inv.errors.join(", ")}
              </li>
            ))}
            {invalidRows.length > 10 && (
              <li className="text-red-500">...and {invalidRows.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Preview table */}
      <div className="overflow-auto border border-gray-200" style={{ maxHeight: 320 }}>
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="border-b border-r border-gray-100 bg-gray-200 px-2 py-1.5 text-left font-bold text-gray-700">
                #
              </th>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="border-b border-r border-gray-100 bg-gray-200 px-2 py-1.5 text-left font-bold text-gray-700 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
              <th className="border-b border-gray-100 bg-gray-200 px-2 py-1.5 text-left font-bold text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => {
              const rowNum = i + 1;
              const isInvalid = invalidRows.some((inv) => inv.row === rowNum);
              return (
                <tr
                  key={i}
                  className={cn(
                    isInvalid ? "bg-red-50" : "bg-white hover:bg-gray-50"
                  )}
                >
                  <td className="border-b border-r border-gray-100 px-2 py-1 text-gray-500 font-medium">
                    {rowNum}
                  </td>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="border-b border-r border-gray-100 px-2 py-1 text-gray-700 max-w-[200px] truncate"
                    >
                      {cell || <span className="text-gray-300">-</span>}
                    </td>
                  ))}
                  <td className="border-b border-gray-100 px-2 py-1">
                    {isInvalid ? (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <WarningCircle size={12} weight="bold" />
                        Invalid
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle size={12} weight="bold" />
                        Valid
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportingStep({ progress, total }: { progress: number; total: number }) {
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <SpinnerGap size={32} weight="bold" className="animate-spin text-blue-600" />
      <p className="text-sm font-medium text-gray-700">
        Importing test cases... {progress}/{total}
      </p>
      <div className="h-2 w-64 overflow-hidden bg-gray-100">
        <div
          className="h-full bg-blue-600 transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DoneStep({ result }: { result: ImportResult }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      {result.failed === 0 ? (
        <CheckCircle size={36} weight="bold" className="text-emerald-500" />
      ) : (
        <WarningCircle size={36} weight="bold" className="text-amber-500" />
      )}
      <p className="text-sm font-bold text-gray-800">Import Complete</p>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-emerald-600 font-medium">{result.succeeded} succeeded</span>
        {result.failed > 0 && (
          <span className="text-red-600 font-medium">{result.failed} failed</span>
        )}
      </div>
      {result.errors.length > 0 && (
        <div className="mt-2 max-h-32 w-full max-w-md overflow-auto border border-red-100 bg-red-50 p-3">
          <ul className="text-[11px] text-red-600 space-y-0.5">
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
