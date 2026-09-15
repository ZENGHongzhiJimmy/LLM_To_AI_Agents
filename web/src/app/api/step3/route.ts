export const maxDuration = 120;

import {
  assistantToHistory,
  chatCompletion,
  llmOptionsFromBody,
} from "@/lib/openrouter";
import { ndjsonResponse, ndjsonStream } from "@/lib/ndjson";
import { parseToolArgs, toolReadFile } from "@/lib/tools";
import type { ChatMessage, ToolCall } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const system = String(body.system ?? "");
  const user = String(body.user ?? "");
  const tools = body.tools as unknown[];
  const maxRounds = Math.min(Math.max(Number(body.maxRounds) || 5, 1), 8);
  const llm = llmOptionsFromBody(body);

  const { stream, send, close } = ndjsonStream();

  void (async () => {
    try {
      const messages: ChatMessage[] = [
        { role: "system", content: system },
        { role: "user", content: user },
      ];

      for (let round = 1; round <= maxRounds; round++) {
        const sent = structuredClone(messages);
        const { message, usage } = await chatCompletion({
          messages,
          tools,
          ...llm,
        });
        send({ type: "round", round: { sent, response: message, usage } });

        messages.push(assistantToHistory(message));
        const toolCalls = (message.tool_calls ?? []) as ToolCall[];
        if (!toolCalls.length) {
          send({ type: "final", reply: message.content ?? "" });
          return;
        }

        for (const toolCall of toolCalls) {
          const name = toolCall.function.name;
          const args = parseToolArgs(toolCall);
          let ok = false;
          let result: string;
          if (name !== "read_file") {
            result = `Error: unknown tool '${name}'. Only 'read_file' is supported.`;
          } else {
            const read = toolReadFile(String(args.path ?? ""));
            ok = read.ok;
            result = read.result;
          }
          send({ type: "tool", event: { name, args, ok, result } });
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      }

      send({ type: "final", reply: "(stopped: max rounds reached)" });
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
