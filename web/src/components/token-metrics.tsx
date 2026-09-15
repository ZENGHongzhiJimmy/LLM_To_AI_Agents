"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Usage } from "@/lib/types";

export function TokenMetrics({ usage }: { usage?: Usage }) {
  if (!usage) return null;
  const items = [
    ["Input", usage.prompt_tokens],
    ["Output", usage.completion_tokens],
    ["Total", usage.total_tokens],
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(([label, value]) => (
        <Card key={label} className="shadow-none">
          <CardContent className="px-3 py-2">
            <p className="text-sm text-muted-foreground">{label} tokens</p>
            <p className="text-lg font-semibold tabular-nums">{value ?? "—"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
