"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Globe, MessageSquare, Share2, Eye, TrendingUp,
  Users, BarChart3, Monitor, Smartphone,
} from "lucide-react";

interface ServiceWithBlocks {
  id: string;
  service_type: string;
  blocks: { label: string; value: string }[];
}

function getJson(blocks: { label: string; value: string }[], label: string) {
  const b = blocks.find((bl) => bl.label === label);
  if (!b?.value) return null;
  try { return JSON.parse(b.value); } catch { return null; }
}

function DashCard({ label, value, sub, color, icon: Icon, href }: { label: string; value: string; sub?: string; color: string; icon: React.ElementType; href: string }) {
  return (
    <a href={href} className="bg-otai-dark border border-otai-border rounded-xl p-4 hover:border-otai-purple/30 transition-colors group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-otai-text-muted uppercase tracking-wide">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-otai-text-muted mt-1">{sub}</p>}
    </a>
  );
}

function SectionLabel({ text, color }: { text: string; color: string }) {
  return <div className={`flex items-center gap-2 mt-6 mb-3`}><div className={`w-1 h-5 rounded-full`} style={{ backgroundColor: color }} /><span className="text-sm font-semibold text-white">{text}</span></div>;
}

export default function ClientDashboard() {
  const [displayName, setDisplayName] = useState("");
  const [services, setServices] = useState<ServiceWithBlocks[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      setDisplayName(profile?.display_name || "");

      const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle();
      if (!client) { setLoading(false); return; }

      const { data: svcs } = await supabase.from("client_services").select("id, service_type").eq("client_id", client.id).eq("status", "active");
      if (!svcs || svcs.length === 0) { setLoading(false); return; }

      const serviceIds = svcs.map((s) => s.id);
      const { data: allBlocks } = await supabase.from("service_data_blocks").select("client_service_id, label, value").in("client_service_id", serviceIds);

      const enriched = svcs.map((s) => ({
        id: s.id,
        service_type: s.service_type,
        blocks: (allBlocks || []).filter((b) => b.client_service_id === s.id),
      }));
      setServices(enriched);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-otai-text-secondary">Loading dashboard...</div>;

  // Extract data from services
  const seo = services.find((s) => s.service_type === "website_seo");
  const social = services.find((s) => s.service_type === "social_media");
  const chatbot = services.find((s) => s.service_type === "chatbot");

  const gsc = seo ? getJson(seo.blocks, "gsc_data") : null;
  const pagespeed = seo ? getJson(seo.blocks, "pagespeed") : null;
  const gbp = seo ? getJson(seo.blocks, "google_business") : null;
  const overview = social ? getJson(social.blocks, "social_overview") : null;
  const fb = social ? getJson(social.blocks, "facebook_data") : null;
  const ig = social ? getJson(social.blocks, "instagram_data") : null;
  const li = social ? getJson(social.blocks, "linkedin_data") : null;
  const chatbotData = chatbot ? getJson(chatbot.blocks, "chatbot_data") : null;

  const hasData = gsc || overview || chatbotData;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-otai-text-secondary mt-1">Welcome back, {displayName || "Client"}</p>
      </div>

      {!hasData ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <BarChart3 size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No data yet</p>
          <p className="text-otai-text-muted text-sm mt-1">Your dashboard metrics will appear here once data is available.</p>
        </div>
      ) : (
        <>
          {/* ===== WEBSITE & SEO ===== */}
          {gsc && seo && (
            <>
              <SectionLabel text="Website & SEO" color="#7C3AED" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <DashCard label="Clicks" value={gsc.clicks?.toLocaleString()} color="text-blue-400" icon={TrendingUp} href={`/client/services/${seo.id}`} />
                <DashCard label="Impressions" value={gsc.impressions?.toLocaleString()} color="text-purple-400" icon={Eye} href={`/client/services/${seo.id}`} />
                <DashCard label="CTR" value={gsc.ctr} color="text-emerald-400" icon={TrendingUp} href={`/client/services/${seo.id}`} />
                <DashCard label="Avg Position" value={gsc.position} color="text-orange-400" icon={Globe} href={`/client/services/${seo.id}`} />
              </div>
              {(pagespeed || gbp) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {pagespeed?.mobile && <DashCard label="Mobile Speed" value={pagespeed.mobile.performance.toString()} sub={pagespeed.mobile.performance >= 90 ? "Great" : pagespeed.mobile.performance >= 50 ? "Needs Work" : "Poor"} color={pagespeed.mobile.performance >= 90 ? "text-otai-green" : pagespeed.mobile.performance >= 50 ? "text-otai-gold" : "text-otai-red"} icon={Smartphone} href={`/client/services/${seo.id}`} />}
                  {pagespeed?.desktop && <DashCard label="Desktop Speed" value={pagespeed.desktop.performance.toString()} sub={pagespeed.desktop.performance >= 90 ? "Great" : pagespeed.desktop.performance >= 50 ? "Needs Work" : "Poor"} color={pagespeed.desktop.performance >= 90 ? "text-otai-green" : pagespeed.desktop.performance >= 50 ? "text-otai-gold" : "text-otai-red"} icon={Monitor} href={`/client/services/${seo.id}`} />}
                  {gbp && <DashCard label="GBP Status" value={gbp.profile_strength} sub={`${gbp.interactions} interactions`} color="text-otai-green" icon={Globe} href={`/client/services/${seo.id}`} />}
                  <DashCard label="Total Users" value="646" color="text-white" icon={Users} href={`/client/services/${seo.id}`} />
                </div>
              )}
            </>
          )}

          {/* ===== SOCIAL MEDIA ===== */}
          {overview && social && (
            <>
              <SectionLabel text="Social Media" color="#EC4899" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <DashCard label="Total Views" value={overview.total_views?.toLocaleString()} color="text-pink-400" icon={Eye} href={`/client/services/${social.id}`} />
                <DashCard label="Engagement" value={overview.total_engagement?.toLocaleString()} color="text-pink-400" icon={TrendingUp} href={`/client/services/${social.id}`} />
                <DashCard label="Followers" value={overview.total_followers?.toLocaleString()} color="text-pink-400" icon={Users} href={`/client/services/${social.id}`} />
                <DashCard label="Posts" value={overview.total_posts?.toLocaleString()} color="text-pink-400" icon={Share2} href={`/client/services/${social.id}`} />
              </div>
              {/* Platform highlights */}
              <div className="grid grid-cols-3 gap-3 mt-3">
                {fb && (
                  <a href={`/client/services/${social.id}`} className="bg-otai-dark border border-otai-border rounded-xl p-4 hover:border-blue-500/30 transition-colors">
                    <span className="text-xs text-blue-400 font-medium">Facebook</span>
                    <p className="text-white text-lg font-bold mt-1">{(fb.views / 1000000).toFixed(1)}M</p>
                    <p className="text-xs text-otai-text-muted">views</p>
                  </a>
                )}
                {li && (
                  <a href={`/client/services/${social.id}`} className="bg-otai-dark border border-otai-border rounded-xl p-4 hover:border-sky-500/30 transition-colors">
                    <span className="text-xs text-sky-400 font-medium">LinkedIn</span>
                    <p className="text-white text-lg font-bold mt-1">{((li.business_followers || 0) + (li.personal_followers || 0)).toLocaleString()}</p>
                    <p className="text-xs text-otai-text-muted">total followers</p>
                  </a>
                )}
                {ig && (
                  <a href={`/client/services/${social.id}`} className="bg-otai-dark border border-otai-border rounded-xl p-4 hover:border-pink-500/30 transition-colors">
                    <span className="text-xs text-pink-400 font-medium">Instagram</span>
                    <p className="text-white text-lg font-bold mt-1">{ig.followers?.toLocaleString()}</p>
                    <p className="text-xs text-otai-text-muted">{ig.followers_change}</p>
                  </a>
                )}
              </div>
            </>
          )}

          {/* ===== CHATBOT ===== */}
          {chatbotData && chatbot && (
            <>
              <SectionLabel text="Chatbot" color="#3B82F6" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <DashCard label="Leads Captured" value={chatbotData.leads?.toString() || "0"} color="text-blue-400" icon={Users} href={`/client/services/${chatbot.id}`} />
                <DashCard label="Interactions" value={chatbotData.total_interactions?.toLocaleString() || "0"} color="text-blue-400" icon={MessageSquare} href={`/client/services/${chatbot.id}`} />
                <DashCard label="Unique Users" value={chatbotData.unique_users?.toLocaleString() || "0"} color="text-blue-400" icon={Users} href={`/client/services/${chatbot.id}`} />
              </div>
              <div className="mt-3 bg-otai-dark border border-otai-border rounded-xl p-4">
                <p className="text-otai-green text-sm">{chatbotData.status_text}</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
