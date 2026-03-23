import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

async function getAuthUser() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "clients";

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "marketing") return NextResponse.json({ error: "Not a marketing user" }, { status: 403 });

  if (view === "clients") {
    const { data: assignments } = await supabase.from("marketing_client_assignments").select("client_id").eq("marketer_id", user.id);
    const clientIds = (assignments || []).map((a) => a.client_id);
    if (clientIds.length === 0) return NextResponse.json({ clients: [] });
    const { data: clients } = await supabase.from("clients").select("id, company_name, profiles!clients_user_id_fkey(display_name)").in("id", clientIds);
    return NextResponse.json({ clients: clients || [] });
  }

  if (view === "calendar") {
    const { data: assignments } = await supabase.from("marketing_client_assignments").select("client_id").eq("marketer_id", user.id);
    const clientIds = (assignments || []).map((a) => a.client_id);
    let clients: Record<string, unknown>[] = [];
    if (clientIds.length > 0) {
      const { data } = await supabase.from("clients").select("id, company_name, profiles!clients_user_id_fkey(display_name)").in("id", clientIds);
      clients = data || [];
    }
    let posts: Record<string, unknown>[] = [];
    if (clientIds.length > 0) {
      const { data } = await supabase.from("marketing_calendar").select("*").in("client_id", clientIds).order("scheduled_date");
      posts = data || [];
    }
    const { data: otaiPosts } = await supabase.from("marketing_calendar").select("*").eq("client_id", "otai").order("scheduled_date");
    return NextResponse.json({ clients: clients || [], posts: [...(posts || []), ...(otaiPosts || [])], userId: user.id });
  }

  if (view === "client_data") {
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
    const { data: metrics } = await supabase.from("social_media_metrics").select("*").eq("client_id", clientId).order("week_start", { ascending: false }).limit(20);
    const { data: folders } = await supabase.from("marketing_content_folders").select("*").eq("client_id", clientId);
    const { data: items } = await supabase.from("marketing_content_items").select("*").eq("client_id", clientId);
    return NextResponse.json({ metrics: metrics || [], folders: folders || [], items: items || [] });
  }

  return NextResponse.json({ error: "Unknown view" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServiceRoleClient();
  const body = await req.json();
  const { action, ...payload } = body;

  if (action === "add_post") {
    const { error } = await supabase.from("marketing_calendar").insert({ client_id: payload.client_id, marketer_id: user.id, platform: payload.platform, post_type: payload.post_type, scheduled_date: payload.scheduled_date, description: payload.description || null, media_url: payload.media_url || null, status: "planned" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }
  if (action === "update_post") {
    const updateData: Record<string, unknown> = { client_id: payload.client_id, platform: payload.platform, post_type: payload.post_type, scheduled_date: payload.scheduled_date, description: payload.description || null };
    if (payload.media_url !== undefined) updateData.media_url = payload.media_url || null;
    const { error } = await supabase.from("marketing_calendar").update(updateData).eq("id", payload.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }
  if (action === "delete_post") {
    const { error } = await supabase.from("marketing_calendar").delete().eq("id", payload.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }
  if (action === "create_folder") {
    const { error } = await supabase.from("marketing_content_folders").insert({ client_id: payload.client_id, parent_folder_id: payload.parent_folder_id || null, name: payload.name, created_by: user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }
  if (action === "create_item") {
    const { error } = await supabase.from("marketing_content_items").insert({ folder_id: payload.folder_id, client_id: payload.client_id, title: payload.title, content: payload.content || null, created_by: user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
