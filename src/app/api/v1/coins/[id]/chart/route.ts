import { cacheTtl } from "@/config/cache";
import { parseChartRange, parseCoinId } from "@/lib/api/params";
import { fail, ok } from "@/lib/api/responses";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";

// See ../route.ts for why params is typed inline.
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context): Promise<Response> {
  try {
    const id = parseCoinId((await params).id);
    const range = parseChartRange(new URL(request.url).searchParams);
    return ok(await getMarketDataProvider().getDailyPrices(id, range), cacheTtl.dailyPrices);
  } catch (error) {
    return fail(error);
  }
}
