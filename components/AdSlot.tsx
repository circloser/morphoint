"use client";

import { useI18n } from "@/lib/i18n";

// Placeholder ad slot. Drop an AdSense/Coupang unit in here when approved.
// Hidden for premium users. Single-threaded ffmpeg means no cross-origin
// isolation, so third-party ad scripts load normally. Fixed height avoids CLS.
export default function AdSlot({ hidden }: { hidden?: boolean }) {
  const { t } = useI18n();
  if (hidden) return null;
  return (
    <div className="mx-auto my-4 flex h-16 max-w-md items-center justify-center rounded-xl border border-dashed border-line bg-bg-soft text-xs text-fg-faint">
      {t("ad.label")}
    </div>
  );
}
