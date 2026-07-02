"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { AlignMode, Frame, OutputSettings, Point } from "@/lib/types";
import { DEFAULT_SETTINGS, FREE_PHOTO_LIMIT } from "@/lib/types";
import {
  disposeFrame,
  fileToFrame,
  isSupportedImage,
} from "@/lib/imageUtils";
import { usePremium } from "@/lib/premium";
import { useI18n } from "@/lib/i18n";
import Stepper from "./Stepper";
import UploadStep from "./UploadStep";
import AlignStep from "./AlignStep";
import GenerateStep from "./GenerateStep";
import AdSlot from "./AdSlot";
import UpgradeSheet from "./UpgradeSheet";
import { CameraIcon, SparkIcon } from "./icons";

type Step = 0 | 1 | 2;

export default function MorphointApp() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [mode, setMode] = useState<AlignMode>("face");
  const [settings, setSettings] = useState<OutputSettings>(DEFAULT_SETTINGS);
  const [step, setStep] = useState<Step>(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [autoSorted, setAutoSorted] = useState(false);
  const { isPremium, setPremium } = usePremium();
  const { t, lang, setLang } = useI18n();
  // Once the user reorders by hand, stop re-sorting the whole list on add —
  // their explicit order wins over EXIF dates.
  const userReordered = useRef(false);

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list).filter(isSupportedImage);
      const room = isPremium ? Infinity : FREE_PHOTO_LIMIT - frames.length;
      const slice = files.slice(0, Math.max(0, room));
      const decoded: Frame[] = [];
      for (const file of slice) {
        try {
          decoded.push(await fileToFrame(file));
        } catch {
          // Unsupported/undecodable image (e.g. HEIC on desktop Chrome) — skip.
        }
      }
      if (decoded.length) {
        setFrames((prev) => {
          const merged = [...prev, ...decoded];
          if (userReordered.current) {
            // Respect the manual order; only sort the incoming batch.
            decoded.sort((a, b) => a.takenAt - b.takenAt);
            return [...prev, ...decoded];
          }
          merged.sort((a, b) => a.takenAt - b.takenAt);
          setAutoSorted(merged.length > 1);
          return merged;
        });
      }
    },
    [frames.length, isPremium],
  );

  const removeFrame = useCallback((id: string) => {
    setFrames((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) disposeFrame(target);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const moveFrame = useCallback((id: string, dir: -1 | 1) => {
    userReordered.current = true;
    setAutoSorted(false);
    setFrames((prev) => {
      const i = prev.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const setAnchors = useCallback((id: string, anchors: [Point, Point]) => {
    setFrames((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, anchors, aligned: true, faceFailed: false } : f,
      ),
    );
  }, []);

  const unlockPremium = () => {
    setPremium(true);
    setShowUpgrade(false);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      {/* Header */}
      <header className="sticky top-0 z-20 -mx-4 flex items-center justify-between bg-bg/85 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => setStep(0)}
          className="flex items-center gap-1.5 text-lg font-bold tracking-tight"
        >
          <SparkIcon className="h-5 w-5" />
          Morphoint
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            className="flex h-9 items-center rounded-full bg-bg-soft px-3 text-[13px] font-semibold"
            aria-label="Language"
          >
            {lang === "ko" ? "EN" : "한국어"}
          </button>
          <Link
            href="/capture"
            className="flex h-9 items-center gap-1.5 rounded-full bg-bg-soft px-3 text-[13px] font-semibold"
          >
            <CameraIcon className="h-4 w-4" /> {t("nav.capture")}
          </Link>
          {!isPremium && (
            <button
              onClick={() => setShowUpgrade(true)}
              className="flex h-9 items-center rounded-full bg-fg px-3 text-[13px] font-semibold text-white"
            >
              {t("nav.premium")}
            </button>
          )}
        </div>
      </header>

      <Stepper current={step} />

      {/* Intro shown only on the empty first step */}
      {step === 0 && frames.length === 0 && (
        <div className="animate-rise px-1 pb-4 pt-1 text-center">
          <h1 className="whitespace-pre-line text-2xl font-bold leading-snug tracking-tight">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-fg-soft">
            {t("hero.sub")}
          </p>
        </div>
      )}

      <main className="flex-1">
        {step === 0 && (
          <UploadStep
            frames={frames}
            mode={mode}
            setMode={setMode}
            addFiles={addFiles}
            removeFrame={removeFrame}
            moveFrame={moveFrame}
            onNext={() => setStep(1)}
            isPremium={isPremium}
            autoSorted={autoSorted}
          />
        )}
        {step === 1 && (
          <AlignStep
            frames={frames}
            mode={mode}
            setAnchors={setAnchors}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <GenerateStep
            frames={frames}
            settings={settings}
            setSettings={setSettings}
            isPremium={isPremium}
            onUpgrade={() => setShowUpgrade(true)}
            onBack={() => setStep(1)}
          />
        )}
      </main>

      {step === 0 && <AdSlot hidden={isPremium} />}

      <UpgradeSheet
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUnlock={unlockPremium}
      />
    </div>
  );
}
