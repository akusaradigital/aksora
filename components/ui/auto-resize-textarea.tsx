"use client";

import { useEffect, useRef } from"react";
import { cn } from"@/lib/utils";

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
 error?: boolean;
}

export function AutoResizeTextarea({ error, className, ...props }: AutoResizeTextareaProps) {
 const textareaRef = useRef<HTMLTextAreaElement | null>(null);

 function syncHeight() {
 const el = textareaRef.current;
 if (!el) return;
 el.style.height ="auto";
 el.style.height =`${el.scrollHeight}px`;
 }

 useEffect(() => {
 syncHeight();
 }, [props.value, props.defaultValue]);

 return (
 <textarea
 ref={textareaRef}
 {...props}
 rows={props.rows ?? 1}
 className={cn(
"w-full resize-none overflow-hidden  border bg-gray-50/50 px-4 py-[13.5px] text-sm leading-relaxed text-gray-800 outline-none transition focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.1)] focus:border-sky-300",
 error ?"border-rose-400" :"border-gray-200",
 className
 )}
 onInput={(event) => {
 syncHeight();
 props.onInput?.(event);
 }}
 />
 );
}
