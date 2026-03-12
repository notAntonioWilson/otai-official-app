"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ClientService, ServiceDataBlock, Automation } from "@/types";
import { ExternalLink } from "lucide-react";

const SERVICE_NAMES: Record<string, string> = {
  website_seo: "Website & SEO", chatbot: "Chatbot", phone_agent: "Phone Agent",
  automations: "Automations", social_media: "Social Media",
  email_outreach: "Email Outreach", app: "App", custom: "Custom",
};

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params.serviceId as string;
  const [service, setService] = useState<ClientService | null>(null);
  const [blocks, setBlocks] = useState<ServiceDataBlock[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: svc } = await supabase
        .from("client_services")
        .select("*")
        .eq("id", serviceId)
        .maybeSingle();

      if (!svc) { setLoading(false); return; }
      setService(svc);

      const { data: db } = await supabase
        .from("service_data_blocks")
        .select("*")
        .eq("client_service_id", serviceId)
        .order("display_order");
      setBlocks(db || []);

      if (svc.service_type === "automations") {
        const { data: autos } = await supabase
          .from("automations")
          .select("*")
          .eq("client_id", svc.client_id)
          .order("created_at");
        setAutomations(autos || []);
      }

      setLoading(false);
    }
    load();
  }, [serviceId]);

  if (loading) return <div className="text-otai-text-secondary">Loading...</div>;
  if (!service) return <div className="text-otai-red">Service not found.</div>;

  const title = service.custom_service_name || SERVICE_NAMES[service.service_type] || service.service_type;
  const statBlocks = blocks.filter((b) => b.block_type === "stat_number" || b.block_type === "status_indicator");
  const textBlocks = blocks.filter((b) => b.block_type === "text_block");
  const linkBlocks = blocks.filter((b) => b.block_type === "link");

  const statusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-otai-green";
      case "paused": return "bg-gray-500";
      case "error": return "bg-otai-red";
      default: return "bg-gray-500";
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>

      {/* Links */}
      {linkBlocks.map((block) =>
        block.value ? (
          <a
            key={block.id}
            href={block.value.startsWith("http") ? block.value : `https://${block.value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-otai-purple hover:text-otai-purple-hover text-sm mb-6"
          >
            <ExternalLink size={14} />
            {block.label}: {block.value}
          </a>
        ) : null
      )}

      {/* Stat Cards */}
      {statBlocks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {statBlocks.map((block) => (
            <div
              key={block.id}
              className="bg-otai-dark border border-otai-border rounded-xl p-4"
            >
              <p className="text-otai-text-secondary text-xs mb-1">{block.label}</p>
              {block.block_type === "status_indicator" ? (
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${block.value === "active" ? "bg-otai-green" : "bg-gray-500"}`} />
                  <span className="text-white font-semibold capitalize">{block.value}</span>
                </div>
              ) : (
                <p className="text-white text-xl font-bold">{block.value || "0"}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Objective Text (chatbot) */}
      {service.objective_text && (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
          <h3 className="text-white font-semibold mb-2">Focus & Objectives</h3>
          <p className="text-otai-text-secondary text-sm">{service.objective_text}</p>
        </div>
      )}

      {/* Text Blocks */}
      {textBlocks.map((block) => (
        <div key={block.id} className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-4">
          <h3 className="text-white font-semibold mb-2">{block.label}</h3>
          <p className="text-otai-text-secondary text-sm">
            {block.value || "No data yet."}
          </p>
        </div>
      ))}

      {/* Automations List */}
      {service.service_type === "automations" && (
        <div className="space-y-3">
          {automations.length === 0 ? (
            <div className="bg-otai-dark border border-otai-border rounded-xl p-8 text-center">
              <p className="text-otai-text-secondary">No automations configured yet.</p>
            </div>
          ) : (
            automations.map((auto) => (
              <div key={auto.id} className="bg-otai-dark border border-otai-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">{auto.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColor(auto.status)}`} />
                    <span className="text-xs text-otai-text-secondary capitalize">{auto.status}</span>
                  </div>
                </div>
                {auto.description && (
                  <p className="text-otai-text-secondary text-sm">{auto.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Placeholder sections based on service type */}
      {service.service_type === "website_seo" && (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mt-4">
          <h3 className="text-white font-semibold mb-2">Keyword Rankings</h3>
          <p className="text-otai-text-muted text-sm">Rankings data will appear here.</p>
        </div>
      )}

      {service.service_type === "social_media" && (
        <>
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mt-4">
            <h3 className="text-white font-semibold mb-2">Platform Breakdown</h3>
            <p className="text-otai-text-muted text-sm">Per-platform metrics will appear here.</p>
          </div>
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mt-4">
            <h3 className="text-white font-semibold mb-2">Content Calendar</h3>
            <p className="text-otai-text-muted text-sm">Posted content will appear here.</p>
          </div>
        </>
      )}

      {service.service_type === "phone_agent" && (
        <>
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mt-4">
            <h3 className="text-white font-semibold mb-2">Call Summaries</h3>
            <p className="text-otai-text-muted text-sm">Recent call summaries will appear here.</p>
          </div>
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mt-4">
            <h3 className="text-white font-semibold mb-2">Call Topics</h3>
            <p className="text-otai-text-muted text-sm">Trending call topics will appear here.</p>
          </div>
        </>
      )}

      {service.service_type === "email_outreach" && (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mt-4">
          <h3 className="text-white font-semibold mb-2">Campaign Details</h3>
          <p className="text-otai-text-muted text-sm">Campaign performance details will appear here.</p>
        </div>
      )}

      {blocks.length === 0 && service.service_type !== "automations" && (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-8 text-center mt-4">
          <p className="text-otai-text-secondary">
            Data for this service will appear here once configured.
          </p>
        </div>
      )}
    </div>
  );
}
