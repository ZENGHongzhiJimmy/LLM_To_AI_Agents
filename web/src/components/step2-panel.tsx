"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ConversationThread } from "@/components/conversation-thread";
import { SingleExchangePanel } from "@/components/rounds-panel";
import {
  Explorable,
  LessonProse,
  LessonTask,
  SampleBlock,
  Subsection,
  TutorialSection,
} from "@/components/tutorial-section";
import { connectionPayload, postJson } from "@/lib/client";
import { SYSTEM_ALICE } from "@/lib/constants";
import type { ChatMessage, LlmConnection, Usage } from "@/lib/types";

export function Step2Panel({ connection }: { connection: LlmConnection }) {
  const [system, setSystem] = useState(SYSTEM_ALICE);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: SYSTEM_ALICE },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<ChatMessage[] | null>(null);
  const [lastResponse, setLastResponse] = useState<ChatMessage | null>(null);
  const [lastUsage, setLastUsage] = useState<Usage | undefined>();

  function syncSystem(next: string) {
    setSystem(next);
    setMessages((prev) => {
      const copy = [...prev];
      if (copy[0]?.role === "system") copy[0] = { ...copy[0], content: next };
      return copy;
    });
  }

  function reset() {
    setMessages([{ role: "system", content: system }]);
    setLastSent(null);
    setLastResponse(null);
    setLastUsage(undefined);
    setError(null);
  }

  async function send() {
    const text = draft.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setDraft("");
    setLoading(true);
    setError(null);
    try {
      const data = await postJson<{ message: ChatMessage; usage: Usage }>(
        "/api/chat",
        { messages: next, ...connectionPayload(connection) }
      );
      const assistant: ChatMessage = {
        role: "assistant",
        content: data.message.content,
      };
      if (data.message.reasoning_details != null) {
        assistant.reasoning_details = data.message.reasoning_details;
      }
      setMessages([...next, assistant]);
      setLastSent(next);
      setLastResponse(data.message);
      setLastUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages(next.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <TutorialSection
      title="Conversation history"
      lead="In the last section we made one request. We sent a system message and a user message, and we got one completion back. When that request finishes, the API is done with it. It does not store what we sent. If the user speaks again, our program has to send the earlier turns with the new question. That growing list is conversation history."
    >
      <Subsection number="2.1" title="A follow-up question">
        <LessonProse>
          <p>
            Let’s say the user asks, “What are the stages in software
            development?” The first request is the same shape as in
            the last section. We send a system message and that user
            question.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "model": "deepseek/deepseek-v4-flash-0731",
  "messages": [
    { "role": "system", "content": "You are Alice..." },
    { "role": "user", "content": "What are the stages in software development?" }
  ]
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            The completion is one assistant message. That is the
            reply. This is a short example.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "role": "assistant",
  "content": "Requirements, design, implementation, testing, and maintenance."
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            Our program stores that reply. The list now has the
            system message, the user question, and the assistant
            reply.
          </p>
          <p>
            Then the user asks, “Tell me more.”
          </p>
          <p>
            If the second request contained only “Tell me more,” the
            LLM would not have seen the first question. The API does
            not store the last request. It only sees the{" "}
            <code>messages</code> you send now. So “more” has nothing
            to attach to.
          </p>
          <p>
            So we send the conversation history together with the
            follow-up. That means the system message, the first user
            message, the assistant reply, and then “Tell me more.”
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "model": "deepseek/deepseek-v4-flash-0731",
  "messages": [
    { "role": "system", "content": "You are Alice..." },
    { "role": "user", "content": "What are the stages in software development?" },
    { "role": "assistant", "content": "Requirements, design, implementation, testing, and maintenance." },
    { "role": "user", "content": "Tell me more." }
  ]
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            That growing <code>messages</code> list is{" "}
            <strong>conversation history</strong>. People also call it{" "}
            <strong>context</strong>. A <strong>context window</strong>{" "}
            is the size limit of that list.
          </p>
        </LessonProse>
      </Subsection>

      <Subsection number="2.2" title="Try conversation history">
        <LessonTask>
          <p>
            Now try it. First ask, “What are the stages in software
            development?” Then ask, “Tell me more.”
          </p>
          <ol>
            <li>
              Send the first question and read the reply.
            </li>
            <li>
              Send “Tell me more.” The second request should include the
              first question and the first reply, so the model knows
              what “more” means.
            </li>
            <li>
              Open the messages sent to the server. The second request
              should include the system message, the first question,
              the first reply, and “Tell me more.”
            </li>
          </ol>
          <p>
            If you reset the conversation and send only “Tell me more,”
            the model has nothing to expand.
          </p>
        </LessonTask>
        <Explorable
          title="Explorable"
          action={
            <Button variant="outline" onClick={reset}>
              Reset conversation
            </Button>
          }
        >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s2-system">System prompt</Label>
            <Textarea
              id="s2-system"
              value={system}
              onChange={(e) => syncSystem(e.target.value)}
              className="min-h-24"
            />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Your message"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !draft.trim()}>
              {loading ? "Sending…" : "Send"}
            </Button>
          </form>
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-wrap">
                {error}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Conversation</h2>
              <Button variant="outline" size="sm" onClick={reset}>
                Clear
              </Button>
            </div>
            <ScrollArea className="h-[28rem] min-w-0 rounded-none border border-border bg-background p-3">
              <div className="min-w-0 space-y-3 overflow-hidden">
                {messages.filter((m) => m.role !== "system").length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ask “What are the stages in software development?”
                    Then ask “Tell me more.”
                  </p>
                )}
                <ConversationThread messages={messages} />
              </div>
            </ScrollArea>
          </div>
        </section>
        <section>
          <SingleExchangePanel
            sent={lastSent ?? undefined}
            response={lastResponse ?? undefined}
            usage={lastUsage}
          />
        </section>
      </div>
        </Explorable>
      </Subsection>

      <Subsection number="2.3" title="Summary">
        <LessonProse>
          <p>
            In this section we sent a follow-up after the first
            reply. We learned that the second request has to include
            the earlier turns and the new question in the same{" "}
            <code>messages</code> list. Our program keeps that list.
            That list is conversation history.
          </p>
        </LessonProse>
      </Subsection>
    </TutorialSection>
  );
}
