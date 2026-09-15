"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ConnectionProvider } from "@/lib/connection-context";
import { NAV } from "@/lib/nav";
import type { LlmConnection } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LabShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [defaultModel, setDefaultModel] = useState("");
  const [defaultApiUrl, setDefaultApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [apiUrl, setApiUrl] = useState("");

  useEffect(() => {
    void fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        setHasApiKey(Boolean(data.hasApiKey));
        const nextModel = String(data.model ?? "");
        const nextUrl = String(data.apiUrl ?? "");
        setDefaultModel(nextModel);
        setDefaultApiUrl(nextUrl);
        setModel(nextModel);
        setApiUrl(nextUrl);
      })
      .catch(() => setHasApiKey(false))
      .finally(() => setReady(true));
  }, []);

  const connection: LlmConnection = { apiKey, model, apiUrl };

  return (
    <ConnectionProvider value={connection}>
      <div className="flex min-h-screen bg-background">
        <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
          <div>
            <h2 className="font-heading text-lg leading-snug font-medium text-sidebar-foreground">
              From LLM API to Coding Agent
            </h2>
          </div>
          <nav className="mt-6 space-y-1">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "block w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Separator className="my-4 bg-sidebar-border" />
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label htmlFor="api-url" className="text-sidebar-foreground/55">
                API endpoint
              </Label>
              <Input
                id="api-url"
                type="url"
                autoComplete="off"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={defaultApiUrl || "https://…/v1"}
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="model-name" className="text-sidebar-foreground/55">
                Model
              </Label>
              <Input
                id="model-name"
                autoComplete="off"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={defaultModel || "model-id"}
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="api-key" className="text-sidebar-foreground/55">
                  API key
                </Label>
                {!ready ? (
                  <Badge variant="secondary">Checking…</Badge>
                ) : hasApiKey || apiKey ? (
                  <Badge variant="secondary">Loaded</Badge>
                ) : (
                  <Badge variant="destructive">Missing</Badge>
                )}
              </div>
              <Input
                id="api-key"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasApiKey ? "Using .env" : "Paste API key"}
                suppressHydrationWarning
              />
            </div>
            <p className="text-xs leading-relaxed text-sidebar-foreground/45">
              Leave a field blank to use the value from <code>.env</code>. A
              filled field overrides it.
            </p>
          </div>
        </aside>
        <main className="min-w-0 flex-1 bg-background p-6 md:p-8">
          {children}
        </main>
      </div>
    </ConnectionProvider>
  );
}
