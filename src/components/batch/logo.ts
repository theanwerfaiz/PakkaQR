import type { QrDesign } from '../../lib/render/design';

/** Decodes the design's logo for main-thread batch generation (fallback path). */
export async function loadBatchLogo(design: QrDesign): Promise<HTMLImageElement | undefined> {
  if (!design.logo) return undefined;
  const img = new Image();
  img.src = design.logo.dataUrl;
  await img.decode();
  return img;
}
