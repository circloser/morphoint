"use client";

import { useEffect, useRef } from "react";
import type { Frame } from "@/lib/types";
import { loadBitmap } from "@/lib/imageUtils";
import { defaultTargets, similarityFromAnchors } from "@/lib/transform";

/**
 * Draws a frame aligned to the canonical eye targets, exactly as it will appear
 * in the final video — so the alignment grid doubles as a live preview.
 */
export default function AlignedPreview({
  frame,
  size = 160,
  className,
}: {
  frame: Frame;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = ref.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      const bmp = await loadBitmap(frame);
      if (cancelled) {
        bmp.close();
        return;
      }
      const targets = defaultTargets(size);
      const anchors = frame.anchors ?? [
        { x: frame.width * 0.38, y: frame.height * 0.44 },
        { x: frame.width * 0.62, y: frame.height * 0.44 },
      ];
      const m = similarityFromAnchors(
        anchors[0],
        anchors[1],
        targets[0],
        targets[1],
      );
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingQuality = "high";
      ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
      ctx.drawImage(bmp, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      bmp.close();
    })();
    return () => {
      cancelled = true;
    };
  }, [frame, frame.anchors, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={className}
      style={{ width: "100%", aspectRatio: "1 / 1", display: "block" }}
    />
  );
}
