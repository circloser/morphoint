"use client";

// Placeholder ad slot. Drop an AdSense/Coupang unit in here when approved.
// Hidden for premium users. Single-threaded ffmpeg means no cross-origin
// isolation, so third-party ad scripts load normally.
export default function AdSlot({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div className="mx-auto my-4 flex h-16 max-w-md items-center justify-center rounded-xl border border-dashed border-line bg-bg-soft text-xs text-fg-faint">
      광고 영역 · 프리미엄에서 사라져요
    </div>
  );
}
