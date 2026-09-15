"use client";

import { createContext, useContext } from "react";
import type { LlmConnection } from "@/lib/types";

const ConnectionContext = createContext<LlmConnection>({
  apiKey: "",
  model: "",
  apiUrl: "",
});

export function ConnectionProvider({
  value,
  children,
}: {
  value: LlmConnection;
  children: React.ReactNode;
}) {
  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext);
}
