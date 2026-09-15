"use client";

import { useState } from "react";
import { highlightJson } from "@/lib/highlight-json";
import { OUTPUT_TEXT } from "@/lib/output-text";

const PREVIEW_LINES = 12;

export function JsonBlock({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const full = JSON.stringify(value, null, 2);
  const lines = full.split("\n");
  const canCollapse = lines.length > PREVIEW_LINES;
  const collapsed = canCollapse && !expanded;
  const text = collapsed
    ? `${lines.slice(0, PREVIEW_LINES).join("\n")}\n…`
    : full;

  return (
    <div className="space-y-1.5">
      <pre
        className={`max-w-full rounded-none border border-border bg-muted p-3 text-foreground ${OUTPUT_TEXT}`}
        dangerouslySetInnerHTML={{
          __html: highlightJson(text),
        }}
      />
      {canCollapse && (
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Show less" : `Show all (${lines.length} lines)`}
        </button>
      )}
    </div>
  );
}
