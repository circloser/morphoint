"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AspectKey,
  Frame,
  OutputSettings,
  TransitionType,
} from "@/lib/types";
import { renderTimeline } from "@/lib/render";
import { encode } from "@/lib/encode";
import { recordGeneration } from "@/lib/history";
import {
  ArrowLeft,
  DownloadIcon,
  FilmIcon,
  ShareIcon,
  SparkIcon,
} from "./icons";

type Phase = "setup" | "rendering" | "encoding" | "done" | "error";

const SPEED_PRESETS = {
  느리게: { holdSec: 0.45, transitionSec: 0.7 },
  보통: { holdSec: 0.25, transitionSec: 0.45 },
  빠르게: { holdSec: 0.12, transitionSec: 0.28 },
} as const;
type SpeedKey = keyof typeof SPEED_PRESETS;

const TRANSITIONS: { key: TransitionType; label: string }[] = [
  { key: "dissolve", label: "디졸브" },
  { key: "fade", label: "페이드" },
  { key: "slide", label: "슬라이드" },
  { key: "cut", label: "컷(전환없음)" },
];

const ASPECTS: { key: AspectKey; label: string; premium: boolean }[] = [
  { key: "1:1", label: "정사각형", premium: false },
  { key: "4:5", label: "세로 4:5", premium: true },
  { key: "9:16", label: "세로 9:16", premium: true },
];

