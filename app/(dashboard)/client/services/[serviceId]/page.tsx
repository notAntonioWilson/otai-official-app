"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ClientService, ServiceDataBlock, Automation } from "@/types";
import {
  ExternalLink, ChevronLeft, ChevronRight, Calendar, Info,
  Globe, Smartphone, Monitor, TrendingUp, Users, MessageSquare,
  ThumbsUp, Share2, Eye, UserPlus, BarChart3,
} from "lucide-react";

const SERVICE_NAMES: Record<string, string> = {
  website_seo: "Website & SEO", chatbot: "Chatbot", phone_agent: "Phone Agent",
  automations: "Automations", social_media: "Social Media",
  email_outreach: "Email Outreach", app: "App", custom: "Custom",
};

// ===================== TOOLTIP =====================
function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="w-4 h-4 rounded-full border border-otai-text-muted/40 text-otai-text-muted text-[9px] flex items-center justify-center cursor-help">!</span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-otai-dark border border-otai-border rounded-lg text-xs text-otai-text-secondary z-50 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

// ===================== STAT CARD =====================
function StatCard({ label, value, sub, tip, color }: { label: string; value: string; sub?: string; tip?: string; color?: string }) {
  return (
    <div className="bg-otai-dark border border-otai-border rounded-xl p-4">
      <div className="flex items-center gap-1">
        <p className="text-otai-text-secondary text-xs">{label}</p>
        {tip && <Tip text={tip} />}
      </div>
      <p className={`text-xl font-bold mt-1 ${color || "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-otai-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

// ===================== DONUT CHART (SVG) =====================
function Donut({ value, max, color, size = 80 }: { value: number; max: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circ * (1 - pct);
  const scoreColor = value >= 90 ? "#22C55E" : value >= 50 ? "#F59E0B" : "#EF4444";
  const finalColor = color === "auto" ? scoreColor : color;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" className="text-otai-border" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={finalColor} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={finalColor} fontSize={size * 0.25} fontWeight="bold">{value}</text>
    </svg>
  );
}

// ===================== BAR =====================
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-otai-border/50 flex-1">
      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
  );
}

// ===================== MINI AREA CHART =====================
function MiniChart({ data, color, h = 60 }: { data: number[]; color: string; h?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 300;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4)}`).join(" ");
  const fill = pts + ` ${w},${h} 0,${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <polygon points={fill} fill={color} fillOpacity={0.1} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

// ===================== CALENDAR =====================
function getWeekDays(ref: Date): Date[] {
  const d = new Date(ref); d.setDate(d.getDate() - d.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) { const dd = new Date(d); dd.setDate(d.getDate() + i); days.push(dd); }
  return days;
}
function toDateStr(d: Date) { return d.toLocaleDateString("en-CA"); }
function estNow() { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })); }

const PLAT_COLORS: Record<string, string> = {
  instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  facebook: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  linkedin: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  x: "bg-gray-400/20 text-gray-300 border-gray-400/30",
  youtube: "bg-red-500/20 text-red-400 border-red-500/30",
  tiktok: "bg-teal-400/20 text-teal-300 border-teal-400/30",
};
const PLAT_LABELS: Record<string, string> = { instagram: "IG", facebook: "FB", linkedin: "LI", x: "X", youtube: "YT", tiktok: "TT" };

interface CalendarPost { id: string; platform: string; post_type: string; description: string | null; scheduled_date: string; status: string; media_url?: string | null; }

function ContentCalendar({ posts }: { posts: CalendarPost[] }) {
  const [weekRef, setWeekRef] = useState(estNow());
  const [sel, setSel] = useState<CalendarPost | null>(null);
  const weekDays = getWeekDays(weekRef);
  const todayStr = toDateStr(estNow());

  return (
    <div className="bg-otai-dark border border-otai-border rounded-xl mt-6 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-otai-border">
        <h3 className="text-white font-semibold flex items-center gap-2"><Calendar size={16} className="text-otai-purple" /> Content Calendar</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d); }} className="p-1.5 rounded-lg border border-otai-border text-otai-text-secondary hover:text-white"><ChevronLeft size={14} /></button>
          <span className="text-otai-text-secondary text-xs min-w-[140px] text-center">{weekDays[0].toLocaleDateString("en-US",{month:"short",day:"numeric"})} – {weekDays[6].toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
          <button onClick={() => { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d); }} className="p-1.5 rounded-lg border border-otai-border text-otai-text-secondary hover:text-white"><ChevronRight size={14} /></button>
          <button onClick={() => setWeekRef(estNow())} className="text-xs text-otai-purple hover:underline ml-1">Today</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-otai-border/30">
        {weekDays.map((day) => {
          const ds = toDateStr(day); const isToday = ds === todayStr;
          const dp = posts.filter((p) => p.scheduled_date === ds);
          return (
            <div key={ds} className={`bg-black min-h-[110px] flex flex-col ${isToday ? "ring-1 ring-inset ring-otai-purple/40" : ""}`}>
              <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-otai-border/30">
                <span className="text-[10px] text-otai-text-muted uppercase">{day.toLocaleDateString("en-US",{weekday:"short"})}</span>
                <span className={`text-xs font-medium ${isToday ? "text-otai-purple" : "text-white"}`}>{day.getDate()}</span>
              </div>
              <div className="flex-1 p-1 space-y-0.5 overflow-y-auto">
                {dp.map((post) => (
                  <div key={post.id} onClick={() => setSel(sel?.id === post.id ? null : post)}
                    className={`px-1.5 py-1 rounded border text-[9px] cursor-pointer ${PLAT_COLORS[post.platform] || PLAT_COLORS.x} ${sel?.id === post.id ? "ring-1 ring-white/30" : ""}`}>
                    <span className="font-bold">{PLAT_LABELS[post.platform] || "?"}</span> <span className="capitalize">{post.post_type}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {sel && (
        <div className="p-4 border-t border-otai-border bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-xs border font-medium ${PLAT_COLORS[sel.platform] || PLAT_COLORS.x}`}>{PLAT_LABELS[sel.platform]} {sel.platform}</span>
            <span className="text-white text-sm capitalize">{sel.post_type}</span>
            <span className="text-otai-text-muted text-xs ml-auto">{new Date(sel.scheduled_date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</span>
          </div>
          {sel.description && <p className="text-otai-text-secondary text-sm mt-2">{sel.description}</p>}
          {sel.media_url && (
            <div className="mt-3">
              {sel.media_url.match(/\.(mp4|mov|webm)$/i) ? (
                <video src={sel.media_url} className="w-full max-h-48 object-contain rounded-lg border border-otai-border" controls />
              ) : (
                <img src={sel.media_url} alt="Post media" className="w-full max-h-48 object-contain rounded-lg border border-otai-border" />
              )}
            </div>
          )}
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium mt-2 ${sel.status==="posted"?"bg-otai-green/20 text-otai-green":"bg-otai-purple/20 text-otai-purple"}`}>{sel.status==="posted"?"Posted":"Planned"}</span>
        </div>
      )}
      {posts.length === 0 && <div className="p-8 text-center text-otai-text-muted text-sm">No content scheduled yet. Your marketing team will add posts here.</div>}
    </div>
  );
}

// ===================== SECTION HEADER =====================
function SectionTitle({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color?: string }) {
  return (
    <h3 className={`text-lg font-semibold flex items-center gap-2 mt-8 mb-4 ${color || "text-white"}`}>
      <Icon size={18} className={color || "text-otai-purple"} /> {title}
    </h3>
  );
}

// ===================== MAIN PAGE =====================
export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params.serviceId as string;
  const [service, setService] = useState<ClientService | null>(null);
  const [blocks, setBlocks] = useState<ServiceDataBlock[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [calendarPosts, setCalendarPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: svc } = await supabase.from("client_services").select("*").eq("id", serviceId).maybeSingle();
      if (!svc) { setLoading(false); return; }
      setService(svc);
      const { data: db } = await supabase.from("service_data_blocks").select("*").eq("client_service_id", serviceId).order("display_order");
      setBlocks(db || []);
      if (svc.service_type === "automations") {
        const { data: autos } = await supabase.from("automations").select("*").eq("client_id", svc.client_id).order("created_at");
        setAutomations(autos || []);
      }
      if (svc.service_type === "social_media") {
        const { data: calData } = await supabase.from("marketing_calendar").select("*").eq("client_id", svc.client_id).order("scheduled_date");
        setCalendarPosts(calData || []);
      }
      setLoading(false);
    }
    load();
  }, [serviceId]);

  if (loading) return <div className="text-otai-text-secondary">Loading...</div>;
  if (!service) return <div className="text-otai-red">Service not found.</div>;

  const title = service.custom_service_name || SERVICE_NAMES[service.service_type] || service.service_type;

  // Parse JSON data from blocks
  const getBlock = (label: string) => blocks.find((b) => b.label === label);
  const getJson = (label: string) => {
    const b = getBlock(label);
    if (!b?.value) return null;
    try { return JSON.parse(b.value); } catch { return null; }
  };

  // ==================== WEBSITE & SEO ====================
  if (service.service_type === "website_seo") {
    const gsc = getJson("gsc_data") || {};
    const keywords = getJson("keyword_rankings") || [];
    const pagespeed = getJson("pagespeed") || {};
    const gbp = getJson("google_business") || {};
    const locations = getJson("top_locations") || [];
    const trendData = gsc.trend || [];

    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>

        {/* Google Search Console Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Clicks" value={gsc.clicks?.toLocaleString() || "—"} tip="How many times users clicked through to the website from Google search results." color="text-blue-400" />
          <StatCard label="Impressions" value={gsc.impressions?.toLocaleString() || "—"} tip="How many times the website appeared in Google search results." color="text-purple-400" />
          <StatCard label="Average CTR" value={gsc.ctr || "—"} tip="Click-through rate — the percentage of impressions that resulted in a click." color="text-emerald-400" />
          <StatCard label="Avg Position" value={gsc.position || "—"} tip="Average ranking position in Google search results. Lower is better." color="text-orange-400" />
        </div>

        {/* Search Performance Trend */}
        {trendData.length > 0 && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-otai-purple" /> Search Performance Trend</h3>
            <MiniChart data={trendData} color="#7C3AED" h={80} />
            <div className="flex items-center justify-between mt-2 text-[10px] text-otai-text-muted">
              <span>{gsc.trend_start || ""}</span><span>{gsc.trend_end || ""}</span>
            </div>
          </div>
        )}

        {/* Google Business Profile */}
        {gbp.profile_strength && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Globe size={14} className="text-otai-purple" /> Google Business Profile</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-otai-green/15 text-otai-green border border-otai-green/30">{gbp.profile_strength}</span>
              </div>
              <div className="text-sm text-otai-text-secondary"><span className="text-white font-medium">{gbp.interactions || 0}</span> customer interactions</div>
              <div className="text-sm text-otai-text-secondary"><span className="text-white font-medium">{gbp.posts || 0}</span> posts published</div>
            </div>
          </div>
        )}

        {/* Keyword Rankings */}
        {keywords.length > 0 && (
          <div className="bg-otai-dark border border-otai-border rounded-xl mb-6 overflow-hidden">
            <div className="p-5 border-b border-otai-border">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2"><BarChart3 size={14} className="text-otai-purple" /> Keyword Rankings<Tip text="Shows how your website ranks for specific search terms in Google." /></h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-otai-text-muted text-xs uppercase tracking-wide border-b border-otai-border/30">
                  <th className="p-3 text-left">Keyword</th><th className="p-3 text-right">Clicks</th><th className="p-3 text-right">Impressions</th><th className="p-3 text-right">CTR</th><th className="p-3 text-right">Position</th>
                </tr></thead>
                <tbody>
                  {keywords.slice(0, 10).map((kw: { query: string; clicks: number; impressions: number; ctr: string; position: number }, i: number) => (
                    <tr key={i} className="border-b border-otai-border/10 hover:bg-white/[0.02]">
                      <td className="p-3 text-white">{kw.query}</td>
                      <td className="p-3 text-right text-blue-400">{kw.clicks}</td>
                      <td className="p-3 text-right text-purple-400">{kw.impressions}</td>
                      <td className="p-3 text-right text-emerald-400">{kw.ctr}</td>
                      <td className="p-3 text-right"><span className={`${kw.position <= 10 ? "text-otai-green" : kw.position <= 30 ? "text-otai-gold" : "text-otai-red"}`}>{kw.position}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PageSpeed Insights */}
        {(pagespeed.mobile || pagespeed.desktop) && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><Monitor size={14} className="text-otai-purple" /> PageSpeed Insights<Tip text="Google's assessment of your website speed, accessibility, and SEO quality." /></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pagespeed.mobile && (
                <div>
                  <div className="flex items-center gap-2 mb-3"><Smartphone size={14} className="text-otai-text-muted" /><span className="text-sm text-otai-text-secondary font-medium">Mobile</span></div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {[["Performance", pagespeed.mobile.performance], ["Accessibility", pagespeed.mobile.accessibility], ["Best Practices", pagespeed.mobile.best_practices], ["SEO", pagespeed.mobile.seo]].map(([label, val]) => (
                      <div key={label as string} className="flex flex-col items-center gap-1">
                        <Donut value={val as number} max={100} color="auto" size={56} />
                        <span className="text-[10px] text-otai-text-muted">{label as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pagespeed.desktop && (
                <div>
                  <div className="flex items-center gap-2 mb-3"><Monitor size={14} className="text-otai-text-muted" /><span className="text-sm text-otai-text-secondary font-medium">Desktop</span></div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {[["Performance", pagespeed.desktop.performance], ["Accessibility", pagespeed.desktop.accessibility], ["Best Practices", pagespeed.desktop.best_practices], ["SEO", pagespeed.desktop.seo]].map(([label, val]) => (
                      <div key={label as string} className="flex flex-col items-center gap-1">
                        <Donut value={val as number} max={100} color="auto" size={56} />
                        <span className="text-[10px] text-otai-text-muted">{label as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Locations */}
        {locations.length > 0 && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Globe size={14} className="text-otai-purple" /> Top Traffic Locations</h3>
            <div className="space-y-3">
              {locations.slice(0, 3).map((loc: { country: string; pct: string }, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-white w-28 shrink-0">{loc.country}</span>
                  <Bar pct={parseFloat(loc.pct)} color="#7C3AED" />
                  <span className="text-sm text-otai-text-secondary w-12 text-right">{loc.pct}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback for blocks-based data */}
        {blocks.filter(b => !["gsc_data","keyword_rankings","pagespeed","google_business","top_locations"].includes(b.label)).length > 0 && blocks.filter(b => b.block_type === "stat_number" && !["gsc_data","keyword_rankings","pagespeed","google_business","top_locations"].includes(b.label)).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {blocks.filter(b => b.block_type === "stat_number" && !["gsc_data","keyword_rankings","pagespeed","google_business","top_locations"].includes(b.label)).map((b) => (
              <StatCard key={b.id} label={b.label} value={b.value || "0"} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==================== SOCIAL MEDIA ====================
  if (service.service_type === "social_media") {
    const overview = getJson("social_overview") || {};
    const fb = getJson("facebook_data") || {};
    const li = getJson("linkedin_data") || {};
    const ig = getJson("instagram_data") || {};

    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>

        {/* Overall Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Views" value={overview.total_views?.toLocaleString() || "—"} tip="Combined views across all social media platforms." />
          <StatCard label="Total Engagement" value={overview.total_engagement?.toLocaleString() || "—"} tip="Total likes, comments, shares and reactions across all platforms." />
          <StatCard label="Total Followers" value={overview.total_followers?.toLocaleString() || "—"} tip="Combined follower count across all platforms." />
          <StatCard label="Total Posts" value={overview.total_posts?.toLocaleString() || "—"} tip="Number of posts published across all platforms." />
        </div>

        {/* Content Calendar */}
        <ContentCalendar posts={calendarPosts} />

        {/* Top Performing Videos — all platforms */}
        {(ig.top_reels || []).length > 0 && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mt-6 mb-2">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><Eye size={14} className="text-otai-purple" /> Top Performing Videos</h3>
            <div className="space-y-2.5">
              {ig.top_reels.slice(0, 5).map((reel: { title: string; views: string }, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-otai-gold/20 text-otai-gold" : i === 1 ? "bg-gray-400/20 text-gray-300" : i === 2 ? "bg-orange-500/20 text-orange-400" : "bg-otai-border text-otai-text-muted"}`}>{i+1}</span>
                  <span className="text-sm text-white flex-1 truncate">{reel.title}</span>
                  <span className="text-sm font-semibold text-otai-purple">{reel.views}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- FACEBOOK ---- */}
        {fb.views !== undefined && (
          <>
            <SectionTitle icon={Eye} title="Facebook" color="text-blue-400" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatCard label="Total Views" value={fb.views?.toLocaleString() || "0"} color="text-blue-400" tip="Total video and reel views on Facebook." />
              <StatCard label="3-Second Views" value={fb.three_sec_views?.toLocaleString() || "0"} sub={fb.three_sec_change || ""} color="text-blue-400" tip="Views where someone watched at least 3 seconds." />
              <StatCard label="Engagement" value={fb.engagement?.toLocaleString() || "0"} sub={fb.engagement_change || ""} color="text-blue-400" tip="Total reactions, comments, and shares." />
              <StatCard label="Shares" value={fb.shares?.toLocaleString() || "0"} color="text-blue-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-otai-dark border border-otai-border rounded-xl p-4">
                <p className="text-xs text-otai-text-muted mb-2">Views by Content Type</p>
                {(fb.content_types || []).map((ct: { type: string; pct: string }, i: number) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-white w-16">{ct.type}</span>
                    <Bar pct={parseFloat(ct.pct)} color="#3B82F6" />
                    <span className="text-xs text-otai-text-muted w-12 text-right">{ct.pct}</span>
                  </div>
                ))}
              </div>
              <div className="bg-otai-dark border border-otai-border rounded-xl p-4">
                <p className="text-xs text-otai-text-muted mb-2">Engagement Breakdown</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="text-center"><ThumbsUp size={14} className="text-blue-400 mx-auto" /><p className="text-white text-sm font-medium mt-1">{fb.reactions?.toLocaleString()}</p><p className="text-[10px] text-otai-text-muted">Reactions</p></div>
                  <div className="text-center"><MessageSquare size={14} className="text-blue-400 mx-auto" /><p className="text-white text-sm font-medium mt-1">{fb.comments?.toLocaleString()}</p><p className="text-[10px] text-otai-text-muted">Comments</p></div>
                  <div className="text-center"><Share2 size={14} className="text-blue-400 mx-auto" /><p className="text-white text-sm font-medium mt-1">{fb.shares?.toLocaleString()}</p><p className="text-[10px] text-otai-text-muted">Shares</p></div>
                </div>
              </div>
              <div className="bg-otai-dark border border-otai-border rounded-xl p-4">
                <p className="text-xs text-otai-text-muted mb-2">Followers vs Non-Followers</p>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <Donut value={parseFloat(fb.non_followers_pct || "99")} max={100} color="#3B82F6" size={64} />
                  <div className="text-xs space-y-1">
                    <p><span className="text-blue-400 font-medium">{fb.non_followers_pct || "99%"}</span> Non-followers</p>
                    <p><span className="text-white font-medium">{fb.followers_pct || "1%"}</span> Followers</p>
                  </div>
                </div>
              </div>
            </div>
            {(fb.traffic_sources || []).length > 0 && (
              <div className="bg-otai-dark border border-otai-border rounded-xl p-4 mb-6">
                <p className="text-xs text-otai-text-muted mb-2">How People Find Your Content</p>
                {fb.traffic_sources.slice(0, 4).map((ts: { source: string; pct: string }, i: number) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-white w-16">{ts.source}</span>
                    <Bar pct={parseFloat(ts.pct)} color="#3B82F6" />
                    <span className="text-xs text-otai-text-muted w-12 text-right">{ts.pct}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---- LINKEDIN ---- */}
        {(li.business_followers !== undefined || li.personal_followers !== undefined) && (
          <>
            <SectionTitle icon={Users} title="LinkedIn" color="text-sky-400" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {li.business_followers !== undefined && <StatCard label="Business Followers" value={li.business_followers?.toLocaleString()} color="text-sky-400" />}
              {li.personal_followers !== undefined && <StatCard label="Personal Followers" value={li.personal_followers?.toLocaleString()} color="text-sky-400" />}
              {li.impressions !== undefined && <StatCard label="Impressions" value={li.impressions?.toLocaleString()} color="text-sky-400" tip="How many times your content was shown on LinkedIn." />}
              {li.reactions !== undefined && <StatCard label="Reactions" value={li.reactions?.toLocaleString()} color="text-sky-400" />}
            </div>
            {(li.comments !== undefined || li.reposts !== undefined) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {li.comments !== undefined && <StatCard label="Comments" value={li.comments?.toLocaleString()} color="text-sky-400" />}
                {li.reposts !== undefined && <StatCard label="Reposts" value={li.reposts?.toLocaleString()} color="text-sky-400" />}
              </div>
            )}
          </>
        )}

        {/* ---- INSTAGRAM (Last 90 Days) ---- */}
        {ig.followers !== undefined && (
          <>
            <SectionTitle icon={Eye} title="Instagram — Last 90 Days" color="text-pink-400" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatCard label="Followers" value={ig.followers?.toLocaleString()} sub={ig.followers_change || ""} color="text-pink-400" tip="Current Instagram follower count." />
              <StatCard label="Views" value={ig.views_90d?.toLocaleString() || "0"} color="text-pink-400" tip="Total views in the last 90 days." />
              <StatCard label="Interactions" value={ig.interactions_90d?.toLocaleString() || "0"} color="text-pink-400" tip="Total interactions in the last 90 days." />
              <StatCard label="Posts" value={ig.posts?.toLocaleString() || "0"} color="text-pink-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-otai-dark border border-otai-border rounded-xl p-4">
                <p className="text-xs text-otai-text-muted mb-2">Follower Growth</p>
                <div className="flex items-center gap-4">
                  <div><p className="text-white text-lg font-bold">{ig.growth_net || 0}</p><p className="text-[10px] text-otai-text-muted">Net Growth</p></div>
                  <div><p className="text-otai-green text-sm font-medium">+{ig.growth_follows || 0}</p><p className="text-[10px] text-otai-text-muted">Follows</p></div>
                  <div><p className="text-otai-red text-sm font-medium">-{ig.growth_unfollows || 0}</p><p className="text-[10px] text-otai-text-muted">Unfollows</p></div>
                </div>
              </div>
              <div className="bg-otai-dark border border-otai-border rounded-xl p-4">
                <p className="text-xs text-otai-text-muted mb-2">Audience Split</p>
                <div className="flex items-center gap-4">
                  <Donut value={parseFloat(ig.non_followers_views_pct || "99")} max={100} color="#EC4899" size={56} />
                  <div className="text-xs space-y-1">
                    <p><span className="text-pink-400 font-medium">{ig.non_followers_views_pct || "99%"}</span> Non-followers</p>
                    <p><span className="text-white font-medium">{ig.followers_views_pct || "1%"}</span> Followers</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Content Calendar already shown above */}
      </div>
    );
  }

  // ==================== CHATBOT ====================
  if (service.service_type === "chatbot") {
    const chatbot = getJson("chatbot_data") || {};
    const statBlocks = blocks.filter((b) => b.block_type === "stat_number");

    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        {chatbot.status_text && <p className="text-otai-green text-sm mb-6">{chatbot.status_text}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statBlocks.map((b) => <StatCard key={b.id} label={b.label} value={b.value || "0"} />)}
          {chatbot.leads !== undefined && !statBlocks.find(b => b.label === "Leads Captured") && <StatCard label="Leads Captured" value={chatbot.leads?.toString()} tip="Number of potential customers captured by the chatbot." />}
          {chatbot.total_interactions !== undefined && <StatCard label="Total Interactions" value={chatbot.total_interactions?.toLocaleString()} tip="Total conversations the chatbot has handled." />}
          {chatbot.unique_users !== undefined && <StatCard label="Unique Users" value={chatbot.unique_users?.toLocaleString()} tip="Number of different people who interacted with the chatbot." />}
        </div>

        {/* Intents */}
        {(chatbot.intents || []).length > 0 && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold text-sm mb-3">Intent Breakdown<Tip text="Shows what users are asking the chatbot about most frequently." /></h3>
            <div className="space-y-3">
              {chatbot.intents.map((intent: { name: string; count: number; color: string }, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-white w-32 shrink-0">{intent.name}</span>
                  <Bar pct={(intent.count / Math.max(...chatbot.intents.map((it: { count: number }) => it.count))) * 100} color={intent.color || "#7C3AED"} />
                  <span className="text-sm text-otai-text-muted w-8 text-right">{intent.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latency */}
        {(chatbot.latency_trend || []).length > 0 && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold text-sm mb-3">Response Latency<Tip text="How fast the chatbot responds to user messages. Lower is better." /></h3>
            <MiniChart data={chatbot.latency_trend} color="#3B82F6" h={60} />
          </div>
        )}

        {/* Interactions + Users trend */}
        {(chatbot.interactions_trend || []).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3">Interactions Over Time</h3>
              <MiniChart data={chatbot.interactions_trend} color="#7C3AED" h={60} />
            </div>
            {(chatbot.users_trend || []).length > 0 && (
              <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Unique Users Over Time</h3>
                <MiniChart data={chatbot.users_trend} color="#22C55E" h={60} />
              </div>
            )}
          </div>
        )}

        {service.objective_text && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-2">Focus & Objectives</h3>
            <p className="text-otai-text-secondary text-sm">{service.objective_text}</p>
          </div>
        )}
      </div>
    );
  }

  // ==================== GENERIC FALLBACK ====================
  const statBlocks = blocks.filter((b) => b.block_type === "stat_number" || b.block_type === "status_indicator");
  const textBlocks = blocks.filter((b) => b.block_type === "text_block");
  const linkBlocks = blocks.filter((b) => b.block_type === "link");
  const statusColor = (s: string) => s === "running" ? "bg-otai-green" : s === "error" ? "bg-otai-red" : "bg-gray-500";

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>
      {linkBlocks.map((b) => b.value ? (
        <a key={b.id} href={b.value.startsWith("http") ? b.value : `https://${b.value}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-otai-purple hover:text-otai-purple-hover text-sm mb-6"><ExternalLink size={14} />{b.label}: {b.value}</a>
      ) : null)}
      {statBlocks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statBlocks.map((b) => (
            <div key={b.id} className="bg-otai-dark border border-otai-border rounded-xl p-4">
              <p className="text-otai-text-secondary text-xs mb-1">{b.label}</p>
              {b.block_type === "status_indicator" ? (
                <div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${b.value === "active" ? "bg-otai-green" : "bg-gray-500"}`} /><span className="text-white font-semibold capitalize">{b.value}</span></div>
              ) : (<p className="text-white text-xl font-bold">{b.value || "0"}</p>)}
            </div>
          ))}
        </div>
      )}
      {service.objective_text && (<div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6"><h3 className="text-white font-semibold mb-2">Focus & Objectives</h3><p className="text-otai-text-secondary text-sm">{service.objective_text}</p></div>)}
      {textBlocks.map((b) => (<div key={b.id} className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-4"><h3 className="text-white font-semibold mb-2">{b.label}</h3><p className="text-otai-text-secondary text-sm">{b.value || "No data yet."}</p></div>))}
      {service.service_type === "automations" && (
        <div className="space-y-3">{automations.length === 0 ? (<div className="bg-otai-dark border border-otai-border rounded-xl p-8 text-center"><p className="text-otai-text-secondary">No automations configured yet.</p></div>) : automations.map((a) => (<div key={a.id} className="bg-otai-dark border border-otai-border rounded-xl p-4"><div className="flex items-center justify-between mb-2"><h3 className="text-white font-semibold">{a.name}</h3><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${statusColor(a.status)}`} /><span className="text-xs text-otai-text-secondary capitalize">{a.status}</span></div></div>{a.description && <p className="text-otai-text-secondary text-sm">{a.description}</p>}</div>))}</div>
      )}
      {blocks.length === 0 && service.service_type !== "automations" && (<div className="bg-otai-dark border border-otai-border rounded-xl p-8 text-center mt-4"><p className="text-otai-text-secondary">Data for this service will appear here once configured.</p></div>)}
    </div>
  );
}
