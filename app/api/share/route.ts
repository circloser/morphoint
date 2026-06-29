import { NextResponse } from "next/server";
import {
  getSharesKV,
  SHARE_TTL_SECONDS,
  type ShareMeta,
} from "@/lib/cf";

export const dynamic = "force-dynamic";

// KV value limit is 25 MiB; keep a safety margin.
const MAX_VIDEO_BYTES = 24 * 1024 * 1024;

function shortId(): string {
  // 12 hex chars from a UUID — short, URL-safe, collision-unlikely.
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function POST(req: Request) {
  const kv = getSharesKV();
  if (!kv) {
    return NextResponse.json(
      { error: "공유 저장소를 사용할 수 없어요." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const video = form.get("video");
  const poster = form.get("poster");
  const format = form.get("format") === "gif" ? "gif" : "mp4";
  const name = (form.get("name") as string | null)?.slice(0, 40) ?? "";

  if (!(video instanceof Blob)) {
    return NextResponse.json({ error: "영상이 없어요." }, { status: 400 });
  }
  if (video.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "영상이 너무 커요. 화질이나 길이를 줄여 다시 시도해 주세요." },
      { status: 413 },
    );
  }

  const id = shortId();
  const meta: ShareMeta = { format, name, createdAt: Date.now() };
  const ttl = { expirationTtl: SHARE_TTL_SECONDS };

  await kv.put(`v:${id}`, await video.arrayBuffer(), ttl);
  if (poster instanceof Blob) {
    await kv.put(`p:${id}`, await poster.arrayBuffer(), ttl);
  }
  await kv.put(`m:${id}`, JSON.stringify(meta), ttl);

  return NextResponse.json({ id });
}
