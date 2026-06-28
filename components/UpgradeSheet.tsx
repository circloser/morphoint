"use client";

import { CheckIcon } from "./icons";

const PERKS = [
  "사진 무제한 업로드",
  "워터마크 제거",
  "1080p 고화질 출력",
  "광고 없는 깔끔한 화면",
];

/**
 * Upgrade sheet. Payments are out of scope this round, so the CTA simply
 * unlocks premium locally — wire it to a checkout provider later.
 */
export default function UpgradeSheet({
  open,
  onClose,
  onUnlock,
}: {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-rise w-full max-w-md rounded-t-3xl bg-bg p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-line" />
        <h2 className="text-2xl font-bold tracking-tight">Morphoint 프리미엄</h2>
        <p className="mt-1 text-sm text-fg-faint">
          월 $1 — 가볍게, 더 멋지게 만드세요.
        </p>

        <ul className="my-6 space-y-3">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fg text-white">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-medium">{p}</span>
            </li>
          ))}
        </ul>

        <button onClick={onUnlock} className="btn btn-primary w-full">
          프리미엄 시작하기
        </button>
        <p className="mt-3 text-center text-[11px] leading-4 text-fg-faint">
          결제 연동은 준비 중이에요. 지금은 체험으로 바로 켜집니다.
        </p>
        <button
          onClick={onClose}
          className="mt-2 w-full py-2 text-sm font-medium text-fg-soft"
        >
          나중에
        </button>
      </div>
    </div>
  );
}
