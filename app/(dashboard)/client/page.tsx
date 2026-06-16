"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Globe, MessageSquare, Share2, Eye, TrendingUp,
  Users, BarChart3, Monitor, Smartphone, DollarSign,
  Briefcase, ChevronRight, UserPlus, ShoppingBag,
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

// ===================== COMPACT NUMBER FORMAT =====================
function fmtCompact(n: number): string {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  const stripZeros = (s: string) => s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  if (abs >= 1_000_000) return stripZeros((n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)) + "M";
  if (abs >= 1_000) return stripZeros((n / 1_000).toFixed(abs >= 100_000 ? 0 : 1)) + "K";
  return n.toLocaleString();
}

// ===================== MINI SEGMENT DONUT =====================
interface Seg { value: number; color: string }
function MiniDonut({ segments, size = 64, label }: { segments: Seg[]; size?: number; label: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + (x.value > 0 ? x.value : 0), 0);
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" className="text-otai-border" strokeWidth={6} />
        {total > 0 && segments.map((seg, i) => {
          if (seg.value <= 0) return null;
          const dash = circ * (seg.value / total);
          const offset = -acc; acc += dash;
          return <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.color} strokeWidth={6}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={offset} transform={`rotate(-90 ${size/2} ${size/2})`} />;
        })}
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={size * 0.22} fontWeight="bold">{fmtCompact(total)}</text>
      </svg>
      <span className="text-[10px] text-otai-text-muted">{label}</span>
    </div>
  );
}

