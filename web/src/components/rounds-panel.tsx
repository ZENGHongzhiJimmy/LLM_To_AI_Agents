"use client";

import { useEffect, useState } from "react";
import { JsonBlock } from "@/components/json-block";
import { TokenMetrics } from "@/components/token-metrics";
import type { Round } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RoundsPanel({
  rounds,
  emptyHint,
  itemLabel = "Round",
}: {
  rounds: Round[];
  emptyHint: string;
  itemLabel?: string;
}) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!rounds.length) {
      setSelected(0);
      return;
    }
    if (selected >= rounds.length) {
      setSelected(0);
    }
  }, [rounds.length, selected]);

  if (!rounds.length) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        {emptyHint}
      </div>
    );
  }

  const round = rounds[selected] ?? rounds[0];

  return (
    <div className="flex min-h-0 gap-3">
      <nav
        aria-label={itemLabel}
        className="flex w-9 shrink-0 flex-col gap-1 border-r border-border pr-1.5"
      >
        {rounds.map((_, index) => {
          const active = index === selected;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(index)}
              className={cn(
                "h-8 w-full rounded-md text-sm tabular-nums transition-colors",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              {index + 1}
            </button>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-sm text-muted-foreground">
          {itemLabel} {selected + 1} of {rounds.length}
        </p>
        <div>
          <p className="mb-1 text-sm font-medium">Messages sent to server</p>
          <JsonBlock value={round.sent} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">JSON response</p>
          <JsonBlock value={round.response} />
        </div>
        <TokenMetrics usage={round.usage} />
      </div>
    </div>
  );
}

export function SingleExchangePanel({
  sent,
  response,
  usage,
}: {
  sent?: unknown;
  response?: unknown;
  usage?: Round["usage"];
}) {
  if (!sent && !response) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Run a request to see the JSON payload and response.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Messages sent to server</h3>
        {sent ? (
          <JsonBlock value={sent} />
        ) : (
          <p className="text-sm text-muted-foreground">No request yet.</p>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">JSON response</h3>
        {response ? (
          <JsonBlock value={response} />
        ) : (
          <p className="text-sm text-muted-foreground">No response yet.</p>
        )}
      </div>
      <TokenMetrics usage={usage} />
    </div>
  );
}
