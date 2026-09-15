"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChatBubble } from "@/components/chat-bubble";
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

export function Step1Panel({ connection }: { connection: LlmConnection }) {
  const [system, setSystem] = useState(SYSTEM_ALICE);
  const [user, setUser] = useState(
    "Explain what an LLM completion is in one sentence."
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<ChatMessage[] | null>(null);
  const [response, setResponse] = useState<ChatMessage | null>(null);
  const [usage, setUsage] = useState<Usage | undefined>();

  async function run() {
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    setLoading(true);
    setError(null);
    try {
      const data = await postJson<{
        message: ChatMessage;
        usage: Usage;
        sent?: ChatMessage[];
      }>(
        "/api/chat",
        { messages, ...connectionPayload(connection) }
      );
      setSent(data.sent ?? messages);
      setResponse(data.message);
      setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <TutorialSection
      title="LLM API"
      lead="Let’s start with a chatbot that replies in ordinary English. We send the user’s question to a hosted language model and get text back. I will show you what the LLM API is, what we put in the request, and what a completion is."
    >
      <Subsection number="1.1" title="The LLM API">
        <LessonProse>
          <p>
            Let’s say you want a chatbot that answers in ordinary
            English. You do not write every reply yourself. You use a{" "}
            <strong>large language model (LLM)</strong>. It reads the
            text you send and writes text back.
          </p>
          <p>
            A strong model is too large to run on your laptop. So you
            send the user’s question to a hosted model, and the host
            sends a reply. That call is the <strong>LLM API</strong>.
          </p>
          <p>
            An <strong>API</strong> is a contract. You send a request
            in a set format. You get a response. You do not need to
            know how the server is built.
          </p>
          <p>
            On the web that contract is <strong>HTTP</strong>. A
            request has a <strong>URL</strong>, a{" "}
            <strong>method</strong> (this lab uses POST),{" "}
            <strong>headers</strong> (including an API key), and a{" "}
            <strong>body</strong>. The server returns a status code
            and a <strong>response body</strong>. In this lab both
            bodies are JSON.
          </p>
          <p>
            This lab calls <strong>OpenRouter</strong>. OpenRouter is
            a gateway. You talk to one OpenAI-compatible endpoint and
            pay from one prepaid credit balance. Behind that, it can
            reach hundreds of models from many providers. You send
            one request. OpenRouter forwards it to the model and
            returns the reply.
          </p>
          <p>
            Put the key in a <code>.env</code> file, not in your
            source code. This page reads that file from the lab
            folder, one level above <code>web/</code>. You can also
            type the endpoint, model, and key in the sidebar.
          </p>
        </LessonProse>
      </Subsection>

      <Subsection number="1.2" title="How the LLM API works">
        <LessonProse>
          <p>
            When you talk to a chat API, you usually send two kinds
            of text. The <strong>system message</strong> is written
            by you, the developer. It tells the model who it is and
            how it should behave. The <strong>user message</strong>{" "}
            is the question from the person using the chatbot.
          </p>
          <p>
            Let’s say the system message is “You are Alice, a helpful
            assistant. First say who you are, then answer.” And the
            user asks, “What is a completion?”
          </p>
          <p>
            The API wants that as JSON. You name the model, then you
            put those two texts in a list called{" "}
            <code>messages</code>. Each item says who is speaking and
            what they said. This is the request body, simplified:
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "model": "deepseek/deepseek-v4-flash-0731",
  "messages": [
    {
      "role": "system",
      "content": "You are Alice, a helpful assistant."
    },
    {
      "role": "user",
      "content": "What is a completion?"
    }
  ]
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            You could send that JSON with raw HTTP. In this lab we use
            the <strong>OpenAI Python SDK</strong> instead. The SDK
            builds the same POST to <code>/chat/completions</code>.
            Many hosts accept this client. You set the key and the
            base URL, then you call{" "}
            <code>chat.completions.create</code>.
          </p>
        </LessonProse>
        <SampleBlock>
{`from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ["OPENROUTER_API_KEY"],
    base_url="https://openrouter.ai/api/v1",
)

completion = client.chat.completions.create(
    model="deepseek/deepseek-v4-flash-0731",
    messages=[
        {
            "role": "system",
            "content": "You are Alice, a helpful assistant.",
        },
        {
            "role": "user",
            "content": "What is a completion?",
        },
    ],
)

print(completion.choices[0].message.content)`}
        </SampleBlock>
        <LessonProse>
          <p>
            Look at the arguments we pass. <code>api_key</code> is
            your secret. Load it from <code>.env</code>, not from
            source. <code>base_url</code> is which server to call.
            The SDK appends <code>/chat/completions</code>. The
            sidebar endpoint is this value. <code>model</code> is
            which model writes the reply. <code>messages</code> is
            the list you already saw. Each item has{" "}
            <code>role</code> and <code>content</code>.
          </p>
          <p>
            The response is also JSON. Inside it is an{" "}
            <strong>assistant message</strong>. That is the model’s
            reply. For this one request, we call that reply a{" "}
            <strong>completion</strong>. In the SDK you read it as{" "}
            <code>completion.choices[0].message</code>.
          </p>
        </LessonProse>
        <SampleBlock>
{`{
  "role": "assistant",
  "content": "A completion is the model’s text for one request."
}`}
        </SampleBlock>
        <LessonProse>
          <p>
            In the full response this object sits at{" "}
            <code>choices[0].message</code>. When you run the box
            below, look at the JSON on the right and match it to
            these sketches.
          </p>
        </LessonProse>
      </Subsection>

      <Subsection number="1.3" title="Try a completion">
        <LessonTask title="Task 1">
          <ol>
            <li>Run the default question. You should get one assistant reply.</li>
            <li>Change the user question and run again.</li>
            <li>Change the system prompt and see how the reply changes.</li>
            <li>Open the JSON on the right. Find the messages you sent and the completion you got back.</li>
          </ol>
        </LessonTask>
        <LessonTask title="Task 2">
          <p>
            The hosted model cannot open your folder. Your program
            can. Before it sends the request, it looks at the system
            prompt. If it finds <code>{"{document_context}"}</code>,
            it reads <code>notes.md</code> from the lab folder and
            puts that file text in place of the placeholder.
          </p>
          <ol>
            <li>Change the system prompt to this:</li>
          </ol>
          <SampleBlock caption="prompt template" language="markdown">
{`You are Alice, a helpful assistant. Answer only based on the document.

# Document
{document_context}`}
          </SampleBlock>
          <ol start={2}>
            <li>
              Ask a question that only makes sense if the model has seen
              the file, for example “What is in the document?”
            </li>
            <li>
              Open the JSON on the right. The system message should
              contain the notes, not the placeholder.
            </li>
          </ol>
        </LessonTask>
        <Explorable title="Explorable">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s1-system">System prompt</Label>
            <Textarea
              id="s1-system"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className="min-h-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s1-user">User message</Label>
            <Textarea
              id="s1-user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="min-h-20"
            />
          </div>
          <Button onClick={run} disabled={loading}>
            {loading ? "Calling…" : "Run"}
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-wrap">
                {error}
              </AlertDescription>
            </Alert>
          )}
          {response && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Reply</h2>
              <ChatBubble
                message={{
                  role: "assistant",
                  content: response.content ?? "(empty content)",
                }}
              />
            </div>
          )}
        </section>
        <section>
          <SingleExchangePanel
            sent={sent ?? undefined}
            response={response ?? undefined}
            usage={usage}
          />
        </section>
      </div>
        </Explorable>
      </Subsection>

      <Subsection number="1.4" title="Summary">
        <LessonProse>
          <p>
            In this section we called the LLM API. We sent a system
            message and a user message, and we got one completion
            back. That completion is the assistant’s text. We also
            saw how a program can put a local file into the request
            before it is sent.
          </p>
        </LessonProse>
      </Subsection>
    </TutorialSection>
  );
}
