import { notFound } from "next/navigation";

// The root layout lives in [locale], so there is no app/not-found.tsx to catch unknown URLs.
// Matching them here and calling notFound() renders [locale]/not-found.tsx inside the
// localized layout (next-intl "error files" pattern, no experimental globalNotFound needed).
// Nothing above it may add a route-level loading.tsx: that Suspense boundary would make the
// response stream and turn the 404 status into 200 (CLAUDE.md §6).
export default function CatchAllPage() {
  notFound();
}
