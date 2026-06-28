import type { Point } from "./types";

/**
 * A 2D similarity transform (uniform scale + rotation + translation) expressed
 * as a canvas matrix [a, b, c, d, e, f] where:
 *   x' = a*x + c*y + e
 *   y' = b*x + d*y + f
 */
export interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * Build the similarity transform that maps source anchors (p1, p2) exactly onto
 * target anchors (q1, q2). Two point correspondences fully determine a
 * similarity (scale, rotation, translation) — which is precisely what aligning
 * two eyes (or two reference taps) to fixed positions requires.
 */
export function similarityFromAnchors(
  p1: Point,
  p2: Point,
  q1: Point,
  q2: Point,
): Matrix {
  const dpx = p2.x - p1.x;
  const dpy = p2.y - p1.y;
  const dqx = q2.x - q1.x;
  const dqy = q2.y - q1.y;

  const dpLen2 = dpx * dpx + dpy * dpy || 1e-6;

  // Solve for scale*cos and scale*sin via the complex-division form:
  //   (dq) = (scale*e^{i*theta}) * (dp)
  const a = (dqx * dpx + dqy * dpy) / dpLen2; // scale * cos(theta)
  const b = (dqy * dpx - dqx * dpy) / dpLen2; // scale * sin(theta)

  // Rotation matrix columns: [a, b; -b, a]
  const e = q1.x - (a * p1.x - b * p1.y);
  const f = q1.y - (b * p1.x + a * p1.y);

  return { a, b, c: -b, d: a, e, f };
}

/** Apply a matrix to a point. */
export function applyMatrix(m: Matrix, p: Point): Point {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

/**
 * Default target positions for the two anchors inside a square output canvas.
 * Eyes sit slightly above the middle, comfortably apart — flattering for faces
 * and sensible for generic two-point alignment.
 */
export function defaultTargets(
  width: number,
  height: number = width,
): [Point, Point] {
  // Eyes sit slightly above the middle, comfortably apart. Positions scale with
  // each axis so portrait crops keep the face nicely placed.
  return [
    { x: width * 0.38, y: height * 0.44 },
    { x: width * 0.62, y: height * 0.44 },
  ];
}
