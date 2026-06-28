import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { Frame, Point } from "./types";

// For accurate alignment we use the Face Landmarker's iris centers (the most
// precise, well-defined "eye position" points), rather than a detector's coarse
// eye keypoints. Indices 468/473 are the two iris centers in the 478-point mesh.
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
// Fallback to outer eye corners if iris points are unavailable.
const LEFT_EYE_CORNER = 33;
const RIGHT_EYE_CORNER = 263;

// Decoding/detecting a phone's full 12MP photo is the main cost. We downscale
// to this longest edge first; landmarks are normalized (0..1) so they still map
// back onto the original full-resolution image exactly. Keep this reasonably
// high so small/far faces still resolve well.
const DETECT_MAX_EDGE = 720;

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

/**
 * Lazily create (and cache) the FaceLandmarker. Runs entirely in the browser.
 * CPU delegate avoids the WebGL warm-up that is slow/flaky on mobile Safari;
 * the model's input is a fixed small size, so inference cost is steady.
 */
export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "IMAGE",
        numFaces: 1,
      });
    })();
  }
  return landmarkerPromise;
}

/** Kick off model + wasm download/init early (one-time cost). */
export function warmUpFaceLandmarker(): Promise<FaceLandmarker> {
  return getFaceLandmarker();
}

/** Decode a frame's image downscaled so detection is fast. */
async function loadDownscaled(frame: Frame): Promise<ImageBitmap> {
  const longest = Math.max(frame.width, frame.height) || DETECT_MAX_EDGE;
  const scale = Math.min(1, DETECT_MAX_EDGE / longest);
  const opts: ImageBitmapOptions = { imageOrientation: "from-image" };
  if (scale < 1) {
    opts.resizeWidth = Math.max(1, Math.round(frame.width * scale));
    opts.resizeHeight = Math.max(1, Math.round(frame.height * scale));
    opts.resizeQuality = "high";
  }
  return createImageBitmap(frame.file, opts);
}

/** Average a set of landmark indices into one normalized point. */
function meanPoint(
  lm: { x: number; y: number }[],
  indices: number[],
): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const i of indices) {
    x += lm[i].x;
    y += lm[i].y;
  }
  return { x: x / indices.length, y: y / indices.length };
}

// The five iris ring points per eye (center + 4 around). Averaging them yields
// a steadier pupil center than the single center landmark alone.
const LEFT_IRIS_RING = [468, 469, 470, 471, 472];
const RIGHT_IRIS_RING = [473, 474, 475, 476, 477];

/**
 * Detect the two eye anchor points (in source pixel coordinates) for one frame.
 * Returns null when no face is found, so the caller can fall back to manual
 * anchoring.
 */
export async function detectEyeAnchors(
  frame: Frame,
): Promise<[Point, Point] | null> {
  const landmarker = await getFaceLandmarker();
  const bitmap = await loadDownscaled(frame);
  try {
    const result = landmarker.detect(bitmap);
    const faces = result.faceLandmarks;
    if (!faces || faces.length === 0) return null;

    const lm = faces[0];
    const hasIris = lm.length > RIGHT_IRIS_CENTER;

    const toPixel = (p: { x: number; y: number }): Point => ({
      x: p.x * frame.width,
      y: p.y * frame.height,
    });

    let p1: Point;
    let p2: Point;
    if (hasIris) {
      p1 = toPixel(meanPoint(lm, LEFT_IRIS_RING));
      p2 = toPixel(meanPoint(lm, RIGHT_IRIS_RING));
    } else {
      p1 = toPixel(lm[LEFT_EYE_CORNER]);
      p2 = toPixel(lm[RIGHT_EYE_CORNER]);
    }

    // Keep a consistent left→right ordering so rotation never flips.
    return p1.x <= p2.x ? [p1, p2] : [p2, p1];
  } finally {
    bitmap.close();
  }
}
