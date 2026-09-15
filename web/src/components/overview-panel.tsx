"use client";

import { LessonProse } from "@/components/tutorial-section";

export function OverviewPanel() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          From LLM API to Coding Agent
        </h1>
      </header>

      <LessonProse>
        <p>
          In this tutorial we start with the LLM API. You send a
          question to a hosted model and get text back. Then we look
          at conversation history, so a follow-up still makes sense.
          Then we look at tool use. The model can ask your program to
          run a function, and you send the result back. Finally we
          put those ideas in one program: a coding agent that can
          list, read, and write files.
        </p>
        <p>
          Open each section from the sidebar. We add one idea, then
          you try it.
        </p>
      </LessonProse>
    </article>
  );
}
