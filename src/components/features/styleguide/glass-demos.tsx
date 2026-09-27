"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";

const ranges = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
] as const;

type Range = (typeof ranges)[number]["value"];

export function SegmentedControlDemo() {
  const [range, setRange] = useState<Range>("7d");
  return (
    <div className="flex flex-wrap items-center gap-4">
      <SegmentedControl
        options={ranges}
        value={range}
        onChange={setRange}
        aria-label="Chart range"
      />
      <p className="font-mono text-xs text-fg-subtle">value = {range}</p>
    </div>
  );
}

export function SearchInputDemo() {
  const t = useTranslations("SearchInput");
  const [query, setQuery] = useState("bitcoin");
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SearchInput
        label="Visible label, with clear"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery("")}
        clearLabel={t("clear")}
        placeholder="Search coins"
      />
      <SearchInput
        aria-label="aria-label only"
        placeholder="aria-label only"
        containerClassName="self-end"
      />
      <SearchInput label="Disabled" placeholder="Search coins" disabled />
    </div>
  );
}
