import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase/server";

async function verifyOwner() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const svc = createServiceRoleClient();
  const { data: profile } = await svc.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "owner") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await verifyOwner();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");
  const userId = searchParams.get("userId");

  // Load all non-owner profiles for selector
  if (view === "profiles") {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, username, display_name, role, status")
      .in("role", ["client", "sales_rep", "marketing"])
      .eq("status", "active")
      .order("display_name");
    return NextResponse.json({ profiles: data || [] });
  }

  // Load client mirror data
  if (view === "client" && userId) {
    const { data: client } = await supabase.from("clients").select("*").eq("user_id", userId).maybeSingle();
    if (!client) return NextResponse.json({ client: null, services: [], dataBlocks: [], updates: [] });

    const { data: services } = await supabase
      .from("client_services").select("*").eq("client_id", client.id).eq("status", "active").order("created_at");

    const svcList = services || [];
    let dataBlocks: Record<string, unknown>[] = [];
    if (svcList.length > 0) {
      const { data: blocks } = await supabase
        .from("service_data_blocks").select("*").in("client_service_id", svcList.map((s) => s.id)).order("display_order");
      dataBlocks = blocks || [];
    }

    const { data: updates } = await supabase
      .from("client_updates").select("*").eq("client_id", client.id).order("created_at", { ascending: false });

    const { data: calendarPosts } = await supabase
      .from("marketing_calendar").select("*").eq("client_id", client.id).order("scheduled_date");

    return NextResponse.json({ client, services: svcList, dataBlocks, updates: updates || [], calendarPosts: calendarPosts || [] });
  }

  // Load sales rep mirror data
  if (view === "sales_rep" && userId) {
    const { data: reports } = await supabase
      .from("sales_daily_reports").select("*").eq("sales_rep_id", userId).order("report_date", { ascending: false });
    return NextResponse.json({ reports: reports || [] });
  }

  // Load marketing mirror data
  if (view === "marketing" && userId) {
    const { data: assignments } = await supabase
      .from("marketing_client_assignments").select("client_id").eq("marketer_id", userId);
    const clientIds = (assignments || []).map((a) => a.client_id);

    let clients: Record<string, unknown>[] = [];
    let posts: Record<string, unknown>[] = [];
    if (clientIds.length > 0) {
      const { data: c } = await supabase.from("clients").select("id, company_name").in("id", clientIds);
      clients = c || [];
      const { data: p } = await supabase.from("marketing_calendar").select("*").in("client_id", clientIds).order("scheduled_date");
      posts = p || [];
    }
    const { data: otaiPosts } = await supabase.from("marketing_calendar").select("*").is("client_id", null).order("scheduled_date");

    return NextResponse.json({ clients, posts: [...posts, ...(otaiPosts || [])] });
  }

  return NextResponse.json({ error: "Unknown view" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const user = await verifyOwner();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { blockId, value } = await req.json();
  if (!blockId) return NextResponse.json({ error: "Missing blockId" }, { status: 400 });

  const { error } = await supabase
    .from("service_data_blocks")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("id", blockId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
