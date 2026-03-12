"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
export default function SalesSettings() {
  const [profile, setProfile] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("display_name, email, username").eq("id", user.id).maybeSingle();
      setProfile(p || {});
      setLoading(false);
    }
    load();
  }, []);
  if (loading) return <div className="text-otai-text-secondary">Loading...</div>;
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <div className="bg-otai-dark border border-otai-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
        <div className="space-y-4">
          {[{ label: "Display Name", value: profile.display_name }, { label: "Email", value: profile.email }, { label: "Username", value: profile.username }].map((f) => (
            <div key={f.label}><p className="text-otai-text-muted text-xs uppercase tracking-wide mb-1">{f.label}</p><p className="text-white">{f.value || "—"}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}
