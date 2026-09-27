import { cacheTtl } from "@/config/cache";
import { parseCoinId } from "@/lib/api/params";
import { fail, ok } from "@/lib/api/responses";
import { getMarketDataProvider } from "@/lib/providers/get-market-data-provider";

// The inline type from route.md, not the generated RouteContext helper: that global only exists
// after next dev/build/typegen, and `pnpm typecheck` runs before any of them on a clean clone.
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  try {
    const id = parseCoinId((await params).id);
    return ok(await getMarketDataProvider().getCoinDetail(id), cacheTtl.coinDetail);
  } catch (error) {
    return fail(error);
  }
}
