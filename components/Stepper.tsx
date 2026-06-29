"use client";

import { useI18n } from "@/lib/i18n";

export default function Stepper({ current }: { current: 0 | 1 | 2 }) {
  const { t } = useI18n();
  const STEPS = [t("step.photos"), t("step.align"), t("step.video")];
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 h-8 text-[13px] font-semibold transition ${
                active
                  ? "bg-fg text-white"
                  : done
                    ? "bg-bg-soft text-fg"
                    : "bg-bg-soft text-fg-faint"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  active ? "bg-white text-fg" : "bg-transparent"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {label}
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-px w-4 bg-line" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
