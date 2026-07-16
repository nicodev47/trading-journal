export const TAG_COLOR_PALETTE = [
  '#00d68f',
  '#14b8a6',
  '#38bdf8',
  '#818cf8',
  '#a78bfa',
  '#f472b6',
  '#fb7185',
  '#f59e0b',
] as const;

export const DEFAULT_TAG_COLOR = TAG_COLOR_PALETTE[6];

export function getTagColor(
  tag: string,
  tagColors: Record<string, string>
): string {
  return tagColors[tag] ?? DEFAULT_TAG_COLOR;
}
