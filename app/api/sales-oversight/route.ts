import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const supabase = createServiceRoleClient();
  const body = await req.json();
  const { id, total_calls, total_answers, callbacks, send_info, bookings, owner_id, old_value } = body;

  if (!id) return NextResponse.json({ error: "Missing report id" }, { status: 400 });

  const { error } = await supabase
    .from("sales_daily_reports")
    .update({ total_calls, total_answers, callbacks, send_info, bookings, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_trail").insert({
    user_id: owner_id,
    action: "edit_data",
    target_table: "sales_daily_reports",
    target_id: id,
    old_value,
    new_value: { total_calls, total_answers, callbacks, send_info, bookings },
  });

  return NextResponse.json({ success: true });
}
