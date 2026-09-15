"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ConversationThread } from "@/components/conversation-thread";
import { JsonEditor } from "@/components/json-editor";
import { RoundsPanel } from "@/components/rounds-panel";
import {
  Explorable,
  LessonProse,
  LessonTask,
  SampleBlock,
  Subsection,
  TutorialSection,
} from "@/components/tutorial-section";
import { connectionPayload, readNdjson } from "@/lib/client";
import { STEP3_SYSTEM_DEFAULT, STEP3_TOOL_SCHEMAS } from "@/lib/constants";
import type { ChatMessage, LlmConnection, Round } from "@/lib/types";

export function Step3Panel({ connection }: { connection: LlmConnection }) {
  const [system, setSystem] = useState(STEP3_SYSTEM_DEFAULT);
  const [schemaText, setSchemaText] = useState(
    JSON.stringify(STEP3_TOOL_SCHEMAS, null, 2)
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: STEP3_SYSTEM_DEFAULT },
  ]);
  const [draft, setDraft] = useState(
    "What is inside notes.md? Summarize it in one line."
  );
  const [maxRounds, setMaxRounds] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);

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
    setRounds([]);
    setError(null);
  }

  function resetSchemas() {
    setSchemaText(JSON.stringify(STEP3_TOOL_SCHEMAS, null, 2));
    setSchemaError(null);
  }

  function parseTools() {
    const parsed = JSON.parse(schemaText);
    if (!Array.isArray(parsed)) throw new Error("Tool schemas must be a JSON array.");
    return parsed;
  }

  async function send() {
    const text = draft.trim();
    if (!text || loading) return;
    let toolsPayload: unknown[];
    try {
      toolsPayload = parseTools();
      setSchemaError(null);
    } catch (err) {
      setSchemaError(err instanceof Error ? err.message : String(err));
      return;
    }

    const next: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: text },
    ];
    setMessages(next);
    setRounds([]);
    setLoading(true);
    setError(null);
    try {
      await readNdjson(
        "/api/step3",
        {
          system,
          user: text,
          tools: toolsPayload,
          maxRounds,
          ...connectionPayload(connection),
        },
        (event) => {
          if (event.type === "round") {
            setRounds((prev) => [...prev, event.round]);
            setMessages((prev) => [...prev, event.round.response]);
          } else if (event.type === "tool") {
            setMessages((prev) => [
              ...prev,
              {
                role: "tool",
                content: event.event.result,
                tool_call_id: event.event.name,
              },
            ]);
          } else if (event.type === "final") {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (
                last?.role === "assistant" &&
                (last.content ?? "") === (event.reply ?? "")
              ) {
                return prev;
              }
              if (event.reply && last?.role !== "assistant") {
                return [...prev, { role: "assistant", content: event.reply }];
              }
              return prev;
            });
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <TutorialSection
      title="Tool Use"
      lead="In the last section, a completion was only text. Here we tell the LLM about a function our program can run. If it asks for that function, we run it, send the result back, and call the API again."
    >
      <Subsection number="3.1" title="A tool for reading a file">
        <LessonProse>
          <p>
            Let’s say the user asks, “What is inside{" "}
            <code>notes.md</code>?” The LLM cannot open that file, so
            it cannot know the answer by itself. But our program can
            open a file on disk and return the text.
          </p>
          <p>
            So we add a function called <code>read_file</code>. It
            takes a path, reads the file, and gives back the
            contents. That is enough.
          </p>
          <p>
            The LLM cannot run that Python function directly. It
            cannot even see your source code. So we have to tell it
            three things: that the function exists, when to use it,
            and what argument to pass. We send that information in a{" "}
            <code>tools</code> list. In the code, that list is called{" "}
            <code>TOOL_SCHEMAS</code>. Each entry gives the tool’s
            name, a short description, and its parameters. This is
            the list this page sends:
          </p>
        </LessonProse>
        <SampleBlock>
{`TOOL_SCHEMAS = [
  {
    "type": "function",
    "function": {
      "name": "read_file",
      "description": "Read a text file and return its contents.",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "Path of the file to read" }
        },
        "required": ["path"]
      }
    }
  }
]`}
        </SampleBlock>
        <LessonProse>
          <p>
            The important part is the <code>description</code>. That
            is what helps the LLM decide that a question about{" "}
            <code>notes.md</code> should turn into a{" "}
            <code>read_file</code> call with <code>path</code> set to{" "}
            <code>notes.md</code>.
          </p>
          <p>
            In the last section, we already called{" "}
            <code>chat.completions.create</code> with a model name
            and a <code>messages</code> list. Now we add one more
            argument: <code>tools</code>. We pass in{" "}
            <code>TOOL_SCHEMAS</code>, and the SDK puts that array
            into the JSON body right next to <code>messages</code>.
          </p>
        </LessonProse>
        <SampleBlock>
{`completion = client.chat.completions.create(
    model="deepseek/deepseek-v4-flash-0731",
    messages=messages,
    tools=TOOL_SCHEMAS,
)

message = completion.choices[0].message
# message.content is text, or None if the model asked for a tool
# message.tool_calls is the list of function names and arguments`}
        </SampleBlock>
        <LessonProse>
          <p>
            <code>tools</code> is the only new argument. If you leave
            it out, the LLM can only write text. If you pass the
            array, the completion may return <code>tool_calls</code>{" "}
            instead of a sentence. Here is what that looks like when
            the model wants <code>notes.md</code>.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "read_file",
        "arguments": { "path": "notes.md" }
      }
    }
  ]
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            Look at <code>tool_calls</code>. The LLM is asking our
            program to call <code>read_file</code> and pass{" "}
            <code>notes.md</code> as <code>path</code>. The LLM does
            not open the file. Our program runs{" "}
            <code>read_file</code>. Later we send the file text back.
          </p>
          <p>
            After <code>read_file</code> returns, we append a new
            turn with role <code>tool</code>. The{" "}
            <code>content</code> is whatever the function gave back,
            for example the file text.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "role": "tool",
  "tool_call_id": "call_1",
  "content": "Meeting notes: ship the lab by Friday."
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            Then we send the updated list, and the same schemas, in a
            second call. We repeat until the completion has no{" "}
            <code>tool_calls</code>. That repeat is the{" "}
            <strong>loop</strong>.
          </p>
          <ol>
            <li>Send conversation history and the tool schemas.</li>
            <li>
              If the completion has <code>tool_calls</code>, run
              those functions and append role <code>tool</code>{" "}
              turns.
            </li>
            <li>Call the API again with the new history.</li>
            <li>
              Stop when a completion has no <code>tool_calls</code>.
              That text is the reply.
            </li>
          </ol>
          <p>
            Here we only run <code>read_file</code>. If the name is
            unknown, we put an error string in the tool turn.
          </p>
        </LessonProse>
      </Subsection>

      <Subsection number="3.2" title="Try tool use">
        <LessonTask>
          <p>
            Keep <code>notes.md</code> in the lab folder. Send the
            default question. It asks what is inside{" "}
            <code>notes.md</code>, in one line.
          </p>
          <ol>
            <li>
              Watch the conversation. The first assistant turn often
              has <code>tool_calls</code> and almost no text for you.
            </li>
            <li>
              Then our program appends the file text, and another
              completion runs.
            </li>
            <li>
              On the right, under Requests, find the{" "}
              <code>tool_calls</code> and the later role{" "}
              <code>tool</code> entries.
            </li>
            <li>
              You can also ask about a missing file and see how the
              model explains a failed read.
            </li>
          </ol>
        </LessonTask>
        <Explorable
          title="Explorable"
          action={
            <Button variant="outline" onClick={reset}>
              Reset conversation
            </Button>
          }
        >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="s3-system">System prompt</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncSystem(STEP3_SYSTEM_DEFAULT)}
            >
              Reset
            </Button>
          </div>
          <Textarea
            id="s3-system"
            value={system}
            onChange={(e) => syncSystem(e.target.value)}
            className="min-h-32"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="s3-tools">Tool schemas (JSON)</Label>
            <Button variant="outline" size="sm" onClick={resetSchemas}>
              Reset
            </Button>
          </div>
          <JsonEditor
            id="s3-tools"
            value={schemaText}
            onChange={setSchemaText}
          />
          {schemaError && (
            <p className="text-sm text-destructive">{schemaError}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="space-y-2">
            <Label>Max loop rounds: {maxRounds}</Label>
            <Slider
              min={1}
              max={8}
              step={1}
              value={[maxRounds]}
              onValueChange={(v) => {
                const next = Array.isArray(v) ? v[0] : v;
                setMaxRounds(next ?? 5);
              }}
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
              placeholder="Ask a question that needs a tool…"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !draft.trim()}>
              {loading ? "Running…" : "Send"}
            </Button>
          </form>
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-wrap">
                {error}
              </AlertDescription>
            </Alert>
          )}
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
                  Ask a question. Tool calls and results appear here as the loop
                  runs.
                </p>
              )}
              <ConversationThread messages={messages} />
            </div>
          </ScrollArea>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold">Requests</h2>
          <RoundsPanel
            rounds={rounds}
            itemLabel="Request"
            emptyHint="Ask a question to see each model request and response."
          />
        </section>
      </div>
        </Explorable>
      </Subsection>

      <Subsection number="3.3" title="Summary">
        <LessonProse>
          <p>
            In this section we told the model about{" "}
            <code>read_file</code> with a <code>TOOL_SCHEMAS</code>{" "}
            list. We learned that the completion can ask for that
            function, our program runs it, and we send the result
            back. We repeat that until the reply is ordinary text.
            That repeat is the loop.
          </p>
        </LessonProse>
      </Subsection>
    </TutorialSection>
  );
}
