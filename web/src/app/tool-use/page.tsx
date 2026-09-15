"use client";

import { Step3Panel } from "@/components/step3-panel";
import { useConnection } from "@/lib/connection-context";

export default function ToolUsePage() {
  return <Step3Panel connection={useConnection()} />;
}
