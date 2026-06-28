import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default OpenNext-on-Cloudflare config. Morphoint does almost everything on
// the client, so no incremental cache / R2 wiring is needed yet.
export default defineCloudflareConfig({});
