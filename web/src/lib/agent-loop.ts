import { assistantToHistory, chatCompletion } from "@/lib/openrouter";
import { executeKnownTool, parseToolArgs, toolRunCommand } from "@/lib/tools";
import type { ChatMessage, StreamEvent, ToolCall } from "@/lib/types";

type Emit = (event: StreamEvent) => void;

export async function runAgentUntilTextOrPending({
  messages,
  tools,
  apiKey,
  model,
  apiUrl,
  emit,
  maxRounds = 10,
}: {
  messages: ChatMessage[];
  tools: unknown[];
  apiKey?: string | null;
  model?: string | null;
  apiUrl?: string | null;
  emit: Emit;
  maxRounds?: number;
}) {
  for (let i = 0; i < maxRounds; i++) {
    const sent = structuredClone(messages);
    const { message, usage } = await chatCompletion({
      messages,
      tools,
      apiKey,
      model,
      apiUrl,
    });
    emit({ type: "round", round: { sent, response: message, usage } });
    messages.push(assistantToHistory(message));

    const toolCalls = (message.tool_calls ?? []) as ToolCall[];
    if (!toolCalls.length) {
      emit({
        type: "final",
        reply: message.content ?? "",
        messages: structuredClone(messages),
      });
      return;
    }

    for (let idx = 0; idx < toolCalls.length; idx++) {
      const toolCall = toolCalls[idx];
      const name = toolCall.function.name;
      const args = parseToolArgs(toolCall);

      if (name === "run_command") {
        for (const prev of toolCalls.slice(0, idx)) {
          await executeAndAppend(messages, prev, emit);
        }
        emit({
          type: "pending",
          command: String(args.command ?? ""),
          toolCall,
          remaining: toolCalls.slice(idx + 1),
          messages: structuredClone(messages),
        });
        return;
      }

      await executeAndAppend(messages, toolCall, emit);
    }
  }

  emit({
    type: "final",
    reply: "(stopped: max agent rounds reached)",
    messages: structuredClone(messages),
  });
}

export async function continueAfterCommand({
  messages,
  toolCall,
  remaining,
  approved,
  tools,
  apiKey,
  model,
  apiUrl,
  emit,
  maxRounds = 10,
}: {
  messages: ChatMessage[];
  toolCall: ToolCall;
  remaining: ToolCall[];
  approved: boolean;
  tools: unknown[];
  apiKey?: string | null;
  model?: string | null;
  apiUrl?: string | null;
  emit: Emit;
  maxRounds?: number;
}) {
  const args = parseToolArgs(toolCall);
  const command = String(args.command ?? "");
  const result = approved
    ? await toolRunCommand(command)
    : "The user declined to run this command.";

  emit({
    type: "tool",
    event: {
      name: "run_command",
      args: { command },
      ok: approved,
      result,
    },
  });
  messages.push({
    role: "tool",
    tool_call_id: toolCall.id,
    content: result,
  });

  for (const next of remaining) {
    if (next.function.name === "run_command") {
      emit({
        type: "pending",
        command: String(parseToolArgs(next).command ?? ""),
        toolCall: next,
        remaining: remaining.slice(remaining.indexOf(next) + 1),
        messages: structuredClone(messages),
      });
      return;
    }
    await executeAndAppend(messages, next, emit);
  }

  await runAgentUntilTextOrPending({
    messages,
    tools,
    apiKey,
    model,
    apiUrl,
    emit,
    maxRounds,
  });
}

async function executeAndAppend(
  messages: ChatMessage[],
  toolCall: ToolCall,
  emit: Emit
) {
  const name = toolCall.function.name;
  const args = parseToolArgs(toolCall);
  const { ok, result } = await executeKnownTool(name, args);
  emit({ type: "tool", event: { name, args, ok, result } });
  messages.push({
    role: "tool",
    tool_call_id: toolCall.id,
    content: result,
  });
}
