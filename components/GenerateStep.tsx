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
import { uploadShare } from "@/lib/share";
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeft,
  DownloadIcon,
  FilmIcon,
  ShareIcon,
  SparkIcon,
} from "./icons";

type Phase = "setup" | "rendering" | "encoding" | "done" | "error";

const SPEED_PRESETS = {
  slow: { holdSec: 0.45, transitionSec: 0.7 },
  normal: { holdSec: 0.25, transitionSec: 0.45 },
  fast: { holdSec: 0.12, transitionSec: 0.28 },
} as const;
type SpeedKey = keyof typeof SPEED_PRESETS;

const TRANSITIONS: TransitionType[] = ["dissolve", "fade", "slide", "cut"];

const ASPECTS: { key: AspectKey; premium: boolean }[] = [
  { key: "1:1", premium: false },
  { key: "4:5", premium: true },
  { key: "9:16", premium: true },
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
  const [result, setResult] = useState<{
    url: string;
    blob: Blob;
    format: "mp4" | "gif";
  } | null>(null);
  const { t } = useI18n();
  const [error, setError] = useState<string>("");
  const [speed, setSpeed] = useState<SpeedKey>("normal");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const resultRef = useRef<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Share-link state (uploads only the finished video, on explicit action).
  const posterRef = useRef<Uint8Array | null>(null);
  const [senderName, setSenderName] = useState("");
  const [sharePhase, setSharePhase] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

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
      // Stash a representative frame as the share/social poster.
      posterRef.current = render.frames[Math.floor(render.frames.length / 2)];
      setResult({ url, blob, format: effective.format });
      setSharePhase("idle");
      setShareUrl("");
      setPhase("done");
      recordGeneration({
        format: effective.format,
        frameCount: frames.length,
        size: effective.size,
        bytes: blob.size,
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t("gen.error"));
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
          text: "Morphoint ✦",
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

  const createShareLink = async () => {
    if (!result || !posterRef.current) return;
    setSharePhase("uploading");
    try {
      const { url } = await uploadShare(result.blob, posterRef.current, {
        format: result.format,
        name: senderName.trim(),
      });
      setShareUrl(url);
      setSharePhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("share.fail"));
      setSharePhase("error");
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const shareLink = async () => {
    if (!shareUrl) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Morphoint",
          text: senderName.trim()
            ? `${senderName.trim()} ✦ Morphoint`
            : "Morphoint ✦",
          url: shareUrl,
        });
        return;
      } catch {
        /* cancelled */
      }
    }
    copyLink();
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
            {phase === "rendering" ? t("gen.rendering") : t("gen.encoding")}
          </p>
          <p className="mt-1 text-sm text-fg-faint">{t("gen.privacy")}</p>
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
        <h2 className="pt-2 text-xl font-semibold">{t("gen.done")}</h2>
        <div className="card mx-auto max-w-sm overflow-hidden p-0">
          {settings.format === "gif" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.url} alt="" className="w-full" />
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

        {/* Share link — uploads only the finished video, on explicit action. */}
        <div className="card mx-auto max-w-sm space-y-3 p-4 text-left">
          {sharePhase !== "done" ? (
            <>
              <div>
                <p className="text-sm font-semibold">{t("share.make")}</p>
                <p className="mt-0.5 text-xs text-fg-faint">
                  {t("share.makeDesc")}
                </p>
              </div>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder={t("share.namePh")}
                maxLength={40}
                className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-fg"
              />
              <button
                onClick={createShareLink}
                disabled={sharePhase === "uploading"}
                className="btn btn-ghost w-full"
              >
                {sharePhase === "uploading" ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-fg border-t-transparent" />
                    {t("share.making")}
                  </>
                ) : (
                  <>{t("share.makeBtn")}</>
                )}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">{t("share.ready")}</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-bg-soft px-3 py-2.5 text-xs"
                />
                <button onClick={copyLink} className="btn btn-ghost shrink-0 px-3">
                  {copied ? t("share.copied") : t("share.copy")}
                </button>
              </div>
              <button onClick={shareLink} className="btn btn-primary w-full">
                <ShareIcon className="h-4 w-4" /> {t("share.shareBtn")}
              </button>
            </>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-md gap-2">
            <button onClick={download} className="btn btn-ghost flex-1">
              <DownloadIcon className="h-4 w-4" /> {t("gen.save")}
            </button>
            <button onClick={share} className="btn btn-primary flex-1">
              <ShareIcon className="h-4 w-4" /> {t("gen.share")}
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
          {t("gen.again")}
        </button>
      </div>
    );
  }

  // ---- Setup view ----
  return (
    <div className="animate-rise space-y-5 pb-28">
      <Section title={t("gen.speed")}>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(SPEED_PRESETS) as SpeedKey[]).map((k) => (
            <Pill key={k} active={speed === k} onClick={() => setSpeed(k)}>
              {t(`gen.speed.${k}`)}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title={t("gen.transition")}>
        <div className="grid grid-cols-2 gap-2">
          {TRANSITIONS.map((tr) => (
            <Pill
              key={tr}
              active={settings.transition === tr}
              onClick={() => setSettings({ ...settings, transition: tr })}
            >
              {t(`tr.${tr}`)}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title={t("gen.format")}>
        <div className="grid grid-cols-2 gap-2">
          <Pill
            active={settings.format === "mp4"}
            onClick={() => setSettings({ ...settings, format: "mp4" })}
          >
            {t("fmt.mp4")}
          </Pill>
          <Pill
            active={settings.format === "gif"}
            onClick={() => setSettings({ ...settings, format: "gif" })}
          >
            {t("fmt.gif")}
          </Pill>
        </div>
      </Section>

      <Section title={t("gen.aspect")}>
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
                {t(`asp.${a.key}`)}
                {locked ? " 🔒" : ""}
              </Pill>
            );
          })}
        </div>
        {!isPremium && (
          <p className="text-xs text-fg-faint">{t("gen.aspect.note")}</p>
        )}
      </Section>

      <Section title={t("gen.quality")}>
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

      <Section title={t("gen.music")}>
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
              {t("music.add")}
              <span className="block text-xs text-fg-faint">
                {t("music.add.desc")}
              </span>
            </span>
            <span className="chip chip-active">{t("premium.chip")}</span>
          </button>
        ) : settings.format === "gif" ? (
          <p className="rounded-xl bg-bg-soft px-3 py-2 text-xs text-fg-soft">
            {t("music.gifNote")}
          </p>
        ) : audioFile ? (
          <div className="card flex items-center justify-between p-3.5">
            <span className="truncate text-sm font-medium">🎵 {audioFile.name}</span>
            <button
              onClick={() => setAudioFile(null)}
              className="ml-2 shrink-0 text-sm font-medium text-fg-soft underline underline-offset-2"
            >
              {t("upload.del")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => audioInputRef.current?.click()}
            className="card flex w-full items-center justify-center gap-2 p-3.5 text-sm font-medium text-fg-soft"
          >
            {t("music.pick")}
          </button>
        )}
      </Section>

      <Section title={t("gen.options")}>
        <label className="card flex items-center justify-between p-3.5">
          <span className="text-sm font-medium">
            {t("opt.pingpong")}
            <span className="block text-xs text-fg-faint">
              {t("opt.pingpong.desc")}
            </span>
          </span>
          <Toggle
            on={settings.pingPong}
            onChange={(v) => setSettings({ ...settings, pingPong: v })}
          />
        </label>
        <label className="card flex items-center justify-between p-3.5">
          <span className="text-sm font-medium">
            {t("opt.normalize")}
            <span className="block text-xs text-fg-faint">
              {t("opt.normalize.desc")}
            </span>
          </span>
          <Toggle
            on={settings.normalize}
            onChange={(v) => setSettings({ ...settings, normalize: v })}
          />
        </label>
        <label className="card flex items-center justify-between p-3.5">
          <span className="text-sm font-medium">
            {t("opt.dates")}
            <span className="block text-xs text-fg-faint">
              {t("opt.dates.desc")}
            </span>
          </span>
          <Toggle
            on={settings.showDates}
            onChange={(v) => setSettings({ ...settings, showDates: v })}
          />
        </label>
        <label className="card flex items-center justify-between p-3.5">
          <span className="text-sm font-medium">
            {t("opt.watermark")}
            <span className="block text-xs text-fg-faint">
              {isPremium ? t("opt.watermark.on") : t("opt.watermark.off")}
            </span>
          </span>
          {isPremium ? (
            <Toggle
              on={!settings.watermark}
              onChange={(v) => setSettings({ ...settings, watermark: !v })}
            />
          ) : (
            <button onClick={onUpgrade} className="chip chip-active">
              {t("premium.chip")}
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
            <SparkIcon className="h-4 w-4" /> {t("gen.make")}
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
