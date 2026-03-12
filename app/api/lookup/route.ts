import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000; // 1 minute

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const serviceClient = getServiceClient();

  // Rate limit check
  const endpoint = "username_lookup";
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data: existing } = await serviceClient
    .from("rate_limits")
    .select("id, request_count, window_start")
    .eq("ip_address", ip)
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (existing) {
    const windowAge = Date.now() - new Date(existing.window_start).getTime();

    if (windowAge < WINDOW_MS) {
      if (existing.request_count >= MAX_REQUESTS) {
        return NextResponse.json(
          { error: "Too many requests. Try again in a minute." },
          { status: 429 }
        );
      }
      // Increment
      await serviceClient
        .from("rate_limits")
        .update({ request_count: existing.request_count + 1 })
        .eq("id", existing.id);
    } else {
      // Reset window
      await serviceClient
        .from("rate_limits")
        .update({ request_count: 1, window_start: new Date().toISOString() })
        .eq("id", existing.id);
    }
  } else {
    // First request
    await serviceClient.from("rate_limits").insert({
      ip_address: ip,
      endpoint,
      request_count: 1,
      window_start: new Date().toISOString(),
    });
  }

  // Do the lookup
  const body = await req.json();
  const { username } = body;

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("email")
    .eq("username", username.trim())
    .maybeSingle();

  if (error || !profile) {
    // Don't reveal whether username exists or not
    return NextResponse.json({ error: "Invalid credentials" }, { status: 404 });
  }

  return NextResponse.json({ email: profile.email });
}
