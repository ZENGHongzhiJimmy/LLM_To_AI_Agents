import { existsSync, readFileSync } from "fs";
import path from "path";
import { getWorkDir } from "./env";
import type { ChatMessage } from "./types";

const PLACEHOLDER = "{document_context}";

function notesText() {
  const notesPath = path.join(getWorkDir(), "notes.md");
  if (!existsSync(notesPath)) {
    return "(notes.md was not found)";
  }
  return readFileSync(notesPath, "utf-8");
}

export function expandDocumentContext(messages: ChatMessage[]): ChatMessage[] {
  if (!messages.some((message) => message.content?.includes(PLACEHOLDER))) {
    return messages;
  }
  const notes = notesText();
  return messages.map((message) => {
    if (!message.content?.includes(PLACEHOLDER)) return message;
    return {
      ...message,
      content: message.content.split(PLACEHOLDER).join(notes),
    };
  });
}