// ===================== SPARKLINE AREA =====================
function Spark({ data, color, w = 240, h = 48 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  const fill = `${pts} ${w},${h} 0,${h}`;
  const gid = `sg-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: h }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <polygon points={fill} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PC = { facebook: "#3B82F6", linkedin: "#2DD4BF", instagram: "#EC4899", tiktok: "#F5F5F5", youtube: "#EF4444" };
function segArr(b?: { facebook?: number; linkedin?: number; instagram?: number; tiktok?: number; youtube?: number }): Seg[] {
  return [
    { value: b?.facebook || 0, color: PC.facebook },
    { value: b?.linkedin || 0, color: PC.linkedin },
    { value: b?.instagram || 0, color: PC.instagram },
    { value: b?.tiktok || 0, color: PC.tiktok },
    { value: b?.youtube || 0, color: PC.youtube },
  ];
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
  // Website/SEO-only clients store leads in a social_overview block inside the website_seo service.
  const seoOverview = seo ? getJson(seo.blocks, "social_overview") : null;
  const leadsOverview = overview || seoOverview;
  const leadsHref = social ? social.id : (seo ? seo.id : null);
  const fb = social ? getJson(social.blocks, "facebook_data") : null;
  const ig = social ? getJson(social.blocks, "instagram_data") : null;
  const li = social ? getJson(social.blocks, "linkedin_data") : null;
  const tt = social ? getJson(social.blocks, "tiktok_data") : null;
  const yt = social ? getJson(social.blocks, "youtube_data") : null;
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
                  <p className="text-xs text-otai-green/70 uppercase tracking-wide">Potential Revenue Generated</p>
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

            {/* Leads (social or website) — shown above service cards */}
            {leadsOverview && leadsHref && leadsOverview.leads !== undefined && leadsOverview.leads !== null && (
              <a href={`/client/services/${leadsHref}`} className="block bg-gradient-to-br from-otai-green/10 to-otai-green/[0.03] border border-otai-green/20 rounded-xl p-5 hover:border-otai-green/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-otai-green/15 flex items-center justify-center shrink-0"><UserPlus size={20} className="text-otai-green" /></div>
                  <div className="flex-1">
                    <p className="text-xs text-otai-green/70 uppercase tracking-wide">{leadsOverview.leads_label || "Leads Generated via Social"}</p>
                    <p className="text-2xl font-bold text-otai-green leading-none mt-0.5">{(() => {
                      const raw = leadsOverview.leads;
                      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.]/g, ""));
                      return Number.isFinite(n) && String(raw).match(/^[0-9,]+$/) ? n.toLocaleString() : String(raw);
                    })()}</p>
                  </div>
                  <ChevronRight size={16} className="text-otai-text-muted group-hover:text-otai-green transition-colors" />
                </div>
              </a>
            )}

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

                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                  {/* Trend graph */}
                  {(gsc.trend || []).length > 1 && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-otai-text-muted">
                        <TrendingUp size={12} className="text-otai-purple" /> Search Performance
                      </div>
                      <Spark data={gsc.trend} color="#7C3AED" w={320} h={56} />
                      <div className="flex items-center justify-between text-[10px] text-otai-text-muted mt-1">
                        <span>{gsc.trend_start || ""}</span><span>{gsc.trend_end || ""}</span>
                      </div>
                    </div>
                  )}
                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 lg:w-[260px] shrink-0">
                    <div><p className="text-[11px] text-otai-text-muted">Clicks</p><p className="text-lg font-bold text-blue-400">{gsc.clicks?.toLocaleString()}</p></div>
                    <div><p className="text-[11px] text-otai-text-muted">Impressions</p><p className="text-lg font-bold text-purple-400">{gsc.impressions?.toLocaleString()}</p></div>
                    <div><p className="text-[11px] text-otai-text-muted">CTR</p><p className="text-lg font-bold text-emerald-400">{gsc.ctr}</p></div>
                    <div><p className="text-[11px] text-otai-text-muted">Avg Position</p><p className="text-lg font-bold text-orange-400">{gsc.position}</p></div>
                  </div>
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

                {(() => {
                  const vb = overview.views_breakdown, eb = overview.engagement_breakdown, fob = overview.followers_breakdown;
                  const hasBreak = (vb || eb || fob);
                  const intTotal = overview.total_interactions ?? overview.total_engagement;
                  if (hasBreak) {
                    return (
                      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                        {vb && <MiniDonut segments={segArr(vb)} label="Views" />}
                        {eb && <MiniDonut segments={segArr(eb)} label="Engagement" />}
                        {fob && <MiniDonut segments={segArr(fob)} label="Followers" />}
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-2xl font-bold text-otai-purple leading-none h-16 flex items-center">{intTotal !== undefined ? fmtCompact(intTotal) : "—"}</span>
                          <span className="text-[10px] text-otai-text-muted">Interactions</span>
                        </div>
                        <div className="flex items-center gap-3 ml-auto flex-wrap">
                          {(vb?.facebook || eb?.facebook || fob?.facebook) ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PC.facebook }} /><span className="text-[10px] text-otai-text-muted">Facebook</span></span> : null}
                          {(vb?.linkedin || eb?.linkedin || fob?.linkedin) ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PC.linkedin }} /><span className="text-[10px] text-otai-text-muted">LinkedIn</span></span> : null}
                          {(vb?.instagram || eb?.instagram || fob?.instagram) ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PC.instagram }} /><span className="text-[10px] text-otai-text-muted">Instagram</span></span> : null}
                          {(vb?.tiktok || eb?.tiktok || fob?.tiktok) ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-otai-border" style={{ backgroundColor: PC.tiktok }} /><span className="text-[10px] text-otai-text-muted">TikTok</span></span> : null}
                          {(vb?.youtube || eb?.youtube || fob?.youtube) ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PC.youtube }} /><span className="text-[10px] text-otai-text-muted">YouTube</span></span> : null}
                        </div>
                      </div>
                    );
                  }
                  // Fallback: flat stats (pre-migration data)
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
                      <div><p className="text-[11px] text-otai-text-muted">Total Views</p><p className="text-lg font-bold text-white">{overview.total_views?.toLocaleString()}</p></div>
                      <div><p className="text-[11px] text-otai-text-muted">Engagement</p><p className="text-lg font-bold text-white">{overview.total_engagement?.toLocaleString()}</p></div>
                      <div><p className="text-[11px] text-otai-text-muted">Followers</p><p className="text-lg font-bold text-white">{overview.total_followers?.toLocaleString()}{overview.followers_gained !== undefined && overview.followers_gained !== null ? <span className="text-otai-green text-xs font-semibold ml-1.5">+{Number(overview.followers_gained).toLocaleString()}</span> : null}</p></div>
                      <div><p className="text-[11px] text-otai-text-muted">Interactions</p><p className="text-lg font-bold text-otai-purple">{intTotal?.toLocaleString()}</p></div>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-3 pt-3 mt-4 border-t border-otai-border/30 flex-wrap">
                  {fb && fb.views !== undefined && <span className="text-xs text-blue-400">FB {fmtCompact(fb.views)} views</span>}
                  {li && (() => {
                    const liFollowers = (li.personal?.followers ?? li.personal_followers ?? 0) + (li.business?.followers ?? li.business_followers ?? 0);
                    return liFollowers > 0 ? <span className="text-xs text-teal-400">LI {liFollowers.toLocaleString()} followers</span> : null;
                  })()}
                  {ig && <span className="text-xs text-pink-400">IG {ig.followers?.toLocaleString()} followers <span className="text-otai-green">{ig.followers_change}</span></span>}
                  {tt && (tt.views !== undefined || tt.followers !== undefined) && <span className="text-xs text-white">TT {tt.followers !== undefined ? `${tt.followers?.toLocaleString()} followers` : `${tt.views?.toLocaleString()} views`}</span>}
                  {yt && (yt.subscribers !== undefined || yt.views !== undefined) && <span className="text-xs text-red-500">YT {yt.subscribers !== undefined ? `${yt.subscribers?.toLocaleString()} subs` : `${fmtCompact(yt.views)} views`}</span>}
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

            {overview && social && overview.affiliate_sales !== undefined && overview.affiliate_sales !== null && (
              <a href={`/client/services/${social.id}`} className="block bg-gradient-to-br from-amber-500/10 to-amber-500/[0.03] border border-amber-500/20 rounded-xl p-5 hover:border-amber-500/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0"><ShoppingBag size={20} className="text-amber-400" /></div>
                  <div className="flex-1">
                    <p className="text-xs text-amber-400/70 uppercase tracking-wide">{overview.affiliate_sales_label || "Affiliate Sales Generated"}</p>
                    <p className="text-2xl font-bold text-amber-400 leading-none mt-0.5">{(() => {
                      const raw = overview.affiliate_sales;
                      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.]/g, ""));
                      return Number.isFinite(n) && String(raw).match(/^[0-9,]+$/) ? n.toLocaleString() : String(raw);
                    })()}</p>
                  </div>
                  <ChevronRight size={16} className="text-otai-text-muted group-hover:text-amber-400 transition-colors" />
                </div>
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
