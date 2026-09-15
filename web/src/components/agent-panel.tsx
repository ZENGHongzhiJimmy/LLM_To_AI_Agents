"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { AGENT_SYSTEM, AGENT_TOOL_SCHEMAS } from "@/lib/constants";
import { OUTPUT_TEXT } from "@/lib/output-text";
import type {
  ChatMessage,
  LlmConnection,
  Round,
  StreamEvent,
  ToolCall,
} from "@/lib/types";

type Pending = {
  command: string;
  toolCall: ToolCall;
  remaining: ToolCall[];
};

const DEFAULT_AGENT_TOOLS = AGENT_TOOL_SCHEMAS.filter(
  (schema) => schema.function.name === "list_files"
);

function defaultSchemaText() {
  return JSON.stringify(DEFAULT_AGENT_TOOLS, null, 2);
}

export function AgentPanel({ connection }: { connection: LlmConnection }) {
  const conversationRef = useRef<HTMLDivElement>(null);
  const [system, setSystem] = useState(AGENT_SYSTEM);
  const [schemaText, setSchemaText] = useState(defaultSchemaText);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: AGENT_SYSTEM },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [maxRounds, setMaxRounds] = useState(8);

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
    setPending(null);
    setError(null);
  }

  function parseTools() {
    const parsed = JSON.parse(schemaText);
    if (!Array.isArray(parsed)) throw new Error("Tool schemas must be a JSON array.");
    return parsed;
  }

  function selectedToolNames() {
    try {
      const parsed = JSON.parse(schemaText);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) =>
          item && typeof item === "object" && "function" in item
            ? String((item as { function?: { name?: string } }).function?.name ?? "")
            : ""
        )
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  function toggleTool(name: string) {
    const current = selectedToolNames();
    const next = current.includes(name)
      ? current.filter((item) => item !== name)
      : [...current, name];
    const schemas = AGENT_TOOL_SCHEMAS.filter((schema) =>
      next.includes(schema.function.name)
    );
    setSchemaText(JSON.stringify(schemas, null, 2));
    setSchemaError(null);
  }

  useEffect(() => {
    const viewport = conversationRef.current?.querySelector<HTMLElement>(
      "[data-slot='scroll-area-viewport']"
    );
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  function handleEvent(event: StreamEvent) {
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
      if (event.messages) setMessages(event.messages);
      setPending(null);
    } else if (event.type === "pending") {
      setMessages(event.messages);
      setPending({
        command: event.command,
        toolCall: event.toolCall,
        remaining: event.remaining,
      });
    } else if (event.type === "error") {
      setError(event.message);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || loading || pending) return;
    let tools: unknown[];
    try {
      tools = parseTools();
      setSchemaError(null);
    } catch (err) {
      setSchemaError(err instanceof Error ? err.message : String(err));
      return;
    }

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setDraft("");
    setLoading(true);
    setError(null);
    try {
      await readNdjson(
        "/api/agent",
        { messages: next, tools, maxRounds, ...connectionPayload(connection) },
        handleEvent
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function resolvePending(approved: boolean) {
    if (!pending) return;
    let tools: unknown[];
    try {
      tools = parseTools();
    } catch (err) {
      setSchemaError(err instanceof Error ? err.message : String(err));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await readNdjson(
        "/api/agent/approve",
        {
          messages,
          toolCall: pending.toolCall,
          remaining: pending.remaining,
          approved,
          tools,
          maxRounds,
          ...connectionPayload(connection),
        },
        handleEvent
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <TutorialSection
      title="Coding agent"
      lead="A coding agent is an AI system that can read, write, and change code on its own. It does not stop after one snippet. It reasons, chooses a tool, runs it, looks at the result, and repeats until the task is done or a person has to step in."
    >
      <Subsection number="4.1" title="How a coding agent works">
        <LessonProse>
          <p>
            In the last section we already used one{" "}
            <strong>tool</strong>, <code>read_file</code>, and we ran
            the loop that sends the result back. Here we put that
            loop in a small program and give the model more than one
            function. People call that program a{" "}
            <strong>harness</strong>. A coding agent is the LLM, that
            harness, and the tools, working together.
          </p>
          <p>
            The <strong>LLM</strong> is the reasoning core. It reads
            the user’s goal, plans the next step, and decides which
            tool to ask for. It still only writes text, including{" "}
            <code>tool_calls</code>. It does not touch the disk.
          </p>
          <p>
            The harness is our program. It sends the prompts, reads
            the completion, runs the function if the policy allows
            it, appends the result to the conversation history, and
            calls the API again. That repeat is the loop: receive the
            request, reason, select a tool, execute, observe, and go
            again.
          </p>
          <p>
            The <strong>tools</strong> are the actions. The model
            still only asks our program to run a function. In this
            lab we have four. <code>list_files</code> lists a folder.{" "}
            <code>read_file</code> returns file text.{" "}
            <code>write_file</code> saves new contents.{" "}
            <code>run_command</code> runs a shell command after you
            approve it.
          </p>
          <p>
            Let’s say the user asks, “Make a simple snake game in
            Python using Pygame.” The LLM cannot create a folder or a
            file by itself. It can only ask our program to run a
            function. We stay with this one request and see how all
            four tools get used.
          </p>
          <p>
            First we send a JSON request. The <code>messages</code>{" "}
            list holds the system prompt and that user question. The{" "}
            <code>tools</code> array names <code>list_files</code>,{" "}
            <code>read_file</code>, <code>write_file</code>, and{" "}
            <code>run_command</code>.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "model": "deepseek/deepseek-v4-flash-0731",
  "messages": [
    { "role": "system", "content": "You are a coding agent..." },
    {
      "role": "user",
      "content": "Make a simple snake game in Python using Pygame."
    }
  ],
  "tools": [
    { "type": "function", "function": { "name": "list_files" } },
    { "type": "function", "function": { "name": "read_file" } },
    { "type": "function", "function": { "name": "write_file" } },
    { "type": "function", "function": { "name": "run_command" } }
  ]
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            The first thing the model needs is a place to put the game.
            So it does not answer the user yet. The completion asks for{" "}
            <code>run_command</code>, and the command is{" "}
            <code>mkdir snake_game</code>.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "name": "run_command",
  "arguments": { "command": "mkdir snake_game" }
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            A shell command can be dangerous. <code>rm</code> is the
            usual example. So our program stops and shows you the
            command. You can approve it or decline it. If you
            approve, the folder is created. We append a role{" "}
            <code>tool</code> turn and call the API again.
          </p>
          <p>
            Now the model can write the game. It asks for{" "}
            <code>write_file</code>. It sends the path{" "}
            <code>snake_game/main.py</code> and the full file text. A
            real file would import <code>pygame</code>, draw the screen,
            move the snake, spawn food, and end the game if the snake
            hits itself or a wall. I am not going to paste the whole
            game here. You only need to see that <code>write_file</code>{" "}
            gets a path and the contents.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "name": "write_file",
  "arguments": {
    "path": "snake_game/main.py",
    "content": "import pygame\\n# screen, snake, food, collisions\\n"
  }
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            Our program writes those bytes to disk and comes back with a
            short confirmation, such as{" "}
            <code>Saved snake_game/main.py</code>. Then the model may
            want to look at what it just wrote. That is the same{" "}
            <code>read_file</code> idea as in the last section. It asks
            to open <code>snake_game/main.py</code>.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "name": "read_file",
  "arguments": { "path": "snake_game/main.py" }
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            Our program returns the file text. The model can fix a bug
            or tidy the code. We append that text and call the API
            again. After a while it also wants to know what is sitting
            in the project folder, so it asks for <code>list_files</code>.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "name": "list_files",
  "arguments": { "path": "snake_game" }
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            Our program lists that folder, the way you would with{" "}
            <code>os.listdir</code>. The result is ordinary text, maybe
            just <code>main.py</code>. Now the model knows the file is
            there. To play the game it still needs Pygame, and then it
            needs to start the script. Those are two more{" "}
            <code>run_command</code> calls. Each one waits until you
            approve it.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "name": "run_command",
  "arguments": { "command": "pip install pygame" }
}

{
  "name": "run_command",
  "arguments": { "command": "python snake_game/main.py" }
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            If you approve both, the game window can open and you can
            play. The last completion has no <code>tool_calls</code>.
            The assistant text is the reply. It might say the folder is
            ready and the snake game is running.
          </p>
          <p>
            So the LLM did not create the folder. It did not write
            the file. It did not install Pygame. It only named a
            function and its arguments. Our program ran the function,
            sent the result back, and the model kept going until the
            job was done.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "role": "assistant",
  "content": "I created snake_game/main.py, installed pygame, and started the game."
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            Coding agents such as Cursor, GitHub Copilot, and Claude
            Code often have tools like these.
          </p>
          <ul>
            <li>
              <code>glob</code> finds files by a name pattern. For
              example <code>**/*.py</code> means every Python file
              under this folder.
            </li>
            <li>
              <code>grep</code> finds lines that contain a text
              pattern, for example the string{" "}
              <code>function createUser</code>.
            </li>
          </ul>
          <p>
            Some agents also search the web, run tests, or call git.
          </p>
        </LessonProse>
      </Subsection>

      <Subsection number="4.2" title="Try the coding agent">
        <LessonTask>
          <p>
            Now try the same request yourself. Tick all four tools
            first. Then send the question and watch what the model
            asks for.
          </p>
          <ol>
            <li>
              Tick all four tools. Ask “Make a simple snake game in Python
              using Pygame.” Watch the conversation grow as the model
              asks for <code>run_command</code>, <code>write_file</code>,{" "}
              <code>read_file</code>, and <code>list_files</code>.
            </li>
            <li>
              When <code>run_command</code> appears, read the command
              before you Approve. You will likely see{" "}
              <code>mkdir</code>, <code>pip install pygame</code>, or{" "}
              <code>python snake_game/main.py</code>.
            </li>
            <li>
              Uncheck every tool so the schema is empty. Reset the
              conversation, send the same question, and compare the
              request and the reply.
            </li>
            <li>
              Inspect each Request on the right. The <code>tools</code>{" "}
              array should match the boxes you ticked.
            </li>
          </ol>
        </LessonTask>
        <Explorable
          title="Explorable"
          className="flex h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden p-3 md:p-4"
          action={
            <Button variant="outline" onClick={reset}>
              Reset conversation
            </Button>
          }
        >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="grid shrink-0 gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ag-system">System prompt</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncSystem(AGENT_SYSTEM)}
            >
              Reset
            </Button>
          </div>
          <Textarea
            id="ag-system"
            value={system}
            onChange={(e) => syncSystem(e.target.value)}
            className="min-h-20 max-h-28"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ag-tools">Tool schemas (JSON)</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSchemaText(defaultSchemaText());
                setSchemaError(null);
              }}
            >
              Reset
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {AGENT_TOOL_SCHEMAS.map((schema) => {
              const name = schema.function.name;
              const checked = selectedToolNames().includes(name);
              return (
                <label
                  key={name}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTool(name)}
                    className="size-4 accent-primary"
                  />
                  <code>{name}</code>
                </label>
              );
            })}
          </div>
          <JsonEditor
            id="ag-tools"
            compact
            value={schemaText}
            onChange={setSchemaText}
          />
          {schemaError && (
            <p className="text-sm text-destructive">{schemaError}</p>
          )}
        </div>
      </div>

      {pending && (
        <Alert className="shrink-0">
          <AlertTitle>Command approval required</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>The model wants to run:</p>
            <pre className={`max-h-16 max-w-full overflow-auto rounded-md bg-muted p-2 ${OUTPUT_TEXT}`}>
              {pending.command}
            </pre>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={loading}
                onClick={() => void resolvePending(true)}
              >
                Approve and run
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => void resolvePending(false)}
              >
                Decline
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-2">
        <section className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <div className="flex shrink-0 items-center gap-3">
            <Label className="shrink-0">Max loop: {maxRounds}</Label>
            <Slider
              min={1}
              max={12}
              step={1}
              value={[maxRounds]}
              onValueChange={(v) => {
                const next = Array.isArray(v) ? v[0] : v;
                setMaxRounds(next ?? 8);
              }}
            />
          </div>
          <form
            className="flex shrink-0 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask the coding agent…"
              disabled={loading || Boolean(pending)}
            />
            <Button type="submit" disabled={loading || Boolean(pending) || !draft.trim()}>
              {loading ? "Running…" : "Send"}
            </Button>
          </form>
          {error && (
            <Alert variant="destructive" className="shrink-0">
              <AlertDescription className="whitespace-pre-wrap">
                {error}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Conversation</h2>
            <Button variant="outline" size="sm" onClick={reset}>
              Clear
            </Button>
          </div>
          <div ref={conversationRef} className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full min-w-0 rounded-none border border-border bg-background p-3">
              <div className="min-w-0 space-y-3 overflow-hidden">
                {messages.filter((m) => m.role !== "system").length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ask the coding agent to make a simple snake game in
                    Python using Pygame.
                  </p>
                )}
                <ConversationThread messages={messages} />
              </div>
            </ScrollArea>
          </div>
        </section>
        <section className="flex min-h-0 flex-col overflow-hidden">
          <h2 className="mb-2 shrink-0 text-sm font-semibold">Requests</h2>
          <div className="min-h-0 flex-1 overflow-auto">
            <RoundsPanel
              rounds={rounds}
              itemLabel="Request"
              emptyHint="Ask the agent something to see each model request and response."
            />
          </div>
        </section>
      </div>
      </div>
        </Explorable>
      </Subsection>

      <Subsection number="4.3" title="Summary">
        <LessonProse>
          <p>
            In this section we put an LLM, a harness, and several
            tools in one program. We walked through a request to
            make a snake game, and we saw that the model only names
            a function while our program runs it.{" "}
            <code>run_command</code> waits for you before it
            executes. We also saw that products such as Cursor often
            add search tools such as <code>glob</code> and{" "}
            <code>grep</code>.
          </p>
        </LessonProse>
      </Subsection>
    </TutorialSection>
  );
}
