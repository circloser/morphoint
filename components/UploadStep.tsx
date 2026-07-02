"use client";

import { useRef } from "react";
import type { AlignMode, Frame } from "@/lib/types";
import { FREE_PHOTO_LIMIT } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeft,
  ArrowRight,
  FaceIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
} from "./icons";

export default function UploadStep({
  frames,
  mode,
  setMode,
  addFiles,
  removeFrame,
  moveFrame,
  onNext,
  isPremium,
  autoSorted,
}: {
  frames: Frame[];
  mode: AlignMode;
  setMode: (m: AlignMode) => void;
  addFiles: (files: FileList | File[]) => void;
  removeFrame: (id: string) => void;
  moveFrame: (id: string, dir: -1 | 1) => void;
  onNext: () => void;
  isPremium: boolean;
  autoSorted: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = !isPremium && frames.length >= FREE_PHOTO_LIMIT;
  const { t } = useI18n();

  return (
    <div className="animate-rise space-y-5 pb-28">
      {/* Mode selector */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-fg-soft">
          {t("upload.mode")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <ModeCard
            active={mode === "face"}
            onClick={() => setMode("face")}
            icon={<FaceIcon className="h-5 w-5" />}
            title={t("upload.mode.face")}
            desc={t("upload.mode.face.desc")}
          />
          <ModeCard
            active={mode === "manual"}
            onClick={() => setMode("manual")}
            icon={<TargetIcon className="h-5 w-5" />}
            title={t("upload.mode.manual")}
            desc={t("upload.mode.manual.desc")}
          />
        </div>
      </section>

      {/* Upload area */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg-soft">
            {t("upload.count", { n: frames.length })}
          </h2>
          {autoSorted ? (
            <span className="text-xs text-fg-faint">
              {t("upload.autoSorted")}
            </span>
          ) : (
            !isPremium &&
            FREE_PHOTO_LIMIT <= 50 && (
              <span className="text-xs text-fg-faint">
                {t("upload.freeLimit", { n: FREE_PHOTO_LIMIT })}
              </span>
            )
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {frames.length === 0 ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="card flex h-52 w-full flex-col items-center justify-center gap-3 border-dashed text-fg-soft"
          >
            <PlusIcon className="h-8 w-8" />
            <span className="text-sm font-medium">{t("upload.empty.title")}</span>
            <span className="text-xs text-fg-faint">{t("upload.empty.sub")}</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {frames.map((f, i) => (
              <div
                key={f.id}
                className="card group relative overflow-hidden p-0"
                style={{ aspectRatio: "1 / 1" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt={`${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <button
                  onClick={() => removeFrame(f.id)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white"
                  aria-label={t("upload.del")}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/55 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => moveFrame(f.id, -1)}
                    disabled={i === 0}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-black disabled:opacity-30"
                    aria-label={t("upload.movePrev")}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveFrame(f.id, 1)}
                    disabled={i === frames.length - 1}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-black disabled:opacity-30"
                    aria-label={t("upload.moveNext")}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {!atLimit && (
              <button
                onClick={() => inputRef.current?.click()}
                className="card flex flex-col items-center justify-center gap-1 border-dashed text-fg-soft"
                style={{ aspectRatio: "1 / 1" }}
              >
                <PlusIcon className="h-6 w-6" />
                <span className="text-xs">{t("upload.add")}</span>
              </button>
            )}
          </div>
        )}

        {atLimit && (
          <p className="mt-2 rounded-xl bg-bg-soft px-3 py-2 text-center text-xs text-fg-soft">
            {t("upload.limitBanner", { n: FREE_PHOTO_LIMIT })}
          </p>
        )}
      </section>

      {/* Sticky next bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-md">
          <button
            onClick={onNext}
            disabled={frames.length < 2}
            className="btn btn-primary w-full"
          >
            {frames.length < 2 ? t("upload.needMore") : t("upload.next")}
            {frames.length >= 2 && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`card flex flex-col gap-1 p-3 text-left transition ${
        active ? "ring-2 ring-fg" : ""
      }`}
    >
      <span className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </span>
      <span className="text-xs text-fg-faint">{desc}</span>
    </button>
  );
}
