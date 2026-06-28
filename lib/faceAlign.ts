import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import type { Frame, Point } from "./types";

// We only need the two eye positions to align faces, so we use the lightweight
// BlazeFace short-range *detector* (~230KB) instead of the heavy 478-point Face
// Landmarker (~3.8MB). It returns 6 keypoints per face; index 0/1 are the eyes.
// This is dramatically faster to download and to run, especially on phones.
const RIGHT_EYE_KP = 0;
const LEFT_EYE_KP = 1;

// Faces detect fine at low resolution. Decoding/detecting a phone's full 12MP
// photo is the main cost, so we downscale to this longest edge first. Keypoints
// are normalized (0..1), so they still map back onto the full-res image exactly.
const DETECT_MAX_EDGE = 512;

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

let detectorPromise: Promise<FaceDetector> | null = null;

/**
 * Lazily create (and cache) the FaceDetector. Runs entirely in the browser.
 * CPU delegate: with this tiny model, inference is a few tens of ms and we skip
 * the WebGL warm-up that is slow/flaky on mobile Safari.
 */
export function getFaceDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.4,
      });
    })();
  }
  return detectorPromise;
}

/** Kick off model + wasm download/init early (one-time cost). */
export function warmUpFaceLandmarker(): Promise<FaceDetector> {
  return getFaceDetector();
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
 * Returns null when no face/eyes are found, so the caller can fall back to
 * manual anchoring.
 */
export async function detectEyeAnchors(
  frame: Frame,
): Promise<[Point, Point] | null> {
  const detector = await getFaceDetector();
  const bitmap = await loadDownscaled(frame);
  try {
    const result = detector.detect(bitmap);
    const detections = result.detections;
    if (!detections || detections.length === 0) return null;

    // Pick the most confident face when several are present.
    const best = detections.reduce((a, b) =>
      (b.categories?.[0]?.score ?? 0) > (a.categories?.[0]?.score ?? 0) ? b : a,
    );
    const kp = best.keypoints;
    if (!kp || kp.length <= LEFT_EYE_KP) return null;

    // Normalized coords → original full-resolution pixels.
    const toPixel = (i: number): Point => ({
      x: kp[i].x * frame.width,
      y: kp[i].y * frame.height,
    });

    // Keep a consistent left→right ordering so rotation never flips.
    const p1 = toPixel(RIGHT_EYE_KP);
    const p2 = toPixel(LEFT_EYE_KP);
    return p1.x <= p2.x ? [p1, p2] : [p2, p1];
  } finally {
    bitmap.close();
  }
}
