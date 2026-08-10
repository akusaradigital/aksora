"use client";

import { usePathname, useRouter } from"next/navigation";
import { useEffect, useRef, useState, useTransition } from"react";
import { FilePdf, FileXls, MagnifyingGlass, UploadSimple } from"@phosphor-icons/react";

export function SuitesHeaderActions({
 initialSearch,
 placeholder ="Search suites...",
 exportModule ="test-suites",
 importModule ="test-suites",
}: {
 initialSearch: string;
 placeholder?: string;
 exportModule?: string;
 importModule?: string;
}) {
 const router = useRouter();
 const pathname = usePathname();
 const uploadRef = useRef<HTMLInputElement | null>(null);
 const [value, setValue] = useState(initialSearch);
 const [locationSearch, setLocationSearch] = useState(() =>
   typeof window !== "undefined" ? window.location.search : ""
 );
 const [, startTransition] = useTransition();

 useEffect(() => {
 const syncSearch = () => {
 setLocationSearch(window.location.search);
 };

 window.addEventListener("popstate", syncSearch);
 return () => window.removeEventListener("popstate", syncSearch);
 }, []);

 function updateQuery(nextValue: string) {
 const params = new URLSearchParams(locationSearch);
 if (nextValue.trim()) params.set("q", nextValue.trim());
 else params.delete("q");
 const query = params.toString();
 setLocationSearch(`?${query}`);
 startTransition(() => router.replace(query ?`${pathname}?${query}` : pathname));
 }

 async function handleUpload(file: File | undefined) {
 if (!file) return;
 const formData = new FormData();
 formData.append("file", file);
 await fetch(`/api/import/${importModule}`, { method:"POST", body: formData });
 router.refresh();
 }

 return (
 <div className="flex flex-wrap items-center gap-3">
 <div className="relative w-full max-w-[360px] flex-1">
 <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 value={value}
 onChange={(event) => {
 const nextValue = event.target.value;
 setValue(nextValue);
 updateQuery(nextValue);
 }}
 placeholder={placeholder}
 className="h-11 w-full  border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
 />
 </div>
 <a
 href={`/api/export/${exportModule}`}
 title="Export Excel"
 aria-label="Export Excel"
 className="inline-flex h-11 w-11 items-center justify-center  border border-gray-200 bg-white text-gray-600 shadow-sm transition-all  hover:bg-blue-500 hover:text-white hover:border-blue-500"
 >
 <FileXls size={16} weight="bold" />
 </a>
 <a
 href={`/api/export/${exportModule}?format=pdf`}
 title="Print / Export PDF"
 aria-label="Print / Export PDF"
 className="inline-flex h-11 w-11 items-center justify-center  border border-gray-200 bg-white text-gray-600 shadow-sm transition-all  hover:bg-blue-500 hover:text-white hover:border-blue-500"
 >
 <FilePdf size={16} weight="bold" />
 </a>
 <button
 type="button"
 onClick={() => uploadRef.current?.click()}
 className="inline-flex h-11 w-11 items-center justify-center  border border-gray-200 bg-white text-gray-600 shadow-sm transition-all  hover:bg-blue-500 hover:text-white hover:border-blue-500"
 >
 <UploadSimple size={16} weight="bold" />
 </button>
 <input
 ref={uploadRef}
 type="file"
 accept=".xlsx,.xls"
 className="hidden"
 onChange={(event) => {
 const file = event.target.files?.[0];
 void handleUpload(file);
 event.currentTarget.value ="";
 }}
 />
 </div>
 );
}
