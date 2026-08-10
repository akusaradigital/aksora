"use client";

import { cn } from"@/lib/utils";

type Props = {
 message?: string;
 className?: string;
};

export function FormFieldError({ message, className }: Props) {
 if (!message) return null;

 return (
  <p className={cn("mt-0 text-[11px] font-medium leading-4 text-rose-600", className)}>
   {message}
  </p>
 );
}
