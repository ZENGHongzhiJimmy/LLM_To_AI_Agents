"use client";

import { AgentPanel } from "@/components/agent-panel";
import { useConnection } from "@/lib/connection-context";

export default function CodingAgentPage() {
  return <AgentPanel connection={useConnection()} />;
}
