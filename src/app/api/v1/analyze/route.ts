import { cacheTtl } from "@/config/cache";
import { analyzeCoin } from "@/lib/ai/agents/analyst/analyze-coin";
import { clientIpFromHeaders } from "@/lib/ai/core/guards";
import { parseCoinId, parseLocale } from "@/lib/api/params";
import { fail, ok } from "@/lib/api/responses";

/**
 * GET /api/v1/analyze?id=<coin id>&locale=<en|ar|uz>. A GET with query parameters so the CDN can
 * cache each coin + locale: cacheTtl.aiAnalysis for an "ai" result, cacheTtl.aiBasic for a
 * "basic" one (so the model chain is tried again soon). Both kinds are 200.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseCoinId(searchParams.get("id") ?? "");
    const locale = parseLocale(searchParams);
    const result = await analyzeCoin(id, locale, { ip: clientIpFromHeaders(request.headers) });
    const [ttl, staleWhileRevalidate] =
      result.kind === "ai"
        ? [cacheTtl.aiAnalysis, cacheTtl.aiAnalysisStaleWhileRevalidate]
        : [cacheTtl.aiBasic, cacheTtl.aiBasic];
    return ok({ data: result, ...result.data }, ttl, staleWhileRevalidate);
  } catch (error) {
    return fail(error);
  }
}
