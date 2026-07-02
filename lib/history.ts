// Anonymous generation history. Photos never leave the device; we only keep
// lightweight counters locally and send an anonymized event so the developer
// can see usage (per the spec's "생성 이력을 개발자에게 공유").

export interface GenerationRecord {
  format: string;
  frameCount: number;
  size: number;
  bytes: number;
}

const KEY = "morphoint.history.v1";

export function recordGeneration(rec: GenerationRecord): void {
  if (typeof window === "undefined") return;

  // Local rolling log (last 50).
  try {
    const prev: (GenerationRecord & { t: number })[] = JSON.parse(
      localStorage.getItem(KEY) ?? "[]",
    );
    prev.push({ ...rec, t: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(prev.slice(-50)));
  } catch {
    /* storage may be unavailable (private mode) — non-critical */
  }

  // Fire-and-forget anonymized event. No image data, no identifiers.
  try {
    const body = JSON.stringify({
      event: "generate",
      ...rec,
      ts: Date.now(),
    });
    navigator.sendBeacon?.("/api/track", body);
  } catch {
    /* analytics is best-effort */
  }

  // Mirror to GA4 when it's configured (see components/Analytics.tsx).
  try {
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
    };
    w.gtag?.("event", "generate", {
      format: rec.format,
      frame_count: rec.frameCount,
      size: rec.size,
    });
  } catch {
    /* analytics is best-effort */
  }
}

export function getLocalHistory(): (GenerationRecord & { t: number })[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
