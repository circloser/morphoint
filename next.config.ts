import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by the OpenNext Cloudflare adapter when we run the Next build
  // ourselves (webpack) and bundle with --skipBuild.
  output: "standalone",
};

export default nextConfig;

// Enable Cloudflare bindings (e.g. env) during `next dev`. No-op in production.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
