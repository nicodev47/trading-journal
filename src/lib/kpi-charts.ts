/** Normalises values into fractions of their sum; all zeros give all zeros. */
export function toShares(values: number[]): number[] {
  const safe = values.map(value => (Number.isFinite(value) && value > 0 ? value : 0));
  const total = safe.reduce((sum, value) => sum + value, 0);

  return total === 0 ? safe.map(() => 0) : safe.map(value => value / total);
}

/** Dash lengths and offsets to draw consecutive arcs on a path of given length. */
export function toArcSegments(values: number[], length: number) {
  let offset = 0;

  return toShares(values).map(share => {
    const dash = share * length;
    const segment = { dash, gap: length - dash, offset: -offset };

    offset += dash;

    return segment;
  });
}
