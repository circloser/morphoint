// Shared types for the Morphoint pipeline.

export type AlignMode = "face" | "manual";

export type OutputFormat = "mp4" | "gif";

/** Visual effect used between consecutive photos. */
export type TransitionType = "dissolve" | "fade" | "slide" | "cut";

/** Output aspect ratio. 1:1 is free; portrait ratios are a premium perk. */
export type AspectKey = "1:1" | "4:5" | "9:16";

export interface Point {
  x: number;
  y: number;
}

/** A single source photo plus everything we derive from it. */
export interface Frame {
  id: string;
  file: File;
  /** Object URL for preview (revoke on removal). */
  url: string;
  /** Natural pixel size of the decoded image. */
  width: number;
  height: number;
  /**
   * Two anchor points in *source image pixel* coordinates used to align this
   * frame. For face mode these are the two eye/iris centers (auto-detected);
   * for manual mode they are user-tapped reference points.
   */
  anchors?: [Point, Point];
  /** True once anchors are known (auto-detected or manually set). */
  aligned: boolean;
  /** Face detection ran but found nothing → needs manual anchors. */
  faceFailed?: boolean;
  /**
   * When the photo was taken (ms epoch) — EXIF DateTimeOriginal when present,
   * otherwise the file's lastModified. Used to auto-sort uploads by time.
   */
  takenAt: number;
}

export interface OutputSettings {
  format: OutputFormat;
  /** Base width in px (even number); height derives from `aspect`. */
  size: number;
  /** Output aspect ratio (width:height). */
  aspect: AspectKey;
  fps: number;
  /** Seconds each photo is held fully visible. */
  holdSec: number;
  /** Seconds of transition between consecutive photos. */
  transitionSec: number;
  /** Which visual effect to use between photos. */
  transition: TransitionType;
  /** Loop the sequence back to the first frame at the end. */
  pingPong: boolean;
  /** Whether the Morphoint watermark is burned in (false = premium). */
  watermark: boolean;
}

export const DEFAULT_SETTINGS: OutputSettings = {
  format: "mp4",
  size: 720,
  aspect: "1:1",
  fps: 18,
  holdSec: 0.25,
  transitionSec: 0.45,
  transition: "dissolve",
  pingPong: false,
  watermark: true,
};

/**
 * Free-tier cap on photos per project.
 * Temporarily raised during the testing phase to effectively remove the limit.
 * Restore to 5 (or the desired free cap) before monetized launch.
 */
export const FREE_PHOTO_LIMIT = 1000;
