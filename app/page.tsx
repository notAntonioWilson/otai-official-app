import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "owner") redirect("/owner");
    if (profile?.role === "marketing") redirect("/marketing");
    if (profile?.role === "sales_rep") redirect("/sales");
    if (profile?.role === "client") redirect("/client");
  }

  redirect("/login");
}
