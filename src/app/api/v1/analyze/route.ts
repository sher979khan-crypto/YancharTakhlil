import { cacheTtl } from "@/config/cache";
import { analyzeCoin } from "@/lib/ai/agents/analyst/analyze-coin";
import { clientIpFromHeaders } from "@/lib/ai/core/guards";
import { parseCoinId, parseLocale } from "@/lib/api/params";
import { fail, ok } from "@/lib/api/responses";

/**
 * GET /api/v1/analyze?id=<coin id>&locale=<en|ar|uz>. A GET with query parameters so the CDN can
 * cache each coin + locale for cacheTtl.aiAnalysis. Both "ai" and "basic" results are 200.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseCoinId(searchParams.get("id") ?? "");
    const locale = parseLocale(searchParams);
    const result = await analyzeCoin(id, locale, { ip: clientIpFromHeaders(request.headers) });
    return ok(
      { data: result, ...result.data },
      cacheTtl.aiAnalysis,
      cacheTtl.aiAnalysisStaleWhileRevalidate,
    );
  } catch (error) {
    return fail(error);
  }
}
