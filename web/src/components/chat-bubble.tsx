"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { OUTPUT_TEXT } from "@/lib/output-text";
import type { ChatMessage } from "@/lib/types";

const PREVIEW_CHARS = 360;

const MARKDOWN =
  "min-w-0 break-words [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:font-sans [&_code]:text-sm [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/5 [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:underline [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-current/30 [&_blockquote]:pl-3";

function MarkdownBody({ text }: { text: string }) {
  return (
    <div className={`font-sans text-sm leading-relaxed break-words [overflow-wrap:anywhere] ${MARKDOWN}`}>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

function ExpandableMarkdown({
  text,
  maxChars = PREVIEW_CHARS,
}: {
  text: string;
  maxChars?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const tooLong = text.length > maxChars;
  const shown = !tooLong || expanded ? text : `${text.slice(0, maxChars).trimEnd()}…`;

  return (
    <div>
      <MarkdownBody text={shown} />
      {tooLong && (
        <button
          type="button"
          className="mt-1 text-sm opacity-80 underline-offset-2 hover:underline"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function ToolCallPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const maxChars = 220;
  const tooLong = text.length > maxChars;
  const shown = !tooLong || expanded ? text : `${text.slice(0, maxChars).trimEnd()}…`;

  return (
    <div className={`mt-2 max-w-full overflow-hidden rounded-md bg-black/5 px-2 py-1 ${OUTPUT_TEXT}`}>
      <pre className="whitespace-pre-wrap">{shown}</pre>
      {tooLong && (
        <button
          type="button"
          className="mt-1 text-sm opacity-80 underline-offset-2 hover:underline"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export function ChatBubble({ message }: { message: ChatMessage }) {
  const role = message.role;
  if (role === "system") return null;

  if (role === "tool") {
    return (
      <div
        className={`min-w-0 max-w-full overflow-hidden rounded-none border border-border bg-muted p-3 ${OUTPUT_TEXT}`}
      >
        <p className="mb-1 font-medium text-foreground">
          Tool result
          {message.tool_call_id ? (
            <span className="ml-2 opacity-70">{message.tool_call_id}</span>
          ) : null}
        </p>
        <ExpandableMarkdown text={String(message.content ?? "")} />
      </div>
    );
  }

  const isUser = role === "user";
  return (
    <div className={`flex min-w-0 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`min-w-0 max-w-[90%] overflow-hidden rounded-none px-3 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border bg-card text-foreground"
        }`}
      >
        {message.content ? (
          <ExpandableMarkdown text={message.content} />
        ) : (
          <p className="opacity-70">No text content. Tool call only.</p>
        )}
        {message.tool_calls?.map((call) => (
          <ToolCallPreview
            key={call.id}
            text={`${call.function.name}(${call.function.arguments})`}
          />
        ))}
      </div>
    </div>
  );
}
