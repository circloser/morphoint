import { NextRequest, NextResponse } from "next/server";

// Anonymous usage events. Logged to the server console (visible in Vercel logs)
// so the developer can observe generation activity without any image data or
// personal identifiers. Swap in a real datastore later if needed.
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log("[morphoint:track]", JSON.stringify(data));
  } catch {
    // Ignore malformed events — tracking must never break the client.
  }
  return NextResponse.json({ ok: true });
}
