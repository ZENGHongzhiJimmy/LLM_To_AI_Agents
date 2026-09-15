import type { LlmConnection, StreamEvent } from "./types";

export function connectionPayload(connection: LlmConnection) {
  const apiKey = connection.apiKey.trim();
  const model = connection.model.trim();
  const apiUrl = connection.apiUrl.trim();
  return {
    ...(apiKey ? { apiKey } : {}),
    ...(model ? { model } : {}),
    ...(apiUrl ? { apiUrl } : {}),
  };
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function readNdjson(
  url: string,
  body: unknown,
  onEvent: (event: StreamEvent) => void
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.body) throw new Error("No response stream");
  if (!res.ok && res.headers.get("content-type")?.includes("application/json")) {
    const data = await res.json();
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as StreamEvent);
    }
  }
  if (buffer.trim()) {
    onEvent(JSON.parse(buffer) as StreamEvent);
  }
}