export default function GenerateStep({
  frames,
  settings,
  setSettings,
  isPremium,
  onUpgrade,
  onBack,
}: {
  frames: Frame[];
  settings: OutputSettings;
  setSettings: (s: OutputSettings) => void;
  isPremium: boolean;
  onUpgrade: () => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [renderP, setRenderP] = useState(0);
  const [encodeP, setEncodeP] = useState(0);
  const [result, setResult] = useState<{ url: string; blob: Blob } | null>(
    null,
  );
  const [error, setError] = useState<string>("");
  const [speed, setSpeed] = useState<SpeedKey>("보통");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const resultRef = useRef<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    };
  }, []);

  const generate = async () => {
    setError("");
    setRenderP(0);
    setEncodeP(0);
    setPhase("rendering");
    try {
      const effective: OutputSettings = {
        ...settings,
        ...SPEED_PRESETS[speed],
        // Premium-only perks: fall back to safe defaults for free users.
        watermark: isPremium ? settings.watermark : true,
        aspect: isPremium ? settings.aspect : "1:1",
      };
      const render = await renderTimeline(frames, effective, setRenderP);
      setPhase("encoding");
      let audio: { bytes: Uint8Array; ext: string } | undefined;
      if (isPremium && audioFile && effective.format === "mp4") {
        const buf = await audioFile.arrayBuffer();
        const ext = audioFile.name.split(".").pop()?.toLowerCase() || "mp3";
        audio = { bytes: new Uint8Array(buf), ext };
      }
      const blob = await encode(render, effective, setEncodeP, audio);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult({ url, blob });
      setPhase("done");
      recordGeneration({
        format: effective.format,
        frameCount: frames.length,
        size: effective.size,
        bytes: blob.size,
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했어요.");
      setPhase("error");
    }
  };

  const filename = `morphoint.${settings.format}`;

  const share = async () => {
    if (!result) return;
    const file = new File([result.blob], filename, { type: result.blob.type });
    const navAny = navigator as Navigator & {
      canShare?: (d: { files?: File[] }) => boolean;
    };
    if (navAny.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Morphoint",
          text: "Morphoint로 만든 변화 영상 ✦",
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    // No file-share support → download instead.
    download();
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = filename;
    a.click();
  };

  // ---- Progress view ----
  if (phase === "rendering" || phase === "encoding") {
    const pct =
      phase === "rendering"
        ? Math.round(renderP * 45)
        : 45 + Math.round(encodeP * 55);
    return (
      <div className="animate-rise flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="relative h-20 w-20">
          <FilmIcon className="h-20 w-20 text-fg" />
          <span className="absolute inset-0 animate-ping rounded-full bg-fg/5" />
        </div>
        <div>
          <p className="text-lg font-semibold">
            {phase === "rendering" ? "장면을 엮는 중…" : "영상으로 굽는 중…"}
          </p>
          <p className="mt-1 text-sm text-fg-faint">
            기기 안에서 처리돼요. 사진은 어디에도 올라가지 않아요.
          </p>
        </div>
        <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-bg-soft">
          <div
            className="h-full rounded-full bg-fg transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-medium tabular-nums">{pct}%</span>
      </div>
    );
  }

  // ---- Result view ----
  if (phase === "done" && result) {
    return (
      <div className="animate-rise space-y-5 pb-28 text-center">
        <h2 className="pt-2 text-xl font-semibold">완성됐어요 ✦</h2>
        <div className="card mx-auto max-w-sm overflow-hidden p-0">
          {settings.format === "gif" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.url} alt="결과" className="w-full" />
          ) : (
            <video
              src={result.url}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="w-full"
            />
          )}
        </div>
        <p className="text-xs text-fg-faint">
          {(result.blob.size / 1024 / 1024).toFixed(1)}MB ·{" "}
          {settings.format.toUpperCase()} · {settings.size}px
        </p>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-md gap-2">
            <button onClick={download} className="btn btn-ghost flex-1">
              <DownloadIcon className="h-4 w-4" /> 저장
            </button>
            <button onClick={share} className="btn btn-primary flex-1">
              <ShareIcon className="h-4 w-4" /> 공유
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setPhase("setup");
            setResult(null);
          }}
          className="text-sm font-medium text-fg-soft underline underline-offset-4"
        >
          설정 바꿔서 다시 만들기
        </button>
      </div>
    );
  }

  // ---- Setup view ----
  return (
    <div className="animate-rise space-y-5 pb-28">
      <Section title="속도">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(SPEED_PRESETS) as SpeedKey[]).map((k) => (
            <Pill key={k} active={speed === k} onClick={() => setSpeed(k)}>
              {k}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="전환 효과">
        <div className="grid grid-cols-2 gap-2">
          {TRANSITIONS.map((tr) => (
            <Pill
              key={tr.key}
              active={settings.transition === tr.key}
              onClick={() => setSettings({ ...settings, transition: tr.key })}
            >
              {tr.label}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="형식">
        <div className="grid grid-cols-2 gap-2">
          <Pill
            active={settings.format === "mp4"}
            onClick={() => setSettings({ ...settings, format: "mp4" })}
          >
            MP4 (영상)
          </Pill>
          <Pill
            active={settings.format === "gif"}
            onClick={() => setSettings({ ...settings, format: "gif" })}
          >
            GIF (움짤)
          </Pill>
        </div>
      </Section>

      <Section title="비율">
        <div className="grid grid-cols-3 gap-2">
          {ASPECTS.map((a) => {
            const locked = a.premium && !isPremium;
            return (
              <Pill
                key={a.key}
                active={settings.aspect === a.key}
                onClick={() =>
                  locked
                    ? onUpgrade()
                    : setSettings({ ...settings, aspect: a.key })
                }
              >
                {a.label}
                {locked ? " 🔒" : ""}
              </Pill>
            );
          })}
        </div>
        {!isPremium && (
          <p className="text-xs text-fg-faint">
            세로형(릴스·쇼츠·틱톡)은 프리미엄에서 풀려요.
          </p>
        )}
      </Section>

      <Section title="화질">
        <div className="grid grid-cols-3 gap-2">
          {[480, 720, 1080].map((s) => {
            const locked = s === 1080 && !isPremium;
            return (
              <Pill
                key={s}
                active={settings.size === s}
                onClick={() =>
                  locked ? onUpgrade() : setSettings({ ...settings, size: s })
                }
              >
                {s}p{locked ? " 🔒" : ""}
              </Pill>
            );
          })}
        </div>
      </Section>

      <Section title="배경 음악">
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            setAudioFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {!isPremium ? (
          <button onClick={onUpgrade} className="card flex w-full items-center justify-between p-3.5">
            <span className="text-sm font-medium">
              내 음악 넣기
              <span className="block text-xs text-fg-faint">
                MP4에 좋아하는 곡을 입혀요 (프리미엄)
              </span>
            </span>
            <span className="chip chip-active">🔒 프리미엄</span>
          </button>
        ) : settings.format === "gif" ? (
          <p className="rounded-xl bg-bg-soft px-3 py-2 text-xs text-fg-soft">
            GIF에는 소리가 없어요. MP4를 선택하면 음악을 넣을 수 있어요.
          </p>
        ) : audioFile ? (
          <div className="card flex items-center justify-between p-3.5">
            <span className="truncate text-sm font-medium">🎵 {audioFile.name}</span>
            <button
              onClick={() => setAudioFile(null)}
              className="ml-2 shrink-0 text-sm font-medium text-fg-soft underline underline-offset-2"
            >
              제거
            </button>
          </div>
        ) : (
          <button
            onClick={() => audioInputRef.current?.click()}
            className="card flex w-full items-center justify-center gap-2 p-3.5 text-sm font-medium text-fg-soft"
          >
            + 음악 파일 선택
          </button>
        )}
      </Section>

      <Section title="옵션">
        <label className="card flex items-center justify-between p-3.5">
          <span className="text-sm font-medium">
            왕복 재생
            <span className="block text-xs text-fg-faint">
              끝까지 갔다가 처음으로 부드럽게 (루프에 좋아요)
            </span>
          </span>
          <Toggle
            on={settings.pingPong}
            onChange={(v) => setSettings({ ...settings, pingPong: v })}
          />
        </label>
        <label className="card flex items-center justify-between p-3.5">
          <span className="text-sm font-medium">
            워터마크 제거
            <span className="block text-xs text-fg-faint">
              {isPremium ? "프리미엄 사용 중" : "프리미엄에서 풀려요"}
            </span>
          </span>
          {isPremium ? (
            <Toggle
              on={!settings.watermark}
              onChange={(v) => setSettings({ ...settings, watermark: !v })}
            />
          ) : (
            <button onClick={onUpgrade} className="chip chip-active">
              🔒 프리미엄
            </button>
          )}
        </label>
      </Section>

      {error && (
        <p className="rounded-xl bg-bg-soft px-3 py-2 text-sm text-fg-soft">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-md gap-2">
          <button onClick={onBack} className="btn btn-ghost px-4">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button onClick={generate} className="btn btn-primary flex-1">
            <SparkIcon className="h-4 w-4" /> 영상 만들기
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-fg-soft">{title}</h2>
      {children}
    </section>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-11 rounded-full text-sm font-semibold transition ${
        active
          ? "bg-fg text-white"
          : "bg-bg-soft text-fg-soft hover:bg-bg-sunken"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition ${
        on ? "bg-fg" : "bg-bg-sunken"
      }`}
      role="switch"
      aria-checked={on}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
