"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ClientSettings() {
  const [profile, setProfile] = useState<Record<string, string | null>>({});
  const [company, setCompany] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, email, username")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(p || {});

      const { data: c } = await supabase
        .from("clients")
        .select("company_name, industry, phone, preferred_contact")
        .eq("user_id", user.id)
        .maybeSingle();
      setCompany(c || {});
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-otai-text-secondary">Loading...</div>;

  const fields = [
    { label: "Display Name", value: profile.display_name },
    { label: "Email", value: profile.email },
    { label: "Username", value: profile.username },
    { label: "Company", value: company.company_name },
    { label: "Industry", value: company.industry },
    { label: "Phone", value: company.phone },
    { label: "Preferred Contact", value: company.preferred_contact },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <div className="bg-otai-dark border border-otai-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.label}>
              <p className="text-otai-text-muted text-xs uppercase tracking-wide mb-1">
                {field.label}
              </p>
              <p className="text-white">{field.value || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
