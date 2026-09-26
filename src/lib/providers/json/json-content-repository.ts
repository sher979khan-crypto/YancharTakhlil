import excludedCoinsJson from "@/data/excluded-coins.json";
import { ExcludedCoinsSchema } from "@/lib/domain/coin-filter";

import type { ContentRepository } from "../content-repository";

// Static import + parse at module load: works in Netlify functions (no fs paths) and a broken file
// fails the tests and the build instead of the first request.
const excludedCoins = ExcludedCoinsSchema.parse(excludedCoinsJson);

export function createJsonContentRepository(): ContentRepository {
  return {
    // A copy, so a caller cannot change the list for everyone else.
    getExcludedCoins: () => structuredClone(excludedCoins),
  };
}
