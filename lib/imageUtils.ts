import type { Frame } from "./types";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `f${Date.now().toString(36)}_${idCounter}`;
}

/**
 * Decode an image File honoring its EXIF orientation, returning natural pixel
 * dimensions. We use createImageBitmap with imageOrientation:"from-image" so a
 * portrait photo from a phone is not rotated sideways.
 */
export async function fileToFrame(file: File): Promise<Frame> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close();

  return {
    id: nextId(),
    file,
    url: URL.createObjectURL(file),
    width,
    height,
    aligned: false,
  };
}

/** Decode a Frame's file into an orientation-corrected ImageBitmap. */
export function loadBitmap(frame: Frame): Promise<ImageBitmap> {
  return createImageBitmap(frame.file, { imageOrientation: "from-image" });
}

/** Release a frame's object URL. */
export function disposeFrame(frame: Frame): void {
  URL.revokeObjectURL(frame.url);
}

const IMAGE_TYPES = /^image\/(jpeg|png|webp|heic|heif|avif)$/i;

export function isSupportedImage(file: File): boolean {
  // Some phones report HEIC with an empty type; fall back to extension.
  if (file.type && IMAGE_TYPES.test(file.type)) return true;
  return /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name);
}
