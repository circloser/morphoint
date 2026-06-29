import { getCloudflareContext } from "@opennextjs/cloudflare";

// Minimal shape of the Workers KV binding we use, so we don't depend on the
// full @cloudflare/workers-types package.
export interface KVLike {
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  get(key: string, type: "json"): Promise<unknown | null>;
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | string,
    opts?: { expirationTtl?: number; metadata?: unknown },
  ): Promise<void>;
}

/** The SHARES KV namespace, or null if bindings aren't available (e.g. build). */
export function getSharesKV(): KVLike | null {
  try {
    const env = getCloudflareContext().env as unknown as { SHARES?: KVLike };
    return env.SHARES ?? null;
  } catch {
    return null;
  }
}

/** Shared-result metadata stored alongside the media. */
export interface ShareMeta {
  format: "mp4" | "gif";
  name: string;
  createdAt: number;
}

// Auto-expire shared results after 60 days to keep storage bounded.
export const SHARE_TTL_SECONDS = 60 * 24 * 60 * 60;
