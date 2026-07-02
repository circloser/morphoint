import type {
  Frame,
  OutputSettings,
  Point,
  TransitionType,
} from "./types";
import { loadBitmap } from "./imageUtils";
import { defaultTargets, similarityFromAnchors } from "./transform";

/** Even number ≥ 2 (H.264/yuv420p require even dimensions). */
function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

/** Output pixel dimensions derived from base width + aspect ratio. */
export function outputDimensions(settings: OutputSettings): {
  width: number;
  height: number;
} {
  const w = settings.size;
  let h = w;
  if (settings.aspect === "4:5") h = (w * 5) / 4;
  else if (settings.aspect === "9:16") h = (w * 16) / 9;
  return { width: even(w), height: even(h) };
}

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

/** Smoothstep easing for a calmer crossfade. */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
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

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const fontSize = Math.round(Math.min(width, height) * 0.038);
  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "right";
  const pad = Math.round(Math.min(width, height) * 0.04);
  const label = "✦ Morphoint";
  const metrics = ctx.measureText(label);
  // Soft dark pill behind the text for legibility on any photo.
  const w = metrics.width + fontSize;
  const h = fontSize * 1.7;
  const x = width - pad;
  const y = height - pad;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#000000";
  roundRect(ctx, x - w, y - h + fontSize * 0.25, w, h, h / 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, x - fontSize * 0.5, y - fontSize * 0.35);
  ctx.restore();
}

function formatTakenAt(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** Date pill in the bottom-left corner (opposite the watermark). */
function drawDateLabel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
) {
  const fontSize = Math.round(Math.min(width, height) * 0.038);
  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const pad = Math.round(Math.min(width, height) * 0.04);
  const metrics = ctx.measureText(text);
  const w = metrics.width + fontSize;
  const h = fontSize * 1.7;
  const x = pad;
  const y = height - pad;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#000000";
  roundRect(ctx, x, y - h + fontSize * 0.25, w, h, h / 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + fontSize * 0.5, y - fontSize * 0.35);
  ctx.restore();
}

/** Mean perceptual luminance of a canvas, sampled at low resolution. */
function meanLuma(layer: HTMLCanvasElement): number {
  const s = document.createElement("canvas");
  s.width = 32;
  s.height = 32;
  const sctx = s.getContext("2d")!;
  sctx.drawImage(layer, 0, 0, 32, 32);
  const d = sctx.getImageData(0, 0, 32, 32).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  }
  return sum / (d.length / 4);
}

/**
 * Equalize brightness across pre-rendered layers so photos shot in different
 * lighting don't flicker. Each layer is scaled toward the set's mean luminance
 * with a clamped gain (one pixel pass per photo, not per output frame).
 */
function equalizeBrightness(layers: HTMLCanvasElement[]) {
  const lumas = layers.map(meanLuma);
  const target = lumas.reduce((a, b) => a + b, 0) / lumas.length;
  layers.forEach((layer, i) => {
    const gain = Math.min(1.35, Math.max(0.75, target / (lumas[i] || 1)));
    if (Math.abs(gain - 1) < 0.02) return; // already close — skip the pass
    const lctx = layer.getContext("2d")!;
    const img = lctx.getImageData(0, 0, layer.width, layer.height);
    const d = img.data;
    for (let j = 0; j < d.length; j += 4) {
      d[j] = Math.min(255, d[j] * gain);
      d[j + 1] = Math.min(255, d[j + 1] * gain);
      d[j + 2] = Math.min(255, d[j + 2] * gain);
    }
    lctx.putImageData(img, 0, 0);
  });
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
 *
 * Each source photo is aligned into an output-sized "layer" exactly once; the
 * timeline then just composites layers. That keeps per-frame work tiny and
 * lets us equalize brightness with a single pixel pass per photo.
 */
export async function renderTimeline(
  frames: Frame[],
  settings: OutputSettings,
  onProgress?: (p: number) => void,
): Promise<RenderResult> {
  const { width, height } = outputDimensions(settings);
  const targets = defaultTargets(width, height);

  // Pre-render every photo aligned onto a white output-sized layer.
  const layers: HTMLCanvasElement[] = [];
  for (const f of frames) {
    const bmp = await loadBitmap(f);
    const anchors: [Point, Point] = f.anchors ?? [
      { x: f.width * 0.38, y: f.height * 0.44 },
      { x: f.width * 0.62, y: f.height * 0.44 },
    ];
    const m = similarityFromAnchors(
      anchors[0],
      anchors[1],
      targets[0],
      targets[1],
    );
    const layer = document.createElement("canvas");
    layer.width = width;
    layer.height = height;
    const lctx = layer.getContext("2d")!;
    lctx.imageSmoothingEnabled = true;
    lctx.imageSmoothingQuality = "high";
    lctx.fillStyle = "#ffffff";
    lctx.fillRect(0, 0, width, height);
    lctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    lctx.drawImage(bmp, 0, 0);
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    bmp.close();
    layers.push(layer);
  }

  if (settings.normalize && layers.length > 1) equalizeBrightness(layers);

  const dates = frames.map((f) => formatTakenAt(f.takenAt));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false })!;

  const order = buildOrder(frames.length, settings.pingPong);
  const hold = Math.max(1, Math.round(settings.holdSec * settings.fps));
  const isCut = settings.transition === "cut";
  const trans = isCut
    ? 0
    : Math.max(1, Math.round(settings.transitionSec * settings.fps));
  const total = countOutputFrames(order.length, settings);

  const out: Uint8Array[] = [];
  let done = 0;

  const emit = async (dateIdx: number) => {
    if (settings.showDates) drawDateLabel(ctx, width, height, dates[dateIdx]);
    if (settings.watermark) drawWatermark(ctx, width, height);
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/png"),
    );
    out.push(new Uint8Array(await blob.arrayBuffer()));
    done += 1;
    onProgress?.(done / total);
  };

  const clear = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  };

  const drawLayer = (i: number, alpha = 1, offsetX = 0) => {
    ctx.globalAlpha = alpha;
    ctx.drawImage(layers[i], offsetX, 0);
    ctx.globalAlpha = 1;
  };

  const effect = settings.transition as Exclude<TransitionType, "cut">;

  for (let oi = 0; oi < order.length; oi++) {
    const idx = order[oi];
    // Hold current frame.
    for (let h = 0; h < hold; h++) {
      clear();
      drawLayer(idx);
      await emit(idx);
    }
    // Transition into the next frame in the order (skipped for hard cuts).
    if (!isCut && oi < order.length - 1) {
      const nextIdx = order[oi + 1];
      for (let ti = 1; ti <= trans; ti++) {
        const t = ti / (trans + 1);
        const e = ease(t);
        clear();
        switch (effect) {
          case "dissolve":
            drawLayer(idx);
            drawLayer(nextIdx, e);
            break;
          case "fade":
            // Dip through the white background at the midpoint.
            drawLayer(idx, Math.max(0, 1 - 2 * e));
            drawLayer(nextIdx, Math.max(0, 2 * e - 1));
            break;
          case "slide":
            // Outgoing slides left while the incoming enters from the right.
            drawLayer(idx, 1, -e * width);
            drawLayer(nextIdx, 1, width - e * width);
            break;
        }
        // Label with whichever photo dominates this moment.
        await emit(t < 0.5 ? idx : nextIdx);
      }
    }
  }

  return { frames: out, width, height };
}
