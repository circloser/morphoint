import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSharesKV, type ShareMeta } from "@/lib/cf";

export const dynamic = "force-dynamic";

// Localize the public share page from the visitor's Accept-Language header.
const PAGE_STRINGS = {
  ko: {
    titleNamed: (n: string) => `${n}님이 보낸 변화 영상 ✦ Morphoint`,
    titleAnon: "누군가 보낸 변화 영상 ✦ Morphoint",
    whoNamed: (n: string) => `${n}님이 보낸`,
    whoAnon: "누군가 보낸",
    suffix: "변화 영상",
    desc: "시간에 따라 변하는 순간을 자연스러운 영상으로. 나도 무료로 만들어 보세요.",
    sub: "시간에 따라 변하는 순간을 자연스럽게 이어 만든 영상이에요.",
    cta: "나도 무료로 만들기 →",
    footer:
      "사진 여러 장을 올리면 눈·코·입을 맞춰 자연스러운 영상으로 만들어 드려요. 모든 처리는 내 기기 안에서.",
  },
  en: {
    titleNamed: (n: string) => `A changing video from ${n} ✦ Morphoint`,
    titleAnon: "A changing video ✦ Morphoint",
    whoNamed: (n: string) => `${n} sent you`,
    whoAnon: "Someone sent you",
    suffix: "a changing video",
    desc: "Turn changing moments into a smooth video. Make your own for free.",
    sub: "A smooth video weaving together moments that change over time.",
    cta: "Make your own — free →",
    footer:
      "Upload several photos and we align the eyes into a smooth video. Everything runs on your device.",
  },
} as const;

async function getLang(): Promise<"ko" | "en"> {
  const h = await headers();
  return (h.get("accept-language") ?? "").toLowerCase().startsWith("ko")
    ? "ko"
    : "en";
}

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "morphoint.singlena.workers.dev";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

async function readMeta(id: string): Promise<ShareMeta | null> {
  const kv = getSharesKV();
  if (!kv) return null;
  return (await kv.get(`m:${id}`, "json")) as ShareMeta | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const meta = await readMeta(id);
  const base = await baseUrl();
  const s = PAGE_STRINGS[await getLang()];
  const title = meta?.name ? s.titleNamed(meta.name) : s.titleAnon;
  const description = s.desc;
  const poster = `${base}/api/media/${id}?t=poster`;
  const video = `${base}/api/media/${id}`;

  return {
    metadataBase: new URL(base),
    title,
    description,
    openGraph: {
      title,
      description,
      type: "video.other",
      images: [{ url: poster, width: 1080, height: 1080 }],
      videos: [{ url: video, type: "video/mp4" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [poster],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meta = await readMeta(id);
  if (!meta) notFound();

  const isGif = meta.format === "gif";
  const src = `/api/media/${id}`;
  const poster = `/api/media/${id}?t=poster`;
  const s = PAGE_STRINGS[await getLang()];
  const who = meta.name ? s.whoNamed(meta.name) : s.whoAnon;
  const heading = `${who} ${s.suffix}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10">
      <header className="flex items-center justify-center py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          ✦ Morphoint
        </Link>
      </header>

      <h1 className="px-1 text-center text-xl font-bold leading-snug">
        {heading}
      </h1>
      <p className="mx-auto mt-1 max-w-xs text-center text-sm text-fg-soft">
        {s.sub}
      </p>

      <div className="card mt-5 overflow-hidden p-0">
        {isGif ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={heading} className="w-full" />
        ) : (
          <video
            src={src}
            poster={poster}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="w-full"
            aria-label={heading}
          />
        )}
      </div>

      <Link href="/" className="btn btn-primary mt-6">
        {s.cta}
      </Link>
      <p className="mt-3 text-center text-xs text-fg-faint">{s.footer}</p>
    </main>
  );
}
