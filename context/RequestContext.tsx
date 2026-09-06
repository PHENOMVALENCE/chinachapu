"use client";

import {
  clearRequestDraft,
  readRequestDraft,
  writeRequestDraft,
} from "@/lib/client/request-draft";
import type { RequestLine } from "@/types/request";
import { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";

type RequestContextValue = {
  lines: RequestLine[];
  addLine: (line: Omit<RequestLine, "clientId">) => void;
  updateLine: (clientId: string, patch: Partial<RequestLine>) => void;
  removeLine: (clientId: string) => void;
  clearLines: () => void;
  unitCount: number;
};

const RequestContext = createContext<RequestContextValue | undefined>(undefined);

const empty: RequestLine[] = [];
let cachedDraft: RequestLine[] | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getDraftSnapshot() {
  cachedDraft ??= readRequestDraft();
  return cachedDraft;
}

function replaceDraft(next: RequestLine[]) {
  cachedDraft = next;
  writeRequestDraft(next);
  listeners.forEach((listener) => listener());
}

export function RequestProvider({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribe, getDraftSnapshot, () => empty);
  const [local, setLocal] = useState<RequestLine[] | null>(null);
  const lines = local ?? stored;

  const value = useMemo<RequestContextValue>(() => {
    const commit = (next: RequestLine[]) => {
      setLocal(next);
      replaceDraft(next);
    };
    return {
      lines,
      addLine(line) {
        if (lines.length >= 20) return;
        commit([...lines, { ...line, clientId: crypto.randomUUID() }]);
      },
      updateLine(clientId, patch) {
        commit(
          lines.map((line) => {
            if (line.clientId !== clientId) return line;
            const quantity =
              patch.quantity === undefined
                ? line.quantity
                : Math.min(999, Math.max(1, Math.trunc(patch.quantity)));
            return { ...line, ...patch, quantity };
          })
        );
      },
      removeLine(clientId) {
        commit(lines.filter((line) => line.clientId !== clientId));
      },
      clearLines() {
        setLocal([]);
        cachedDraft = [];
        clearRequestDraft();
        listeners.forEach((listener) => listener());
      },
      unitCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    };
  }, [lines]);

  return <RequestContext.Provider value={value}>{children}</RequestContext.Provider>;
}

export function useRequest() {
  const context = useContext(RequestContext);
  if (!context) {
    throw new Error("useRequest must be used within a RequestProvider");
  }
  return context;
}
