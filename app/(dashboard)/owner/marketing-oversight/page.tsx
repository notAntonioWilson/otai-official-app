"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Megaphone, ChevronLeft, ChevronRight, ChevronDown, Plus, X,
  Trash2, Loader2, Check, AlertCircle, Users,
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
  media_url?: string | null;
  media_urls?: string[];
}

interface ClientOption { id: string; company_name: string; }
interface ProfileOption { id: string; display_name: string | null; email: string; }
interface Assignment { id: string; marketer_id: string; client_id: string; }

const PLATFORMS: Record<string, { label: string; color: string }> = {
  instagram: { label: "IG", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  facebook:  { label: "FB", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  linkedin:  { label: "LI", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  x:         { label: "X",  color: "bg-gray-400/20 text-gray-300 border-gray-400/30" },
  youtube:   { label: "YT", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  tiktok:    { label: "TT", color: "bg-teal-400/20 text-teal-300 border-teal-400/30" },
};

const POST_TYPES = ["Reel", "Post", "Story", "Carousel", "Video", "Article"];

function getWeekDays(ref: Date): Date[] {
  const d = new Date(ref);
  d.setDate(d.getDate() - d.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) { const dd = new Date(d); dd.setDate(d.getDate() + i); days.push(dd); }
  return days;
}
function toDateStr(d: Date) { return d.toLocaleDateString("en-CA"); }
function estNow() { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })); }

export default function OwnerMarketingOversight() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [marketers, setMarketers] = useState<ProfileOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [weekRef, setWeekRef] = useState(estNow());
  const [filterClient, setFilterClient] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [form, setForm] = useState({ client_id: "", platform: "instagram", post_type: "Post", scheduled_date: "", description: "" });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing-oversight");
      const data = await res.json();
      const c: ClientOption[] = (data.clients || []).map((cl: Record<string, unknown>) => ({ id: cl.id as string, company_name: cl.company_name as string }));
      setClients(c);
      const map: Record<string, string> = {};
      c.forEach((cl) => { map[cl.id] = cl.company_name; });
      map["otai"] = "OTAI";
      setClientMap(map);
      setPosts(data.posts || []);
      setMarketers(data.marketers || []);
      setAssignments(data.assignments || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const weekDays = getWeekDays(weekRef);
  const todayStr = toDateStr(estNow());
  const filteredPosts = filterClient === "all" ? posts : posts.filter((p) => p.client_id === filterClient);

  const openAdd = (dateStr?: string) => {
    setEditingPost(null);
    setForm({ client_id: clients[0]?.id || "", platform: "instagram", post_type: "Post", scheduled_date: dateStr || toDateStr(estNow()), description: "" });
    setMediaFiles([]); setMediaPreviews([]);
    setShowModal(true); setError("");
  };

  const openEdit = (post: CalendarPost) => {
    setEditingPost(post);
    setForm({ client_id: post.client_id, platform: post.platform, post_type: post.post_type, scheduled_date: post.scheduled_date, description: post.description || "" });
    setMediaFiles([]);
    const existing = post.media_urls && post.media_urls.length > 0 ? post.media_urls : post.media_url ? [post.media_url] : [];
    setMediaPreviews(existing);
    setShowModal(true); setError("");
  };

  const addMediaFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setMediaFiles((prev) => [...prev, ...newFiles]);
    setMediaPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeMedia = (idx: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.client_id || !form.scheduled_date) { setError("Client and date required."); return; }
    setSaving(true); setError("");

    // Upload directly to Supabase Storage (bypasses Vercel 4.5MB limit)
    let finalUrls: string[] = mediaPreviews.filter((p) => p.startsWith("http"));
    if (mediaFiles.length > 0) {
      setUploading(true);
      const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
      const supabaseStorage = createBrowserClient();
      for (const file of mediaFiles) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `marketing/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabaseStorage.storage.from("uploads").upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) { setError("Upload failed: " + upErr.message); setSaving(false); setUploading(false); return; }
        const { data: urlData } = supabaseStorage.storage.from("uploads").getPublicUrl(path);
        finalUrls.push(urlData.publicUrl);
      }
      setUploading(false);
    }

    const payload = {
      action: editingPost ? "update_post" : "add_post",
      ...(editingPost ? { id: editingPost.id } : { marketer_id: marketers[0]?.id || null }),
      client_id: form.client_id,
      platform: form.platform,
      post_type: form.post_type.toLowerCase(),
      scheduled_date: form.scheduled_date,
      description: form.description || null,
      media_url: finalUrls[0] || null,
      media_urls: finalUrls,
    };

    try {
      const res = await fetch("/api/marketing-oversight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.error) { setError(result.error); setSaving(false); return; }
    } catch { setError("Failed to save"); setSaving(false); return; }

    setSaving(false); setShowModal(false);
    setSuccess(editingPost ? "Post updated." : "Post added.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/marketing-oversight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_post", id }) });
    loadData();
  };

  if (loading) return <div className="text-otai-text-secondary">Loading marketing oversight...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Megaphone size={24} className="text-otai-purple" /> Marketing Oversight
        </h1>
        <button onClick={() => openAdd()} className="flex items-center gap-2 px-4 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Post
        </button>
      </div>

      {success && <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm"><Check size={16} /> {success}</div>}

      {/* Assignments Overview */}
      <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-3"><Users size={16} className="text-otai-purple" /> Marketer Assignments</h2>
        {marketers.length === 0 ? (
          <p className="text-otai-text-muted text-sm">No marketers yet.</p>
        ) : (
          <div className="space-y-2">
            {marketers.map((m) => {
              const assigned = assignments.filter((a) => a.marketer_id === m.id).map((a) => clientMap[a.client_id] || "Unknown");
              return (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-white">{m.display_name || m.email}</span>
                  <span className="text-otai-text-muted text-xs">{assigned.length > 0 ? assigned.join(", ") : "No clients assigned"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Week nav + filter */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d); }} className="p-2 rounded-lg bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"><ChevronLeft size={16} /></button>
          <button onClick={() => { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d); }} className="p-2 rounded-lg bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"><ChevronRight size={16} /></button>
          <button onClick={() => setWeekRef(estNow())} className="px-3 py-2 rounded-lg bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white text-xs">This Week</button>
          <span className="text-otai-text-secondary text-sm ml-2">
            {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <div className="relative">
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
            className="bg-otai-dark border border-otai-border rounded-lg px-3 py-2 text-xs text-otai-text-secondary appearance-none pr-7 focus:outline-none focus:border-otai-purple">
            <option value="all">All Clients</option>
            <option value="otai">OTAI</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {weekDays.map((day) => {
          const dateStr = toDateStr(day);
          const isToday = dateStr === todayStr;
          const dayPosts = filteredPosts.filter((p) => p.scheduled_date === dateStr);
          return (
            <div key={dateStr} className={`bg-otai-dark border rounded-xl min-h-[130px] flex flex-col ${isToday ? "border-otai-purple/50" : "border-otai-border"}`}>
              <div className="flex items-center justify-between px-2.5 py-2 border-b border-otai-border">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-otai-text-muted uppercase">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <span className={`text-xs font-medium ${isToday ? "text-otai-purple" : "text-white"}`}>{day.getDate()}</span>
                </div>
                <button onClick={() => openAdd(dateStr)} className="p-0.5 rounded text-otai-text-muted hover:text-otai-purple"><Plus size={12} /></button>
              </div>
              <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                {dayPosts.map((post) => {
                  const plat = PLATFORMS[post.platform] || PLATFORMS.x;
                  const firstName = (clientMap[post.client_id] || "—").split(" ")[0];
                  const hasMedia = (post.media_urls && post.media_urls.length > 0) || post.media_url;
                  return (
                    <div key={post.id} className={`group relative px-2 py-1.5 rounded-lg border text-[10px] cursor-pointer ${plat.color}`} onClick={() => openEdit(post)}>
                      <div className="flex items-center gap-1">
                        <span className="font-bold">{plat.label}</span>
                        <span className="truncate">{firstName}</span>
                        {hasMedia && <span className="ml-auto">📎</span>}
                      </div>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowModal(false)} />
          <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{editingPost ? "Edit Post" : "Add Post"}</h2>
              <button onClick={() => setShowModal(false)} className="text-otai-text-muted hover:text-white"><X size={20} /></button>
            </div>
            {error && <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-4">
              {/* Client */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Client</label>
                <div className="relative">
                  <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-otai-purple">
                    <option value="">Select client...</option>
                    <option value="otai">OTAI (Company Marketing)</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
                </div>
              </div>
              {/* Platform */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PLATFORMS).map(([val, p]) => (
                    <button key={val} type="button" onClick={() => setForm({ ...form, platform: val })}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${form.platform === val ? p.color + " font-medium" : "border-otai-border text-otai-text-secondary"}`}>
                      {p.label} {val.charAt(0).toUpperCase() + val.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Post Type */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Post Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {POST_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, post_type: t })}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${form.post_type === t ? "border-otai-purple bg-otai-purple/10 text-otai-purple font-medium" : "border-otai-border text-otai-text-secondary"}`}>{t}</button>
                  ))}
                </div>
              </div>
              {/* Date */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Date</label>
                <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple" />
              </div>
              {/* Description */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Description (optional)</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple resize-none" placeholder="Brief note about this post..." />
              </div>
              {/* Media */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">
                  Media {form.post_type === "Carousel" ? "(multiple images/videos)" : "(optional)"}
                </label>
                {mediaPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {mediaPreviews.map((src, idx) => (
                      <div key={idx} className="relative">
                        {src.match(/\.(mp4|mov|webm)$/i) ? (
                          <video src={src} className="w-full h-20 object-cover rounded-lg border border-otai-border" />
                        ) : (
                          <img src={src} alt="" className="w-full h-20 object-cover rounded-lg border border-otai-border" />
                        )}
                        <button onClick={() => removeMedia(idx)} className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 rounded-full text-white hover:bg-black"><X size={10} /></button>
                        {idx === 0 && <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/70 text-white px-1 rounded">Cover</span>}
                      </div>
                    ))}
                  </div>
                )}
                <label
                  className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-otai-border rounded-lg cursor-pointer hover:border-otai-purple/40 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addMediaFiles(e.dataTransfer.files); }}
                >
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => addMediaFiles(e.target.files)} />
                  <span className="text-otai-text-muted text-xs text-center px-2">
                    {form.post_type === "Carousel" ? "Drop multiple images/videos, or click to browse" : "Drop image or video here, or click to browse"}
                  </span>
                  {uploading && <Loader2 size={14} className="animate-spin text-otai-purple mt-1" />}
                </label>
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
