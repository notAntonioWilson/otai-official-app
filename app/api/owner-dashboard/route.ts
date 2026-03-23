import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const [financeRes, clientsRes] = await Promise.all([
      supabase.from("finance_entries").select("*").order("date", { ascending: false }).limit(50),
      supabase.from("clients").select("*, profiles!clients_user_id_fkey(display_name)").order("created_at", { ascending: false }),
    ]);
    return NextResponse.json({ finance: financeRes.data || [], clients: clientsRes.data || [] });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
