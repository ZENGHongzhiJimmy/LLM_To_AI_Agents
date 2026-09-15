"use client";

import { useState } from "react";
import { ChatBubble } from "@/components/chat-bubble";
import type { ChatMessage } from "@/lib/types";

const KEEP = 4;

export function ConversationThread({
  messages,
}: {
  messages: ChatMessage[];
}) {
  const visible = messages.filter((m) => m.role !== "system");
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = visible.length - KEEP;
  const collapsed = !expanded && hiddenCount > 0;
  const shown = collapsed ? visible.slice(-KEEP) : visible;
  const startIndex = collapsed ? visible.length - KEEP : 0;

  if (visible.length === 0) return null;

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      {collapsed && (
        <button
          type="button"
          className="w-full rounded-none border border-dashed border-border py-1.5 text-sm text-muted-foreground hover:bg-muted"
          onClick={() => setExpanded(true)}
        >
          … {hiddenCount} earlier {hiddenCount === 1 ? "message" : "messages"}
        </button>
      )}
      {shown.map((message, i) => (
        <ChatBubble key={startIndex + i} message={message} />
      ))}
      {expanded && hiddenCount > 0 && (
        <button
          type="button"
          className="w-full rounded-none py-1 text-sm text-muted-foreground hover:underline"
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      )}
    </div>
  );
}
