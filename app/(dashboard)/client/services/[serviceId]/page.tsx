"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ClientService, ServiceDataBlock, Automation } from "@/types";
import { ExternalLink, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const SERVICE_NAMES: Record<string, string> = {
  website_seo: "Website & SEO", chatbot: "Chatbot", phone_agent: "Phone Agent",
  automations: "Automations", social_media: "Social Media",
  email_outreach: "Email Outreach", app: "App", custom: "Custom",
};

interface CalendarPost {
  id: string;
  platform: string;
  post_type: string;
  description: string | null;
  scheduled_date: string;
  status: string;
}

const PLATFORMS: Record<string, { label: string; color: string }> = {
  instagram: { label: "IG", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  facebook: { label: "FB", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  linkedin: { label: "LI", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  x: { label: "X", color: "bg-gray-400/20 text-gray-300 border-gray-400/30" },
  youtube: { label: "YT", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  tiktok: { label: "TT", color: "bg-teal-400/20 text-teal-300 border-teal-400/30" },
};

function getWeekDays(ref: Date): Date[] {
  const d = new Date(ref);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) { const dd = new Date(d); dd.setDate(d.getDate() + i); days.push(dd); }
  return days;
}
function toDateStr(d: Date) { return d.toLocaleDateString("en-CA"); }
function estNow() { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })); }

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params.serviceId as string;
  const [service, setService] = useState<ClientService | null>(null);
  const [blocks, setBlocks] = useState<ServiceDataBlock[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [calendarPosts, setCalendarPosts] = useState<CalendarPost[]>([]);
  const [weekRef, setWeekRef] = useState(estNow());
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
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

      if (svc.service_type === "social_media") {
        const { data: calData } = await supabase
          .from("marketing_calendar")
          .select("*")
          .eq("client_id", svc.client_id)
          .order("scheduled_date");
        setCalendarPosts(calData || []);
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

          {/* Content Calendar - Read Only */}
          <div className="bg-otai-dark border border-otai-border rounded-xl mt-4 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-otai-border">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Calendar size={16} className="text-otai-purple" />
                Content Calendar
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d); }}
                  className="p-1.5 rounded-lg border border-otai-border text-otai-text-secondary hover:text-white transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-otai-text-secondary text-xs min-w-[140px] text-center">
                  {getWeekDays(weekRef)[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {getWeekDays(weekRef)[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <button onClick={() => { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d); }}
                  className="p-1.5 rounded-lg border border-otai-border text-otai-text-secondary hover:text-white transition-colors">
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => setWeekRef(estNow())} className="text-xs text-otai-purple hover:underline ml-1">Today</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-otai-border/30">
              {getWeekDays(weekRef).map((day) => {
                const dateStr = toDateStr(day);
                const isToday = dateStr === toDateStr(estNow());
                const dayPosts = calendarPosts.filter((p) => p.scheduled_date === dateStr);
                return (
                  <div key={dateStr} className={`bg-black min-h-[120px] flex flex-col ${isToday ? "ring-1 ring-inset ring-otai-purple/40" : ""}`}>
                    <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-otai-border/30">
                      <span className="text-[10px] text-otai-text-muted uppercase">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                      <span className={`text-xs font-medium ${isToday ? "text-otai-purple" : "text-white"}`}>{day.getDate()}</span>
                    </div>
                    <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                      {dayPosts.map((post) => {
                        const plat = PLATFORMS[post.platform] || PLATFORMS.x;
                        return (
                          <div
                            key={post.id}
                            onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                            className={`px-2 py-1.5 rounded-lg border text-[10px] cursor-pointer transition-colors ${plat.color} ${selectedPost?.id === post.id ? "ring-1 ring-white/30" : ""}`}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-bold">{plat.label}</span>
                              <span className="capitalize truncate">{post.post_type}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Post detail panel */}
            {selectedPost && (
              <div className="p-4 border-t border-otai-border bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs border font-medium ${(PLATFORMS[selectedPost.platform] || PLATFORMS.x).color}`}>
                    {(PLATFORMS[selectedPost.platform] || PLATFORMS.x).label} {selectedPost.platform}
                  </span>
                  <span className="text-white text-sm capitalize">{selectedPost.post_type}</span>
                  <span className="text-otai-text-muted text-xs ml-auto">
                    {new Date(selectedPost.scheduled_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </span>
                </div>
                {selectedPost.description && (
                  <p className="text-otai-text-secondary text-sm mt-2">{selectedPost.description}</p>
                )}
                <div className="mt-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                    selectedPost.status === "posted" ? "bg-otai-green/20 text-otai-green" :
                    selectedPost.status === "planned" ? "bg-otai-purple/20 text-otai-purple" :
                    "bg-otai-gold/20 text-otai-gold"
                  }`}>
                    {selectedPost.status === "posted" ? "Posted" : selectedPost.status === "planned" ? "Planned" : selectedPost.status}
                  </span>
                </div>
              </div>
            )}

            {calendarPosts.length === 0 && (
              <div className="p-8 text-center text-otai-text-muted text-sm">
                No content scheduled yet. Your marketing team will add posts here.
              </div>
            )}
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
