"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Globe, MessageSquare, Share2, Eye, TrendingUp,
  Users, BarChart3, Monitor, Smartphone, DollarSign,
  Briefcase, ChevronRight,
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

  // Look for impact data across all services
  let impact = null;
  for (const svc of services) {
    const d = getJson(svc.blocks, "dashboard_impact");
    if (d) { impact = d; break; }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-otai-text-secondary mt-1">Welcome back, {displayName || "Client"}</p>
      </div>

      {!hasData ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <BarChart3 size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No data yet</p>
        </div>
      ) : (
        <>
          {/* ===== IMPACT HIGHLIGHT ===== */}
          {impact && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {impact.revenue && (
            <div className="bg-gradient-to-br from-otai-green/10 to-otai-green/5 border border-otai-green/20 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-otai-green/15 flex items-center justify-center"><DollarSign size={20} className="text-otai-green" /></div>
                <div>
                  <p className="text-xs text-otai-green/70 uppercase tracking-wide">Revenue Generated</p>
                  <p className="text-3xl font-bold text-otai-green">{impact.revenue}</p>
                </div>
              </div>
              <p className="text-xs text-otai-text-muted">{impact.revenue_note || "Direct revenue from leads captured through your website and campaigns"}</p>
            </div>
            )}
            {impact.hire_requests && (
            <div className="bg-gradient-to-br from-otai-purple/10 to-otai-purple/5 border border-otai-purple/20 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-otai-purple/15 flex items-center justify-center"><Briefcase size={20} className="text-otai-purple" /></div>
                <div>
                  <p className="text-xs text-otai-purple/70 uppercase tracking-wide">Hire Requests</p>
                  <p className="text-3xl font-bold text-otai-purple">{impact.hire_requests}</p>
                </div>
              </div>
              <p className="text-xs text-otai-text-muted">{impact.hire_note || "Requests to hire via website and social media channels"}</p>
            </div>
            )}
          </div>
          )}

          {/* ===== SERVICE OVERVIEW CARDS ===== */}
          <div className="space-y-4">

            {/* Website & SEO */}
            {gsc && seo && (
              <a href={`/client/services/${seo.id}`} className="block bg-otai-dark border border-otai-border rounded-xl p-5 hover:border-otai-purple/30 transition-colors group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-8 rounded-full bg-otai-purple" />
                    <span className="text-sm font-semibold text-white">Website & SEO</span>
                  </div>
                  <ChevronRight size={16} className="text-otai-text-muted group-hover:text-otai-purple transition-colors" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
                  <div><p className="text-[11px] text-otai-text-muted">Clicks</p><p className="text-lg font-bold text-blue-400">{gsc.clicks?.toLocaleString()}</p></div>
                  <div><p className="text-[11px] text-otai-text-muted">Impressions</p><p className="text-lg font-bold text-purple-400">{gsc.impressions?.toLocaleString()}</p></div>
                  <div><p className="text-[11px] text-otai-text-muted">CTR</p><p className="text-lg font-bold text-emerald-400">{gsc.ctr}</p></div>
                  <div><p className="text-[11px] text-otai-text-muted">Avg Position</p><p className="text-lg font-bold text-orange-400">{gsc.position}</p></div>
                </div>
                {(pagespeed || gbp) && (
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-otai-border/30">
                    {pagespeed?.mobile && (
                      <div className="flex items-center gap-1.5">
                        <Smartphone size={12} className="text-otai-text-muted" />
                        <span className={`text-xs font-medium ${pagespeed.mobile.performance >= 90 ? "text-otai-green" : pagespeed.mobile.performance >= 50 ? "text-otai-gold" : "text-otai-red"}`}>{pagespeed.mobile.performance}</span>
                      </div>
                    )}
                    {pagespeed?.desktop && (
                      <div className="flex items-center gap-1.5">
                        <Monitor size={12} className="text-otai-text-muted" />
                        <span className={`text-xs font-medium ${pagespeed.desktop.performance >= 90 ? "text-otai-green" : pagespeed.desktop.performance >= 50 ? "text-otai-gold" : "text-otai-red"}`}>{pagespeed.desktop.performance}</span>
                      </div>
                    )}
                    {gbp && <span className="text-xs text-otai-green">{gbp.profile_strength}</span>}
                    <span className="text-xs text-otai-text-muted ml-auto">646 users</span>
                  </div>
                )}
              </a>
            )}

            {/* Social Media */}
            {overview && social && (
              <a href={`/client/services/${social.id}`} className="block bg-otai-dark border border-otai-border rounded-xl p-5 hover:border-pink-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-8 rounded-full bg-pink-500" />
                    <span className="text-sm font-semibold text-white">Social Media</span>
                  </div>
                  <ChevronRight size={16} className="text-otai-text-muted group-hover:text-pink-400 transition-colors" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mb-4">
                  <div><p className="text-[11px] text-otai-text-muted">Total Views</p><p className="text-lg font-bold text-white">{overview.total_views?.toLocaleString()}</p></div>
                  <div><p className="text-[11px] text-otai-text-muted">Engagement</p><p className="text-lg font-bold text-white">{overview.total_engagement?.toLocaleString()}</p></div>
                  <div><p className="text-[11px] text-otai-text-muted">Followers</p><p className="text-lg font-bold text-white">{overview.total_followers?.toLocaleString()}</p></div>
                  <div><p className="text-[11px] text-otai-text-muted">Posts</p><p className="text-lg font-bold text-white">{overview.total_posts?.toLocaleString()}</p></div>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-otai-border/30">
                  {fb && <span className="text-xs text-blue-400">FB {(fb.views / 1000000).toFixed(1)}M views</span>}
                  {li && <span className="text-xs text-sky-400">LI {((li.business_followers || 0) + (li.personal_followers || 0)).toLocaleString()} followers</span>}
                  {ig && <span className="text-xs text-pink-400">IG {ig.followers?.toLocaleString()} followers <span className="text-otai-green">{ig.followers_change}</span></span>}
                </div>
              </a>
            )}

            {/* Chatbot */}
            {chatbotData && chatbot && (
              <a href={`/client/services/${chatbot.id}`} className="block bg-otai-dark border border-otai-border rounded-xl p-5 hover:border-blue-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-8 rounded-full bg-blue-500" />
                    <span className="text-sm font-semibold text-white">Chatbot</span>
                  </div>
                  <ChevronRight size={16} className="text-otai-text-muted group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="grid grid-cols-3 gap-x-6">
                  <div><p className="text-[11px] text-otai-text-muted">Leads</p><p className="text-lg font-bold text-blue-400">{chatbotData.leads || 0}</p></div>
                  <div><p className="text-[11px] text-otai-text-muted">Interactions</p><p className="text-lg font-bold text-blue-400">{chatbotData.total_interactions?.toLocaleString() || 0}</p></div>
                  <div><p className="text-[11px] text-otai-text-muted">Users</p><p className="text-lg font-bold text-blue-400">{chatbotData.unique_users?.toLocaleString() || 0}</p></div>
                </div>
                <div className="mt-3 pt-3 border-t border-otai-border/30">
                  <p className="text-xs text-otai-green">{chatbotData.status_text}</p>
                </div>
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
