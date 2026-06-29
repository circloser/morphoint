import { getSharesKV, type ShareMeta } from "@/lib/cf";

export const dynamic = "force-dynamic";

/** Serve a shared result's video (default) or poster image (?t=poster). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const kv = getSharesKV();
  if (!kv) return new Response("unavailable", { status: 503 });

  const isPoster = new URL(req.url).searchParams.get("t") === "poster";
  const immutable = "public, max-age=31536000, immutable";

  if (isPoster) {
    const buf = await kv.get(`p:${id}`, "arrayBuffer");
    if (!buf) return new Response("not found", { status: 404 });
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": immutable },
    });
  }

  const buf = await kv.get(`v:${id}`, "arrayBuffer");
  if (!buf) return new Response("not found", { status: 404 });

  const meta = (await kv.get(`m:${id}`, "json")) as ShareMeta | null;
  const type = meta?.format === "gif" ? "image/gif" : "video/mp4";
  return new Response(buf, {
    headers: {
      "content-type": type,
      "cache-control": immutable,
      "accept-ranges": "bytes",
    },
  });
}
