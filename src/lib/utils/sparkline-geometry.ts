export type SparklineGeometry = {
  /** "x,y x,y ..." for an SVG polyline. */
  line: string;
  /** The line closed along the bottom edge, for the area fill polygon. */
  area: string;
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Maps prices (oldest first) into a width x height box, left to right, highest price at the top.
 * `inset` keeps the stroke inside the box. A flat series is drawn through the middle. Returns
 * null when there are fewer than two finite points.
 */
export function getSparklineGeometry(
  values: readonly number[],
  width: number,
  height: number,
  inset = 1,
): SparklineGeometry | null {
  const finite = values.filter(Number.isFinite);
  if (finite.length < 2) return null;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  const innerHeight = height - 2 * inset;
  const stepX = width / (finite.length - 1);

  const coords = finite.map((value, i) => {
    const y = span === 0 ? height / 2 : inset + ((max - value) / span) * innerHeight;
    return `${round(i * stepX)},${round(y)}`;
  });
  const line = coords.join(" ");
  return { line, area: `0,${height} ${line} ${width},${height}` };
}
