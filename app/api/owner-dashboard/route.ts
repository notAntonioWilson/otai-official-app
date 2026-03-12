import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

export async function GET() {
  const owner = await verifyOwner();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", owner.id)
    .maybeSingle();

  const { data: transactions } = await supabase
    .from("finance_transactions")
    .select("*")
    .order("date", { ascending: false });

  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, deal_value_monthly, status")
    .order("company_name");

  return NextResponse.json({
    display_name: profile?.display_name || "Owner",
    transactions: transactions || [],
    clients: clients || [],
  });
}
