"use client";

import { Step2Panel } from "@/components/step2-panel";
import { useConnection } from "@/lib/connection-context";

export default function ConversationHistoryPage() {
  return <Step2Panel connection={useConnection()} />;
}
