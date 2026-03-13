"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Pencil, Trash2,
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
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sun = new Date(d);
  sun.setDate(diff);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(sun);
    dd.setDate(sun.getDate() + i);
    days.push(dd);
  }
  return days;
}

function toDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function estNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}

export default function MarketingCalendar() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [weekRef, setWeekRef] = useState<Date>(estNow());
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    client_id: "",
    platform: "instagram",
    post_type: "Post",
    scheduled_date: "",
    description: "",
  });

  const weekDays = getWeekDays(weekRef);
  const weekStart = toDateStr(weekDays[0]);
  const weekEnd = toDateStr(weekDays[6]);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Get assigned clients via marketing_client_assignments
    const { data: assignments } = await supabase
      .from("marketing_client_assignments")
      .select("client_id")
      .eq("marketer_id", user.id);

    let clientIds = (assignments || []).map((a) => a.client_id);

    // Fallback: if no assignments, show all clients (for initial setup)
    let clientsList: ClientOption[] = [];
    if (clientIds.length > 0) {
      const { data } = await supabase
        .from("clients")
        .select("id, company_name, profiles!clients_user_id_fkey(display_name)")
        .in("id", clientIds);
      clientsList = (data || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        company_name: c.company_name as string,
        display_name: ((c.profiles as Record<string, unknown>)?.display_name as string) || c.company_name as string,
      }));
    } else {
      const { data } = await supabase
        .from("clients")
        .select("id, company_name, profiles!clients_user_id_fkey(display_name)");
      clientsList = (data || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        company_name: c.company_name as string,
        display_name: ((c.profiles as Record<string, unknown>)?.display_name as string) || c.company_name as string,
      }));
      clientIds = clientsList.map((c) => c.id);
    }
    setClients(clientsList);

    const map: Record<string, string> = {};
    clientsList.forEach((c) => { map[c.id] = c.display_name; });
    setClientMap(map);

    // Get posts for visible range (fetch broader to avoid re-fetching on nav)
    const { data: postsData } = await supabase
      .from("marketing_calendar")
      .select("*")
      .in("client_id", clientIds.length > 0 ? clientIds : ["__none__"])
      .order("scheduled_date");

    setPosts(postsData || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const goThisWeek = () => setWeekRef(estNow());
  const goPrevWeek = () => {
    const d = new Date(weekRef);
    d.setDate(d.getDate() - 7);
    setWeekRef(d);
  };
  const goNextWeek = () => {
    const d = new Date(weekRef);
    d.setDate(d.getDate() + 7);
    setWeekRef(d);
  };

  const openAdd = (dateStr?: string) => {
    setEditingPost(null);
    setForm({
      client_id: clients[0]?.id || "",
      platform: "instagram",
      post_type: "Post",
      scheduled_date: dateStr || toDateStr(estNow()),
      description: "",
    });
    setShowModal(true);
    setError("");
  };

  const openEdit = (post: CalendarPost) => {
    setEditingPost(post);
    setForm({
      client_id: post.client_id,
      platform: post.platform,
      post_type: post.post_type,
      scheduled_date: post.scheduled_date,
      description: post.description || "",
    });
    setShowModal(true);
    setError("");
  };

  const handleSave = async () => {
    if (!form.client_id) { setError("Select a client."); return; }
    if (!form.scheduled_date) { setError("Select a date."); return; }

    setSaving(true);
    setError("");
    const supabase = createClient();

    if (editingPost) {
      const { error: err } = await supabase
        .from("marketing_calendar")
        .update({
          client_id: form.client_id,
          platform: form.platform,
          post_type: form.post_type.toLowerCase(),
          scheduled_date: form.scheduled_date,
          description: form.description || null,
        })
        .eq("id", editingPost.id);

      if (err) { setError(err.message); setSaving(false); return; }
      setSuccess("Post updated.");
    } else {
      const { error: err } = await supabase
        .from("marketing_calendar")
        .insert({
          client_id: form.client_id,
          marketer_id: userId,
          platform: form.platform,
          post_type: form.post_type.toLowerCase(),
          scheduled_date: form.scheduled_date,
          description: form.description || null,
          status: "planned",
        });

      if (err) { setError(err.message); setSaving(false); return; }
      setSuccess("Post added.");
    }

    setSaving(false);
    setShowModal(false);
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  const handleDelete = async (postId: string) => {
    const supabase = createClient();
    await supabase.from("marketing_calendar").delete().eq("id", postId);
    setSuccess("Post deleted.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  if (loading) {
    return <div className="text-otai-text-secondary">Loading calendar...</div>;
  }

  const todayStr = toDateStr(estNow());

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar size={24} className="text-otai-purple" />
          Content Calendar
        </h1>
        <button
          onClick={() => openAdd()}
          className="flex items-center gap-2 px-4 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Post
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={goPrevWeek} className="p-2 rounded-lg bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={goNextWeek} className="p-2 rounded-lg bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
          <button onClick={goThisWeek} className="px-3 py-2 rounded-lg bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white text-xs transition-colors">
            This Week
          </button>
        </div>
        <span className="text-otai-text-secondary text-sm">
          {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateStr = toDateStr(day);
          const isToday = dateStr === todayStr;
          const dayPosts = posts.filter((p) => p.scheduled_date === dateStr);
          const dayLabel = day.toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = day.getDate();

          return (
            <div
              key={dateStr}
              className={`bg-otai-dark border rounded-xl min-h-[140px] flex flex-col ${
                isToday ? "border-otai-purple/50" : "border-otai-border"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between px-2.5 py-2 border-b border-otai-border">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-otai-text-muted uppercase">{dayLabel}</span>
                  <span className={`text-xs font-medium ${isToday ? "text-otai-purple" : "text-white"}`}>
                    {dayNum}
                  </span>
                </div>
                <button
                  onClick={() => openAdd(dateStr)}
                  className="p-0.5 rounded text-otai-text-muted hover:text-otai-purple transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Posts */}
              <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                {dayPosts.map((post) => {
                  const plat = getPlatformStyle(post.platform);
                  const clientName = clientMap[post.client_id] || "—";
                  const firstName = clientName.split(" ")[0];

                  return (
                    <div
                      key={post.id}
                      className={`group relative px-2 py-1.5 rounded-lg border text-[10px] cursor-pointer ${plat.color}`}
                      onClick={() => openEdit(post)}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-bold">{plat.label}</span>
                        <span className="truncate">{firstName}</span>
                      </div>
                      <div className="text-[9px] opacity-70 capitalize">{post.post_type}</div>
                      {/* Delete on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                        className="absolute top-1 right-1 hidden group-hover:block p-0.5 rounded bg-black/50"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============ ADD/EDIT MODAL ============ */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowModal(false)} />
          <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">
                {editingPost ? "Edit Post" : "Add Post"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-otai-text-muted hover:text-white">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Client */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Client</label>
                <div className="relative">
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-otai-purple"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.display_name}{c.display_name !== c.company_name ? ` (${c.company_name})` : ""}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm({ ...form, platform: p.value })}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                        form.platform === p.value
                          ? p.color + " font-medium"
                          : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                      }`}
                    >
                      {p.label} {p.value.charAt(0).toUpperCase() + p.value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Post Type */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Post Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {POST_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, post_type: t })}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                        form.post_type === t
                          ? "border-otai-purple bg-otai-purple/10 text-otai-purple font-medium"
                          : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple resize-none"
                  placeholder="Brief note about this post..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-otai-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingPost ? "Update" : "Add Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
