/**
 * Coordinate System Utilities
 * 
 * STANDARD: All bounding boxes across DB, API, and state are stored as normalized [0..1] floats.
 * Top-left is (0,0) and bottom-right is (1,1).
 * 
 * Exactly ONE place converts normalized coordinates to pixel coordinates:
 * at render time using live Konva stage width/height.
 */

export interface NormalizedBBox {
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
}

export interface PixelBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Normalizes pixel bounding box to [0..1] float range.
 */
export function normalizeBBox(
  box: { x: number; y: number; w: number; h: number },
  sourceWidth: number,
  sourceHeight: number
): NormalizedBBox {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  const x = Math.max(0, Math.min(1, box.x / sourceWidth));
  const y = Math.max(0, Math.min(1, box.y / sourceHeight));
  const w = Math.max(0.005, Math.min(1 - x, box.w / sourceWidth));
  const h = Math.max(0.005, Math.min(1 - y, box.h / sourceHeight));
  return { x, y, w, h };
}

/**
 * Denormalizes [0..1] float bounding box to live stage pixel coordinates.
 * This is the ONLY place pixel conversion should occur.
 */
export function denormalizeBBox(
  box: { x: number; y: number; w: number; h: number },
  targetWidth: number,
  targetHeight: number
): PixelBBox {
  // All inputs should be [0..1] floats from the normalized pipeline.
  // Clamp to valid range as a safety net.
  const nx = Math.max(0, Math.min(1, box.x));
  const ny = Math.max(0, Math.min(1, box.y));
  const nw = Math.max(0.001, Math.min(1 - nx, box.w));
  const nh = Math.max(0.001, Math.min(1 - ny, box.h));

  return {
    x: nx * targetWidth,
    y: ny * targetHeight,
    w: nw * targetWidth,
    h: nh * targetHeight,
  };
}

/**
 * Formats a normalized bounding box into a natural spatial description for prompt guidance.
 */
export function getSpatialHint(box?: NormalizedBBox | null): string {
  if (!box) return "in the image";

  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;

  let horizontal = "center";
  if (centerX < 0.35) horizontal = "left side";
  else if (centerX > 0.65) horizontal = "right side";

  let vertical = "middle";
  if (centerY < 0.35) vertical = "top";
  else if (centerY > 0.65) vertical = "bottom";

  const locationDesc = (vertical === "middle" && horizontal === "center")
    ? "the center of the image"
    : `the ${vertical} ${horizontal} of the image`;

  return `${locationDesc} (approx coordinates: x=${Math.round(box.x * 100)}%, y=${Math.round(box.y * 100)}%, width=${Math.round(box.w * 100)}%, height=${Math.round(box.h * 100)}%)`;
}
