/** Rounds to 3 decimals to keep path strings short. */
export const fmt = (n: number): string => String(Math.round(n * 1000) / 1000);

export type Radii = [tl: number, tr: number, br: number, bl: number];

/** Clockwise rectangle with an individual radius per corner. */
export function rectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  radii: Radii = [0, 0, 0, 0],
): string {
  const max = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = radii.map((r) => Math.max(0, Math.min(r, max))) as Radii;
  const arc = (r: number, ex: number, ey: number) =>
    r > 0 ? `A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(ex)} ${fmt(ey)}` : '';
  return (
    `M${fmt(x + tl)} ${fmt(y)}` +
    `H${fmt(x + w - tr)}${arc(tr, x + w, y + tr)}` +
    `V${fmt(y + h - br)}${arc(br, x + w - br, y + h)}` +
    `H${fmt(x + bl)}${arc(bl, x, y + h - bl)}` +
    `V${fmt(y + tl)}${arc(tl, x + tl, y)}Z`
  );
}

/** Circle as two arcs. */
export function circlePath(cx: number, cy: number, r: number): string {
  return (
    `M${fmt(cx - r)} ${fmt(cy)}` +
    `A${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(cx + r)} ${fmt(cy)}` +
    `A${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(cx - r)} ${fmt(cy)}Z`
  );
}

export function polygonPath(points: Array<[number, number]>): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`).join('') + 'Z';
}
