import "server-only";

import type { AiModelConfig } from "@/config/ai";

/**
 * The model chain to try, in order: the configured one, or the env override (ids only). An
 * override id that is also configured keeps its jsonMode; an unknown one gets "none"
 * (prompt-only JSON), which works with every model. Duplicates are dropped.
 */
export function resolveModelChain(
  configured: readonly AiModelConfig[],
  override: readonly string[] | undefined,
): AiModelConfig[] {
  const ids = override && override.length > 0 ? override : configured.map((model) => model.id);
  const unique = [...new Set(ids)];
  return unique.map(
    (id) => configured.find((model) => model.id === id) ?? { id, jsonMode: "none" as const },
  );
}
