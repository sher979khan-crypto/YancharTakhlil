/**
 * Runs `load` and returns its value, or null if it throws or rejects. Lets one page section
 * degrade on its own instead of failing the whole page. The failure is logged by name and message
 * only (MarketDataError messages are secret-free by contract), never with a stack or cause.
 */
export async function loadOrNull<T>(label: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : typeof error;
    console.error(`[${label}] ${detail}`);
    return null;
  }
}
