import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = getServiceClient();

    const [clientsRes, postsRes, marketersRes, assignmentsRes] = await Promise.all([
      supabase.from("clients").select("id, company_name, user_id, profiles!clients_user_id_fkey(display_name)").order("company_name"),
      supabase.from("marketing_calendar").select("*").order("scheduled_date"),
      supabase.from("profiles").select("id, display_name, email").eq("role", "marketing"),
      supabase.from("marketing_client_assignments").select("id, marketer_id, client_id"),
    ]);

    return NextResponse.json({
      clients: clientsRes.data || [],
      posts: postsRes.data || [],
      marketers: marketersRes.data || [],
      assignments: assignmentsRes.data || [],
    });
  } catch {
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { action, ...payload } = body;

    if (action === "assign") {
      const { error } = await supabase.from("marketing_client_assignments").insert({
        marketer_id: payload.marketer_id,
        client_id: payload.client_id,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "unassign") {
      const { error } = await supabase.from("marketing_client_assignments")
        .delete().eq("id", payload.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "add_post") {
      const { error } = await supabase.from("marketing_calendar").insert({
        client_id: payload.client_id,
        marketer_id: payload.marketer_id,
        platform: payload.platform,
        post_type: payload.post_type,
        scheduled_date: payload.scheduled_date,
        description: payload.description || null,
        status: "planned",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "update_post") {
      const { error } = await supabase.from("marketing_calendar").update({
        client_id: payload.client_id,
        platform: payload.platform,
        post_type: payload.post_type,
        scheduled_date: payload.scheduled_date,
        description: payload.description || null,
      }).eq("id", payload.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_post") {
      const { error } = await supabase.from("marketing_calendar").delete().eq("id", payload.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
