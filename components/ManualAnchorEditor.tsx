"use client";

import { useRef, useState } from "react";
import type { Frame, Point } from "@/lib/types";

/**
 * Lets the user tap two reference points on a photo (e.g. two eyes, or two
 * fixed corners of a room / pot). Taps map back to source pixel coordinates.
 * The first tap sets point A, the second sets point B; tapping again restarts.
 */
export default function ManualAnchorEditor({
  frame,
  onChange,
  onClose,
}: {
  frame: Frame;
  onChange: (anchors: [Point, Point]) => void;
  onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [pts, setPts] = useState<Point[]>(
    frame.anchors ? [...frame.anchors] : [],
  );

  const handleTap = (e: React.PointerEvent) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const px: Point = {
      x: Math.min(1, Math.max(0, relX)) * frame.width,
      y: Math.min(1, Math.max(0, relY)) * frame.height,
    };
    const next = pts.length >= 2 ? [px] : [...pts, px];
    setPts(next);
    if (next.length === 2) {
      const [a, b] = next;
      onChange(a.x <= b.x ? [a, b] : [b, a]);
    }
  };

  // Render markers in display space.
  const markerStyle = (p: Point): React.CSSProperties => ({
    left: `${(p.x / frame.width) * 100}%`,
    top: `${(p.y / frame.height) * 100}%`,
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 py-4 text-white">
        <span className="text-sm font-medium">
          {pts.length < 2
            ? `기준점 ${pts.length + 1}/2 — 사진을 탭하세요`
            : "두 기준점 설정 완료"}
        </span>
        <button
          onClick={onClose}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          완료
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-8">
        <div
          className="relative max-h-full max-w-full select-none"
          onPointerDown={handleTap}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={frame.url}
            alt="정렬할 사진"
            draggable={false}
            className="max-h-[68vh] max-w-full rounded-2xl object-contain"
          />
          {pts.map((p, i) => (
            <div
              key={i}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={markerStyle(p)}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-black/60 text-[11px] font-bold text-white shadow-lg">
                {i === 0 ? "A" : "B"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="px-6 pb-8 text-center text-xs leading-5 text-white/70">
        같은 두 지점을 모든 사진에서 똑같이 찍어주세요. 얼굴이면 양쪽 눈동자,
        장소·식물이면 변하지 않는 두 모서리를 추천해요.
      </p>
    </div>
  );
}
