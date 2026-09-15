import { NextResponse } from "next/server";

export const maxDuration = 120;
import { chatCompletion, llmOptionsFromBody } from "@/lib/openrouter";
import type { ChatMessage } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = (body.messages ?? []) as ChatMessage[];
    const tools = body.tools as unknown[] | undefined;
    const result = await chatCompletion({
      messages,
      tools,
      ...llmOptionsFromBody(body),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
