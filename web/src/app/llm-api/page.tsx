"use client";

import { Step1Panel } from "@/components/step1-panel";
import { useConnection } from "@/lib/connection-context";

export default function LlmApiPage() {
  return <Step1Panel connection={useConnection()} />;
}
