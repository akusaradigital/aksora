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
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 ">
 <div className="w-full max-w-lg  glass-card shadow-md">
 <div className="flex items-center justify-between border-b border-gray-200/60 p-5">
 <h2 className="text-base font-bold text-gray-900">Standup Log</h2>
 <button onClick={onClose} className="flex h-7 w-7 items-center justify-center  text-gray-400 transition hover:bg-gray-100">
 <X size={15} weight="bold" />
 </button>
 </div>
 <div className="p-5">
 <pre className="whitespace-pre-wrap  glass-card bg-white/40 p-4 font-mono text-xs leading-relaxed text-gray-600">
 {text}
 </pre>
 </div>
 <div className="flex gap-3 p-5 pt-0">
 <button onClick={onClose} className="flex h-10 flex-1 items-center justify-center  glass-card text-sm font-bold text-gray-600 transition-all duration-150 hover:bg-gray-100  ">
 Cancel
 </button>
 <button onClick={onCopy} className="flex h-10 flex-1 items-center justify-center  bg-blue-600 text-sm font-bold text-white transition-all duration-150 hover:bg-blue-500  ">
 Copy to Clipboard
 </button>
 </div>
 </div>
 </div>
 );
}
