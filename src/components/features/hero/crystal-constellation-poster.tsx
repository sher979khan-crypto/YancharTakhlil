import { cn } from "@/lib/utils/cn";

// Static poster for the home hero; Step 21's live 3D scene will fall back to it. Colors come from
// tokens through currentColor, so no raw values live here. Gradient ids are fixed: the poster
// appears at most once per page.

type Tone = "ice" | "brand";
type Node = Readonly<{ x: number; y: number; r: number; tone?: Tone }>;

const nodes: readonly Node[] = [
  { x: 92, y: 96, r: 30 },
  { x: 246, y: 54, r: 20 },
  { x: 392, y: 118, r: 36 },
  { x: 196, y: 214, r: 50 },
  { x: 344, y: 270, r: 30, tone: "brand" },
  { x: 76, y: 300, r: 22 },
  { x: 236, y: 360, r: 18 },
  { x: 424, y: 350, r: 16 },
];

const edges: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 3],
  [2, 3],
  [2, 4],
  [3, 4],
  [3, 5],
  [3, 6],
  [4, 6],
  [4, 7],
  [5, 6],
];

const fmt = (n: number) => Math.round(n * 10) / 10;
const points = (list: readonly (readonly [number, number])[]) =>
  list.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" ");

/** A hexagonal gem (bipyramid seen from the side) with a lit facet and facet lines. */
function Crystal({ x, y, r, tone = "ice" }: Node) {
  const top = [x, y - r] as const;
  const bottom = [x, y + r] as const;
  const ul = [x - 0.62 * r, y - 0.3 * r] as const;
  const ur = [x + 0.62 * r, y - 0.3 * r] as const;
  const ll = [x - 0.62 * r, y + 0.32 * r] as const;
  const lr = [x + 0.62 * r, y + 0.32 * r] as const;
  const core = [x - 0.08 * r, y + 0.02 * r] as const;

  return (
    <g className={tone === "brand" ? "text-brand" : "text-ice"}>
      <circle cx={x} cy={y} r={r * 1.9} fill={`url(#ccp-halo-${tone})`} />
      <polygon
        points={points([top, ur, lr, bottom, ll, ul])}
        fill={`url(#ccp-body-${tone})`}
        stroke="currentColor"
        strokeOpacity={0.9}
        strokeWidth={1.25}
        strokeLinejoin="round"
      />
      {/* The lit facet faces the ice glow (top-start). */}
      <polygon
        points={points([top, ul, core])}
        className="text-fg"
        fill="currentColor"
        fillOpacity={0.28}
      />
      <path
        d={`M${points([top])} L${points([core])} L${points([bottom])} M${points([ul])} L${points([core])} L${points([lr])} M${points([ll])} L${points([core])}`}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={0.75}
      />
    </g>
  );
}

function Gradients({ tone }: { tone: Tone }) {
  return (
    <g className={tone === "brand" ? "text-brand" : "text-ice"}>
      <linearGradient id={`ccp-body-${tone}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="currentColor" stopOpacity={0.55} />
        <stop offset="0.55" stopColor="currentColor" stopOpacity={0.14} />
        <stop offset="1" stopColor="currentColor" stopOpacity={0.3} />
      </linearGradient>
      <radialGradient id={`ccp-halo-${tone}`}>
        <stop offset="0" stopColor="currentColor" stopOpacity={0.22} />
        <stop offset="1" stopColor="currentColor" stopOpacity={0} />
      </radialGradient>
    </g>
  );
}

export function CrystalConstellationPoster({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 480 420"
      aria-hidden
      focusable="false"
      // Mirrored in RTL so the brightest crystals face the reading start like the page glow.
      className={cn("h-auto w-full rtl:-scale-x-100", className)}
    >
      <defs>
        <Gradients tone="ice" />
        <Gradients tone="brand" />
      </defs>
      <g className="motion-safe:animate-float">
        <g className="text-ice" stroke="currentColor" strokeOpacity={0.4} strokeWidth={1}>
          {edges.map(([a, b]) => {
            const from = nodes[a];
            const to = nodes[b];
            return from && to ? (
              <line key={`${a}-${b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
            ) : null;
          })}
        </g>
        {nodes.map((node) => (
          <Crystal key={`${node.x}-${node.y}`} {...node} />
        ))}
      </g>
    </svg>
  );
}
