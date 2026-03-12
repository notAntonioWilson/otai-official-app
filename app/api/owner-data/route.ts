import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyOwner() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "owner") return null;
  return user;
}

// Allowed tables the owner can query through this endpoint
const ALLOWED_TABLES = [
  "profiles", "clients", "client_services", "service_data_blocks",
  "client_updates", "finance_transactions", "automations",
  "automation_activity", "automation_queue", "automation_errors",
  "audit_trail", "crm_leads", "crm_activity_log", "crm_files",
  "marketing_calendar", "marketing_client_assignments",
  "marketing_content_folders", "marketing_content_items",
  "social_media_metrics", "sales_daily_reports", "sales_commission_page",
  "courses", "course_modules", "course_lessons", "course_progress",
  "webhooks", "roles",
];

export async function POST(req: NextRequest) {
  const owner = await verifyOwner();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, table, data, match, order, limit, select } = body;

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const supabase = getServiceClient();

  if (action === "select") {
    let query = supabase.from(table).select(select || "*");
    if (match) {
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value as string);
      });
    }
    if (order) {
      query = query.order(order.column, { ascending: order.ascending ?? true });
    }
    if (limit) {
      query = query.limit(limit);
    }
    const { data: result, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: result });
  }

  if (action === "insert") {
    const { error } = await supabase.from(table).insert(data);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "update") {
    if (!match) return NextResponse.json({ error: "match required for update" }, { status: 400 });
    let query = supabase.from(table).update(data);
    Object.entries(match).forEach(([key, value]) => {
      query = query.eq(key, value as string);
    });
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    if (!match) return NextResponse.json({ error: "match required for delete" }, { status: 400 });
    let query = supabase.from(table).delete();
    Object.entries(match).forEach(([key, value]) => {
      query = query.eq(key, value as string);
    });
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
