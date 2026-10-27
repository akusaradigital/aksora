"use client";

import { X } from"@phosphor-icons/react";

type DashboardStandupModalProps = {
 open: boolean;
 text: string;
 onClose: () => void;
 onCopy: () => void;
};

export function DashboardStandupModal({ open, text, onClose, onCopy }: DashboardStandupModalProps) {
 if (!open) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
 <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
 <div className="flex items-center justify-between border-b border-gray-200/80 px-5 py-4">
 <h2 className="text-base font-bold text-gray-900">Standup Log</h2>
 <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
 <X size={15} weight="bold" />
 </button>
 </div>
 <div className="p-5">
 <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50/70 p-4 font-mono text-xs leading-relaxed text-gray-700">
 {text}
 </pre>
 </div>
 <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
 <button onClick={onClose} className="flex h-9 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 transition hover:bg-gray-50">
 Cancel
 </button>
 <button onClick={onCopy} className="flex h-9 flex-1 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white transition hover:bg-blue-700">
 Copy to Clipboard
 </button>
 </div>
 </div>
 </div>
 );
}
