export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool" | string;
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  reasoning_details?: unknown;
};

export type ToolCall = {
  id: string;
  type?: string;
  function: {
    name: string;
    arguments: string;
  };
};

export type LlmConnection = {
  apiKey: string;
  model: string;
  apiUrl: string;
};

export type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type Round = {
  sent: ChatMessage[];
  response: ChatMessage;
  usage?: Usage;
};

export type ToolEvent = {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  result: string;
};

export type StreamEvent =
  | { type: "round"; round: Round }
  | { type: "tool"; event: ToolEvent }
  | { type: "final"; reply: string; messages?: ChatMessage[] }
  | {
      type: "pending";
      command: string;
      toolCall: ToolCall;
      remaining: ToolCall[];
      messages: ChatMessage[];
    }
  | { type: "error"; message: string };
