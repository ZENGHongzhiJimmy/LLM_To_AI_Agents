"use client";

import { useRef } from "react";
import { highlightJson } from "@/lib/highlight-json";
import { OUTPUT_TEXT } from "@/lib/output-text";
import { cn } from "@/lib/utils";

export function JsonEditor({
  id,
  value,
  onChange,
  className,
  compact,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const highlightRef = useRef<HTMLPreElement>(null);
  const minH = compact ? "min-h-32 h-32" : "min-h-80";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-none border border-border bg-muted",
        minH,
        className
      )}
    >
      <pre
        ref={highlightRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-auto p-2.5 text-slate-600 ${minH} ${OUTPUT_TEXT}`}
        dangerouslySetInnerHTML={{ __html: highlightJson(value) }}
      />
      <textarea
        id={id}
        wrap="soft"
        spellCheck={false}
        suppressHydrationWarning
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (highlightRef.current) {
            highlightRef.current.scrollTop = el.scrollTop;
            highlightRef.current.scrollLeft = el.scrollLeft;
          }
        }}
        className={`relative z-10 h-full w-full max-w-full resize-y overflow-auto bg-transparent p-2.5 text-transparent caret-slate-800 outline-none ${minH} ${OUTPUT_TEXT}`}
      />
    </div>
  );
}
