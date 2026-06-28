import type {
  Frame,
  OutputSettings,
  Point,
  TransitionType,
} from "./types";
import { loadBitmap } from "./imageUtils";
import {
  defaultTargets,
  similarityFromAnchors,
  type Matrix,
} from "./transform";

/** Build the playback order of frame indices, optionally bouncing back. */
export function buildOrder(count: number, pingPong: boolean): number[] {
  const forward = Array.from({ length: count }, (_, i) => i);
  if (!pingPong || count < 3) return forward;
  const back = Array.from({ length: count - 2 }, (_, i) => count - 2 - i);
  return [...forward, ...back];
}

/** Total number of output video frames for a given timeline. */
export function countOutputFrames(
  orderLength: number,
  settings: OutputSettings,
): number {
  const hold = Math.max(1, Math.round(settings.holdSec * settings.fps));
  const trans =
    settings.transition === "cut"
      ? 0
      : Math.max(1, Math.round(settings.transitionSec * settings.fps));
  // hold for each frame + a transition between each consecutive pair.
  return orderLength * hold + Math.max(0, orderLength - 1) * trans;
}

function drawAligned(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  m: Matrix,
  alpha: number,
  offsetX = 0,
) {
  ctx.globalAlpha = alpha;
  // setTransform is absolute, so bake any slide offset into the translation.
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e + offsetX, m.f);
  ctx.drawImage(bitmap, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
}

/** Render one in-between frame for the chosen transition effect. */
function drawTransition(
  ctx: CanvasRenderingContext2D,
  size: number,
  fromBmp: ImageBitmap,
  fromM: Matrix,
  toBmp: ImageBitmap,
  toM: Matrix,
  type: Exclude<TransitionType, "cut">,
  t: number, // 0..1 progress
) {
  const e = ease(t);
  switch (type) {
    case "dissolve":
      drawAligned(ctx, fromBmp, fromM, 1);
      drawAligned(ctx, toBmp, toM, e);
      break;
    case "fade":
      // Dip through the white background at the midpoint.
      drawAligned(ctx, fromBmp, fromM, Math.max(0, 1 - 2 * e));
      drawAligned(ctx, toBmp, toM, Math.max(0, 2 * e - 1));
      break;
    case "slide":
      // Outgoing photo slides left while the incoming one enters from the right.
      drawAligned(ctx, fromBmp, fromM, 1, -e * size);
      drawAligned(ctx, toBmp, toM, 1, size - e * size);
      break;
  }
}

function drawWatermark(ctx: CanvasRenderingContext2D, size: number) {
  const fontSize = Math.round(size * 0.038);
  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "right";
  const pad = Math.round(size * 0.04);
  const label = "✦ Morphoint";
  const metrics = ctx.measureText(label);
  // Soft dark pill behind the text for legibility on any photo.
  const w = metrics.width + fontSize;
  const h = fontSize * 1.7;
  const x = size - pad;
  const y = size - pad;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#000000";
  roundRect(ctx, x - w, y - h + fontSize * 0.25, w, h, h / 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, x - fontSize * 0.5, y - fontSize * 0.35);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Smoothstep easing for a calmer crossfade. */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

export interface RenderResult {
  /** PNG bytes for each output frame, in order. */
  frames: Uint8Array[];
  width: number;
  height: number;
}

/**
 * Render the full aligned + crossfaded timeline to PNG frames, entirely on the
 * client. `onProgress` reports 0..1 over the rendering phase.
 */
export async function renderTimeline(
  frames: Frame[],
  settings: OutputSettings,
  onProgress?: (p: number) => void,
): Promise<RenderResult> {
  const size = settings.size;
  const targets = defaultTargets(size);

  // Decode all bitmaps and precompute per-frame alignment matrices.
  const bitmaps: ImageBitmap[] = [];
  const matrices: Matrix[] = [];
  for (const f of frames) {
    const bmp = await loadBitmap(f);
    bitmaps.push(bmp);
    const anchors: [Point, Point] = f.anchors ?? [
      { x: f.width * 0.38, y: f.height * 0.44 },
      { x: f.width * 0.62, y: f.height * 0.44 },
    ];
    matrices.push(
      similarityFromAnchors(anchors[0], anchors[1], targets[0], targets[1]),
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const order = buildOrder(frames.length, settings.pingPong);
  const hold = Math.max(1, Math.round(settings.holdSec * settings.fps));
  const isCut = settings.transition === "cut";
  const trans = isCut
    ? 0
    : Math.max(1, Math.round(settings.transitionSec * settings.fps));
  const total = countOutputFrames(order.length, settings);

  const out: Uint8Array[] = [];
  let done = 0;

  const emit = async () => {
    if (settings.watermark) drawWatermark(ctx, size);
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/png"),
    );
    out.push(new Uint8Array(await blob.arrayBuffer()));
    done += 1;
    onProgress?.(done / total);
  };

  const clear = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
  };

  for (let oi = 0; oi < order.length; oi++) {
    const idx = order[oi];
    // Hold current frame.
    for (let h = 0; h < hold; h++) {
      clear();
      drawAligned(ctx, bitmaps[idx], matrices[idx], 1);
      await emit();
    }
    // Transition into the next frame in the order (skipped for hard cuts).
    if (!isCut && oi < order.length - 1) {
      const nextIdx = order[oi + 1];
      const effect = settings.transition as Exclude<TransitionType, "cut">;
      for (let t = 1; t <= trans; t++) {
        clear();
        drawTransition(
          ctx,
          size,
          bitmaps[idx],
          matrices[idx],
          bitmaps[nextIdx],
          matrices[nextIdx],
          effect,
          t / (trans + 1),
        );
        await emit();
      }
    }
  }

  bitmaps.forEach((b) => b.close());
  return { frames: out, width: size, height: size };
}
