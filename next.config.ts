import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // CLAUDE.md is owner-maintained; stop `next dev` from appending its managed agent-rules block.
  agentRules: false,
};

export default withNextIntl(nextConfig);
