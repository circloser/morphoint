"use client";

import { useEffect, useRef, useState } from "react";
import type { AlignMode, Frame, Point } from "@/lib/types";
import { detectEyeAnchors } from "@/lib/faceAlign";
import AlignedPreview from "./AlignedPreview";
import ManualAnchorEditor from "./ManualAnchorEditor";
import { ArrowLeft, ArrowRight, CheckIcon } from "./icons";

export default function AlignStep({
  frames,
  mode,
  setAnchors,
  onBack,
  onNext,
}: {
  frames: Frame[];
  mode: AlignMode;
  setAnchors: (id: string, anchors: [Point, Point]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [editing, setEditing] = useState<Frame | null>(null);
  const [detecting, setDetecting] = useState(false);
  const ranFor = useRef<string>("");

  // Auto-detect eyes when in face mode. Runs once per frame-set, sequentially
  // (MediaPipe processes one image at a time).
  useEffect(() => {
    if (mode !== "face") return;
    const key = frames.map((f) => f.id).join(",");
    if (ranFor.current === key) return;
    ranFor.current = key;

    let cancelled = false;
    (async () => {
      setDetecting(true);
      for (const f of frames) {
        if (f.aligned) continue;
        try {
          const anchors = await detectEyeAnchors(f);
          if (cancelled) return;
          if (anchors) {
            setAnchors(f.id, anchors);
          } else {
            // Mark as needing manual help without blocking the rest.
            f.faceFailed = true;
          }
        } catch {
          if (!cancelled) f.faceFailed = true;
        }
      }
      if (!cancelled) setDetecting(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, frames]);

  const allAligned = frames.every((f) => f.aligned);
  const pending = frames.filter((f) => !f.aligned).length;

  return (
    <div className="animate-rise space-y-4 pb-28">
      <div className="rounded-xl bg-bg-soft px-4 py-3 text-sm text-fg-soft">
        {mode === "face" ? (
          detecting ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-fg border-t-transparent" />
              얼굴에서 눈 위치를 찾는 중…
            </span>
          ) : pending === 0 ? (
            "모든 사진이 정렬됐어요. 미리보기를 확인하세요."
          ) : (
            `${pending}장은 얼굴을 못 찾았어요. 탭해서 두 눈을 직접 찍어주세요.`
          )
        ) : (
          "각 사진을 탭해 같은 두 기준점을 찍어주세요. (예: 양쪽 모서리)"
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {frames.map((f, i) => (
          <button
            key={f.id}
            onClick={() => setEditing(f)}
            className="card relative overflow-hidden p-0 text-left"
          >
            {f.aligned ? (
              <AlignedPreview frame={f} size={220} />
            ) : (
              // Not yet aligned: show the raw photo as a hint.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.url}
                alt={`${i + 1}`}
                className="aspect-square w-full object-cover opacity-90"
              />
            )}
            <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <span
              className={`absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                f.aligned
                  ? "bg-fg text-white"
                  : "bg-white text-fg shadow ring-1 ring-line"
              }`}
            >
              {f.aligned ? (
                <>
                  <CheckIcon className="h-3 w-3" /> 정렬됨
                </>
              ) : (
                "기준점 필요"
              )}
            </span>
          </button>
        ))}
      </div>

      {editing && (
        <ManualAnchorEditor
          frame={editing}
          onChange={(anchors) => setAnchors(editing.id, anchors)}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-md gap-2">
          <button onClick={onBack} className="btn btn-ghost px-4">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onNext}
            disabled={!allAligned}
            className="btn btn-primary flex-1"
          >
            {allAligned ? "다음 — 영상 만들기" : `${pending}장 더 정렬해주세요`}
            {allAligned && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
