import { cacheTtl } from "@/config/cache";
import { fail, ok } from "@/lib/api/responses";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";

export async function GET(): Promise<Response> {
  try {
    return ok(await getMarketDataProvider().getGlobalMarket(), cacheTtl.globalMarket);
  } catch (error) {
    return fail(error);
  }
}
