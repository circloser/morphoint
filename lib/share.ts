// Client helper: upload a finished result so it gets a permanent share URL.
// Only the *finished video* is uploaded — never the source photos — and only
// when the user explicitly chooses to create a share link.

export interface ShareResult {
  id: string;
  url: string;
}

export async function uploadShare(
  video: Blob,
  poster: Uint8Array,
  opts: { format: "mp4" | "gif"; name: string },
): Promise<ShareResult> {
  // Copy into a fresh ArrayBuffer-backed view (poster may be SAB-backed).
  const posterCopy = new Uint8Array(poster.byteLength);
  posterCopy.set(poster);

  const fd = new FormData();
  fd.append("video", video, `result.${opts.format}`);
  fd.append("poster", new Blob([posterCopy], { type: "image/png" }), "poster.png");
  fd.append("format", opts.format);
  fd.append("name", opts.name.slice(0, 40));

  const res = await fetch("/api/share", { method: "POST", body: fd });
  if (!res.ok) {
    const msg = await res
      .json()
      .then((d) => d.error as string)
      .catch(() => "");
    throw new Error(msg || "공유 링크를 만들지 못했어요.");
  }
  const { id } = (await res.json()) as { id: string };
  return { id, url: `${location.origin}/r/${id}` };
}
