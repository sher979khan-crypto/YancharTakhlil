import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { imageRemotePatterns } from "./src/config/images";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // CLAUDE.md is owner-maintained; stop `next dev` from appending its managed agent-rules block.
  agentRules: false,
  images: {
    // Coin logos only (src/config/images.ts); every other remote host gets 400 from the optimizer.
    remotePatterns: [...imageRemotePatterns],
  },
};

export default withNextIntl(nextConfig);
