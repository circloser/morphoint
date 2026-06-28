import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import type { OutputSettings } from "./types";
import type { RenderResult } from "./render";

// Single-threaded ffmpeg core: needs no SharedArrayBuffer / cross-origin
// isolation, so it coexists with cross-origin ad scripts and free hosting.
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export function loadFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const instance = new FFmpeg();
      if (onLog) instance.on("log", ({ message }) => onLog(message));
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      ]);
      await instance.load({ coreURL, wasmURL });
      ffmpeg = instance;
      return instance;
    })();
  }
  return loadPromise;
}

function pad(n: number): string {
  return n.toString().padStart(5, "0");
}

/**
 * Copy ffmpeg FS output into a fresh ArrayBuffer-backed Uint8Array. ffmpeg may
 * hand back SharedArrayBuffer-backed data, which Blob's types reject directly.
 */
function toBlob(data: Uint8Array | string, type: string): Blob {
  const u8 = data as Uint8Array;
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return new Blob([copy], { type });
}

/**
 * Encode the rendered PNG frames into an MP4 (H.264) or animated GIF.
 * `onProgress` reports 0..1 over the encode phase.
 */
export async function encode(
  render: RenderResult,
  settings: OutputSettings,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const ff = await loadFFmpeg();
  const fps = settings.fps;

  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) {
      onProgress?.(Math.min(1, Math.max(0, progress)));
    }
  };
  ff.on("progress", progressHandler);

  try {
    // Write every frame into the in-memory FS.
    for (let i = 0; i < render.frames.length; i++) {
      await ff.writeFile(`f${pad(i)}.png`, render.frames[i]);
    }

    if (settings.format === "gif") {
      // Two-pass palette for clean GIF colors.
      await ff.exec([
        "-i",
        "f%05d.png",
        "-vf",
        `fps=${fps},palettegen=stats_mode=diff`,
        "palette.png",
      ]);
      await ff.exec([
        "-framerate",
        String(fps),
        "-i",
        "f%05d.png",
        "-i",
        "palette.png",
        "-lavfi",
        `fps=${fps},paletteuse=dither=bayer:bayer_scale=3`,
        "-loop",
        "0",
        "out.gif",
      ]);
      const data = await ff.readFile("out.gif");
      return toBlob(data, "image/gif");
    }

    await ff.exec([
      "-framerate",
      String(fps),
      "-i",
      "f%05d.png",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-movflags",
      "+faststart",
      "out.mp4",
    ]);
    const data = await ff.readFile("out.mp4");
    return toBlob(data, "video/mp4");
  } finally {
    ff.off("progress", progressHandler);
    // Best-effort cleanup of the virtual FS.
    for (let i = 0; i < render.frames.length; i++) {
      try {
        await ff.deleteFile(`f${pad(i)}.png`);
      } catch {
        /* file may not exist */
      }
    }
  }
}
