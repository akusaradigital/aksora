import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  labelClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showLabel?: boolean;
  compact?: boolean;
  white?: boolean;
};

export function BrandMark({
  className,
  labelClassName,
  titleClassName,
  subtitleClassName,
  showLabel = true,
  compact = false,
  white = false,
}: BrandMarkProps) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src={white ? "/logo-white.svg" : "/logo.svg"}
        alt="Aksora"
        width={compact ? 32 : 40}
        height={compact ? 32 : 40}
        className="shrink-0"
        priority
      />

      {showLabel && (
        <div className={cn("flex flex-col leading-none", labelClassName)}>
          <span className={cn("text-sm font-bold tracking-tight text-gray-900", titleClassName)}>Aksora</span>
          <span className={cn("mt-1 text-[11px] font-bold uppercase tracking-[0.32em] text-gray-500", subtitleClassName)}>
            One Team. One Flow.
          </span>
        </div>
      )}
    </div>
  );
}
