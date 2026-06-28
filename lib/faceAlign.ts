import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { Frame, Point } from "./types";

// MediaPipe Face Landmarker (478 points incl. iris). We align on the two iris
// centers because they are the most stable, well-defined "eye position" points
// across very different photos (baby → adult).
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
// Fallbacks if iris points are absent: outer eye corners.
const LEFT_EYE_CORNER = 33;
const RIGHT_EYE_CORNER = 263;

// Faces are easily detected at low resolution. Decoding/detecting on a phone's
// full 12MP photo is what makes this slow, so we downscale to this longest-edge
// size first. Landmarks are normalized (0..1), so they still map back onto the
// original full-resolution image exactly.
const DETECT_MAX_EDGE = 512;

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

/**
 * Lazily create (and cache) the FaceLandmarker. Runs entirely in the browser.
 * Uses the CPU delegate: for one-shot batch detection it avoids the WebGL
 * warm-up cost (which is slow/flaky on mobile Safari) and is plenty fast on the
 * downscaled images we feed it.
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
    opts.resizeQuality = "medium";
  }
  return createImageBitmap(frame.file, opts);
}

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
    const leftIdx = hasIris ? LEFT_IRIS_CENTER : LEFT_EYE_CORNER;
    const rightIdx = hasIris ? RIGHT_IRIS_CENTER : RIGHT_EYE_CORNER;

    // Normalized coords → original full-resolution pixels.
    const toPixel = (i: number): Point => ({
      x: lm[i].x * frame.width,
      y: lm[i].y * frame.height,
    });

    // Keep a consistent left→right ordering so rotation never flips.
    const p1 = toPixel(leftIdx);
    const p2 = toPixel(rightIdx);
    return p1.x <= p2.x ? [p1, p2] : [p2, p1];
  } finally {
    bitmap.close();
  }
}
