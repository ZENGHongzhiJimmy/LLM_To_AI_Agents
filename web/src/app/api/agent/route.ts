export const maxDuration = 120;

import { runAgentUntilTextOrPending } from "@/lib/agent-loop";
import { ndjsonResponse, ndjsonStream } from "@/lib/ndjson";
import { llmOptionsFromBody } from "@/lib/openrouter";
import type { ChatMessage } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const messages = structuredClone((body.messages ?? []) as ChatMessage[]);
  const tools = body.tools as unknown[];
  const maxRounds = Math.min(Math.max(Number(body.maxRounds) || 8, 1), 12);
  const { stream, send, close } = ndjsonStream();

  void (async () => {
    try {
      await runAgentUntilTextOrPending({
        messages,
        tools,
        ...llmOptionsFromBody(body),
        emit: send,
        maxRounds,
      });
    } catch (error) {
      send({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      close();
    }
  })();

  return ndjsonResponse(stream);
}
