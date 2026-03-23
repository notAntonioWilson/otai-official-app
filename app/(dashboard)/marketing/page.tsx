"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Trash2,
  Loader2, Check, AlertCircle, ChevronDown,
} from "lucide-react";

interface CalendarPost {
  id: string;
  client_id: string;
  marketer_id: string;
  platform: string;
  post_type: string;
  description: string | null;
  scheduled_date: string;
  status: string;
}

interface ClientOption {
  id: string;
  company_name: string;
  display_name: string;
}

const PLATFORMS = [
  { value: "instagram", label: "IG", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { value: "facebook", label: "FB", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "linkedin", label: "LI", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  { value: "x", label: "X", color: "bg-gray-400/20 text-gray-300 border-gray-400/30" },
  { value: "youtube", label: "YT", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "tiktok", label: "TT", color: "bg-teal-400/20 text-teal-300 border-teal-400/30" },
];

const POST_TYPES = ["Reel", "Post", "Story", "Carousel", "Video", "Article"];

function getPlatformStyle(platform: string) {
  return PLATFORMS.find((p) => p.value === platform) || PLATFORMS[3];
}

function getWeekDays(refDate: Date): Date[] {
  const d = new Date(refDate);
  d.setDate(d.getDate() - d.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) { const dd = new Date(d); dd.setDate(d.getDate() + i); days.push(dd); }
  return days;
}
function toDateStr(d: Date): string { return d.toLocaleDateString("en-CA"); }
function estNow(): Date { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })); }

export default function MarketingCalendar() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [weekRef, setWeekRef] = useState<Date>(estNow());
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ client_id: "", platform: "instagram", post_type: "Post", scheduled_date: "", description: "" });

  const weekDays = getWeekDays(weekRef);
  const todayStr = toDateStr(estNow());

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing?view=calendar");
      const data = await res.json();
      const rawClients = (data.clients || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        company_name: c.company_name as string,
        display_name: ((c.profiles as Record<string, unknown>)?.display_name as string) || c.company_name as string,
      }));
      const allClients: ClientOption[] = [
        { id: "otai", company_name: "OTAI", display_name: "OTAI" },
        ...rawClients,
      ];
      setClients(allClients);
      const map: Record<string, string> = {};
      allClients.forEach((c) => { map[c.id] = c.display_name; });
      setClientMap(map);
      setPosts(data.posts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = (dateStr?: string) => {
    setEditingPost(null);
    setForm({ client_id: clients[0]?.id || "otai", platform: "instagram", post_type: "Post", scheduled_date: dateStr || toDateStr(estNow()), description: "" });
    setShowModal(true); setError("");
  };
  const openEdit = (post: CalendarPost) => {
    setEditingPost(post);
    setForm({ client_id: post.client_id, platform: post.platform, post_type: post.post_type, scheduled_date: post.scheduled_date, description: post.description || "" });
    setShowModal(true); setError("");
  };

  const handleSave = async () => {
    if (!form.client_id) { setError("Select a client."); return; }
    if (!form.scheduled_date) { setError("Select a date."); return; }
    setSaving(true); setError("");
    const action = editingPost ? "update_post" : "add_post";
    const payload = editingPost
      ? { action, id: editingPost.id, client_id: form.client_id, platform: form.platform, post_type: form.post_type.toLowerCase(), scheduled_date: form.scheduled_date, description: form.description || null }
      : { action, client_id: form.client_id, platform: form.platform, post_type: form.post_type.toLowerCase(), scheduled_date: form.scheduled_date, description: form.description || null };
    try {
      const res = await fetch("/api/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.error) { setError(result.error); setSaving(false); return; }
    } catch { setError("Failed to save"); setSaving(false); return; }
    setSaving(false); setShowModal(false);
    setSuccess(editingPost ? "Post updated." : "Post added.");
    setTimeout(() => setSuccess(""), 3000); loadData();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_post", id }) });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-otai-purple" size={32} /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Calendar size={24} className="text-otai-purple" /> Content Calendar</h1>
          <p className="text-otai-text-secondary text-sm mt-1">Plan and schedule posts</p>
        </div>
        <button onClick={() => openAdd()} className="flex items-center gap-2 px-4 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16} /> Add Post</button>
      </div>
      {success && <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm"><Check size={16} /> {success}</div>}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d); }} className="p-2 rounded-lg bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"><ChevronLeft size={16} /></button>
          <button onClick={() => { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d); }} className="p-2 rounded-lg bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"><ChevronRight size={16} /></button>
          <button onClick={() => setWeekRef(estNow())} className="px-3 py-2 rounded-lg bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white text-xs">This Week</button>
        </div>
        <span className="text-otai-text-secondary text-sm">{weekDays[0].toLocaleDateString("en-US",{month:"short",day:"numeric"})} — {weekDays[6].toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateStr = toDateStr(day); const isToday = dateStr === todayStr;
          const dayPosts = posts.filter((p) => p.scheduled_date === dateStr);
          return (
            <div key={dateStr} className={`bg-otai-dark border rounded-xl min-h-[140px] flex flex-col ${isToday ? "border-otai-purple/50" : "border-otai-border"}`}>
              <div className="flex items-center justify-between px-2.5 py-2 border-b border-otai-border">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-otai-text-muted uppercase">{day.toLocaleDateString("en-US",{weekday:"short"})}</span>
                  <span className={`text-xs font-medium ${isToday ? "text-otai-purple" : "text-white"}`}>{day.getDate()}</span>
                </div>
                <button onClick={() => openAdd(dateStr)} className="p-0.5 rounded text-otai-text-muted hover:text-otai-purple"><Plus size={12} /></button>
              </div>
              <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                {dayPosts.map((post) => {
                  const plat = getPlatformStyle(post.platform);
                  const name = clientMap[post.client_id] || "—";
                  return (
                    <div key={post.id} className={`group relative px-2 py-1.5 rounded-lg border text-[10px] cursor-pointer ${plat.color}`} onClick={() => openEdit(post)}>
                      <div className="flex items-center gap-1"><span className="font-bold">{plat.label}</span><span className="truncate">{name.split(" ")[0]}</span></div>
                      <div className="text-[9px] opacity-70 capitalize">{post.post_type}</div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }} className="absolute top-1 right-1 hidden group-hover:block p-0.5 rounded bg-black/50"><Trash2 size={10} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowModal(false)} />
          <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{editingPost ? "Edit Post" : "Add Post"}</h2>
              <button onClick={() => setShowModal(false)} className="text-otai-text-muted hover:text-white"><X size={20} /></button>
            </div>
            {error && <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Client</label>
                <div className="relative">
                  <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-otai-purple">
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.id === "otai" ? "OTAI (Company Marketing)" : `${c.display_name}${c.display_name !== c.company_name ? ` (${c.company_name})` : ""}`}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => (
                    <button key={p.value} type="button" onClick={() => setForm({ ...form, platform: p.value })}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${form.platform === p.value ? p.color + " font-medium" : "border-otai-border text-otai-text-secondary"}`}>
                      {p.label} {p.value.charAt(0).toUpperCase() + p.value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Post Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {POST_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, post_type: t })}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${form.post_type === t ? "border-otai-purple bg-otai-purple/10 text-otai-purple font-medium" : "border-otai-border text-otai-text-secondary"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Date</label>
                <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple" />
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Description (optional)</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple resize-none" placeholder="Brief note about this post..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-otai-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}{editingPost ? "Update" : "Add Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
