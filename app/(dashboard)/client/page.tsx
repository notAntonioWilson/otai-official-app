"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ServiceDataBlock, ClientService } from "@/types";
import { BarChart3 } from "lucide-react";

const SERVICE_NAMES: Record<string, string> = {
  website_seo: "Website & SEO", chatbot: "Chatbot", phone_agent: "Phone Agent",
  automations: "Automations", social_media: "Social Media",
  email_outreach: "Email Outreach", app: "App", custom: "Custom",
};

interface DashboardBlock extends ServiceDataBlock {
  service_type: string;
  service_id: string;
}

export default function ClientDashboard() {
  const [displayName, setDisplayName] = useState("");
  const [blocks, setBlocks] = useState<DashboardBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(profile?.display_name || "");

      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!client) { setLoading(false); return; }

      const { data: services } = await supabase
        .from("client_services")
        .select("id, service_type")
        .eq("client_id", client.id)
        .eq("status", "active");

      if (services && services.length > 0) {
        const serviceIds = services.map((s) => s.id);
        const { data: dataBlocks } = await supabase
          .from("service_data_blocks")
          .select("*")
          .in("client_service_id", serviceIds)
          .eq("show_on_dashboard", true)
          .order("display_order");

        if (dataBlocks) {
          const enriched = dataBlocks.map((block) => {
            const svc = services.find((s) => s.id === block.client_service_id);
            return {
              ...block,
              service_type: svc?.service_type || "",
              service_id: svc?.id || "",
            };
          });
          setBlocks(enriched);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-otai-text-secondary">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-otai-text-secondary mt-1">
          Welcome back, {displayName || "Client"}
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <BarChart3 size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No data yet</p>
          <p className="text-otai-text-muted text-sm mt-1">
            Your dashboard metrics will appear here once data is available.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {blocks.map((block) => (
            <a
              key={block.id}
              href={`/client/services/${block.service_id}`}
              className="bg-otai-dark border border-otai-border rounded-xl p-4 hover:border-otai-purple/40 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-8 rounded-full bg-otai-purple" />
                <span className="text-xs text-otai-text-muted uppercase tracking-wide">
                  {SERVICE_NAMES[block.service_type] || block.service_type}
                </span>
              </div>
              <p className="text-otai-text-secondary text-xs mb-1">{block.label}</p>
              <p className="text-white text-xl font-bold">{block.value || "0"}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
