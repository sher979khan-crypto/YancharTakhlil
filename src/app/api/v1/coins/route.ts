import { cacheTtl } from "@/config/cache";
import { fail, ok } from "@/lib/api/responses";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";

/** The public top list. Only GET is exported, so Next.js answers other methods with 405. */
export async function GET(): Promise<Response> {
  try {
    return ok(await getMarketDataProvider().getTopCoins(), cacheTtl.markets);
  } catch (error) {
    return fail(error);
  }
}
