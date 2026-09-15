"use client";

import type { ReactNode } from "react";
import { highlightJson, looksLikeJson } from "@/lib/highlight-json";
import { highlightPython, looksLikePython } from "@/lib/highlight-python";
import { OUTPUT_TEXT } from "@/lib/output-text";

export function TutorialSection({
  example,
  title,
  lead,
  children,
}: {
  example?: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-6xl space-y-10">
      <header className="max-w-3xl">
        {example ? (
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            {example}
          </p>
        ) : null}
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">{title}</h1>
        {lead ? (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {lead}
          </p>
        ) : null}
      </header>
      {children}
    </article>
  );
}

export function Subsection({
  id,
  number,
  title,
  children,
}: {
  id?: string;
  number?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-4 border-t pt-8">
      <h2 className="font-heading text-xl font-medium tracking-tight">
        {number ? (
          <span className="mr-2 text-muted-foreground">{number}</span>
        ) : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function LessonProse({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-foreground/90 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-sans [&_code]:text-sm [&_li]:text-sm [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p]:text-sm [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      {children}
    </div>
  );
}

export function LessonList({
  title,
  items,
  ordered,
}: {
  title?: string;
  items: string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className="max-w-3xl">
      {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
      <List
        className={`${title ? "mt-2" : ""} ${
          ordered ? "list-decimal" : "list-disc"
        } space-y-1.5 pl-5 text-sm leading-relaxed`}
      >
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </List>
    </div>
  );
}

export function LessonTask({
  title = "Task",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl rounded-none border border-border bg-muted px-4 py-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground [&_code]:font-sans [&_code]:text-sm [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p]:text-sm">
        {children}
      </div>
    </div>
  );
}

export function Explorable({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title ?? "Explorable"}</h3>
        {action}
      </div>
      <div
        className={`rounded-none border border-border bg-accent p-4 md:p-6 ${className ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}

export function SampleBlock({
  caption,
  children,
}: {
  caption?: string;
  children: string;
}) {
  const highlighted = looksLikeJson(children)
    ? highlightJson(children)
    : looksLikePython(children)
      ? highlightPython(children)
      : null;

  return (
    <figure className="max-w-3xl">
      {caption ? (
        <figcaption className="mb-1.5 text-sm font-medium text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
      {highlighted ? (
        <pre
          className={`overflow-x-auto rounded-none border border-border bg-muted p-3 text-foreground ${OUTPUT_TEXT}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <pre
          className={`overflow-x-auto rounded-none border border-border bg-muted p-3 ${OUTPUT_TEXT}`}
        >
          {children}
        </pre>
      )}
    </figure>
  );
}

export function RoleTable() {
  return (
    <div className="max-w-3xl overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4 font-semibold">Role</th>
            <th className="py-2 font-semibold">Meaning in this lab</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2 pr-4 font-sans text-sm">system</td>
            <td className="py-2">
              These are standing instructions (persona, rules). They are
              usually first.
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4 font-sans text-sm">user</td>
            <td className="py-2">This is what the human asked.</td>
          </tr>
          <tr>
            <td className="py-2 pr-4 font-sans text-sm">assistant</td>
            <td className="py-2">This is the model’s reply (the completion).</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
