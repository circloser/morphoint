"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CameraIcon, DownloadIcon } from "./icons";

/**
 * Camera with a semi-transparent overlay of a reference photo, so the next
 * shot can be framed to match the previous one (the "ghost guide" feature).
 */
export default function CaptureCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayUrlRef = useRef<string | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [overlay, setOverlay] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.4);
  const [error, setError] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  // (Re)start the stream whenever the facing mode changes.
  useEffect(() => {
    let active = true;
    (async () => {
      setError("");
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError(
          "카메라를 열 수 없어요. 브라우저 권한을 허용했는지 확인해주세요. (카메라는 https 또는 localhost에서만 동작해요)",
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [facing]);

  // Stop the camera when leaving the page.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (overlayUrlRef.current) URL.revokeObjectURL(overlayUrlRef.current);
    };
  }, []);

  const setOverlayUrl = (url: string) => {
    if (overlayUrlRef.current) URL.revokeObjectURL(overlayUrlRef.current);
    overlayUrlRef.current = url;
    setOverlay(url);
  };

  const pickReference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setOverlayUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (facing === "user") {
      // Un-mirror selfies so the saved photo matches what the user sees IRL.
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      // Use the fresh shot as the next overlay so a series stays aligned.
      setOverlayUrl(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `morphoint_${Date.now()}.png`;
      a.click();
    }, "image/png");
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium backdrop-blur">
          촬영 보조
        </span>
        <button
          onClick={() =>
            setFacing((f) => (f === "user" ? "environment" : "user"))
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur"
          aria-label="카메라 전환"
        >
          <CameraIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Camera viewport */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
        />
        {overlay && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={overlay}
            alt="가이드"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{
              opacity,
              transform: facing === "user" ? "scaleX(-1)" : undefined,
            }}
          />
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-white/80">
            {error}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-20 space-y-4 bg-black/60 p-5 pb-8 backdrop-blur">
        <div className="flex items-center gap-3 text-sm">
          <span className="w-16 shrink-0 text-white/70">가이드</span>
          <input
            type="range"
            min={0}
            max={0.85}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="flex-1 accent-white"
            disabled={!overlay}
          />
        </div>

        <div className="flex items-center justify-between">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickReference}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold"
          >
            가이드 사진
          </button>

          <button
            onClick={capture}
            className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white"
            aria-label="촬영"
          >
            <span className="h-14 w-14 rounded-full bg-white transition active:scale-90" />
          </button>

          <button
            onClick={capture}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold"
          >
            <DownloadIcon className="h-4 w-4" /> 저장
          </button>
        </div>
        <p className="text-center text-xs text-white/50">
          찍은 사진이 다음 가이드로 겹쳐져요. 같은 구도로 이어 찍어보세요.
        </p>
      </div>
    </div>
  );
}
