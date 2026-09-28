"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AnalysisResult } from "@/lib/api/contract";
import {
  AnalysisRequestError,
  DEFAULT_RETRY_AFTER_SECONDS,
  fetchAnalysis,
} from "@/lib/api/fetch-analysis";
import type { Locale } from "@/lib/i18n/config";

/** No entry means idle: nothing was asked for this coin yet. */
export type AnalysisState =
  | { status: "loading"; startedAt: number }
  | { status: "result"; result: AnalysisResult }
  /** 429 AI_BUSY: a retry can succeed retryAfterSeconds after receivedAt. */
  | { status: "busy"; receivedAt: number; retryAfterSeconds: number }
  | { status: "unavailable" };

export type Analyses = {
  get: (id: string) => AnalysisState | undefined;
  /**
   * Starts an analysis of `id`, unless one is running or already done: a result is kept for the
   * life of the component, so reopening a panel never asks again. After a failure it retries.
   */
  analyze: (id: string) => void;
};

type Fetcher = typeof fetchAnalysis;

/**
 * Analyses per coin for one page (the markets list or a coin page), in React state only. Requests
 * still running are aborted on unmount.
 */
export function useAnalyses(locale: Locale, fetcher: Fetcher = fetchAnalysis): Analyses {
  const [states, setStates] = useState<ReadonlyMap<string, AnalysisState>>(() => new Map());
  // Coins with a request in flight or a result: written and read only in event handlers.
  const claimed = useRef(new Set<string>());
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const running = controllers.current;
    return () => {
      for (const controller of running.values()) controller.abort();
      running.clear();
    };
  }, []);

  const set = useCallback((id: string, state: AnalysisState) => {
    setStates((previous) => new Map(previous).set(id, state));
  }, []);

  const analyze = useCallback(
    (id: string) => {
      if (claimed.current.has(id)) return;
      claimed.current.add(id);
      const controller = new AbortController();
      controllers.current.set(id, controller);
      set(id, { status: "loading", startedAt: Date.now() });

      fetcher(id, locale, controller.signal).then(
        (result) => {
          controllers.current.delete(id);
          set(id, { status: "result", result });
        },
        (error: unknown) => {
          controllers.current.delete(id);
          if (controller.signal.aborted) return;
          claimed.current.delete(id);
          if (error instanceof AnalysisRequestError && error.kind === "busy") {
            set(id, {
              status: "busy",
              receivedAt: Date.now(),
              retryAfterSeconds: error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS,
            });
          } else {
            set(id, { status: "unavailable" });
          }
        },
      );
    },
    [fetcher, locale, set],
  );

  const get = useCallback((id: string) => states.get(id), [states]);

  return { get, analyze };
}
