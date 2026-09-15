import { expandDocumentContext } from "./document-context";
import { getApiKey, getApiUrl, getModel } from "./env";
import type { ChatMessage, Usage } from "./types";

export function llmOptionsFromBody(body: Record<string, unknown>) {
  return {
    apiKey: (body.apiKey as string | undefined) ?? null,
    model: (body.model as string | undefined) ?? null,
    apiUrl: (body.apiUrl as string | undefined) ?? null,
  };
}

export function assistantToHistory(message: ChatMessage): ChatMessage {
  const entry: ChatMessage = {
    role: "assistant",
    content: message.content ?? null,
  };
  if (message.tool_calls) entry.tool_calls = message.tool_calls;
  if (message.reasoning_details != null) {
    entry.reasoning_details = message.reasoning_details;
  }
  return entry;
}

export async function chatCompletion({
  messages,
  tools,
  apiKey,
  model,
  apiUrl,
}: {
  messages: ChatMessage[];
  tools?: unknown[];
  apiKey?: string | null;
  model?: string | null;
  apiUrl?: string | null;
}): Promise<{ message: ChatMessage; usage: Usage; sent: ChatMessage[] }> {
  const key = getApiKey(apiKey);
  const resolvedModel = getModel(model);
  const url = getApiUrl(apiUrl);

  if (!key) {
    throw new Error(
      "API key is missing. Add OPENROUTER_API_KEY or OPENAI_API_KEY to .env, or paste it in the sidebar."
    );
  }
  if (!resolvedModel) {
    throw new Error(
      "Model is missing. Add MODEL or OPENAI_MODEL to .env, or enter it in the sidebar."
    );
  }
  if (!url) {
    throw new Error(
      "API endpoint is missing. Add OPENAI_BASE_URL or OPENROUTER_URL to .env, or enter it in the sidebar."
    );
  }

  const sent = expandDocumentContext(messages);

  const payload: Record<string, unknown> = {
    model: resolvedModel,
    messages: sent,
  };
  if (url.includes("openrouter.ai")) {
    payload.reasoning = { enabled: false };
  }
  if (Array.isArray(tools) && tools.length > 0) payload.tools = tools;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!data.choices) {
    throw new Error(
      `API error (${response.status}): ${JSON.stringify(data, null, 2)}`
    );
  }

  return {
    message: data.choices[0].message as ChatMessage,
    usage: (data.usage ?? {}) as Usage,
    sent,
  };
}
