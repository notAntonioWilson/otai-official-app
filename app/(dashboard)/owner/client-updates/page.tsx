"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell, Plus, X, Pencil, Trash2, ChevronDown,
  Loader2, Check, AlertCircle,
} from "lucide-react";

interface UpdateRow {
  id: string;
  client_id: string;
  title: string | null;
  content: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

interface ClientOption {
  id: string;
  company_name: string;
}

export default function OwnerClientUpdates() {
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [filterClient, setFilterClient] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UpdateRow | null>(null);
  const [form, setForm] = useState({ client_id: "", title: "", content: "", source: "manual" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: c } = await supabase.from("clients").select("id, company_name").order("company_name");
    setClients(c || []);
    const map: Record<string, string> = {};
    (c || []).forEach((cl) => { map[cl.id] = cl.company_name; });
    setClientMap(map);

    const { data: u } = await supabase.from("client_updates").select("*").order("created_at", { ascending: false });
    setUpdates(u || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filterClient === "all" ? updates : updates.filter((u) => u.client_id === filterClient);

  const openAdd = () => {
    setEditing(null);
    setForm({ client_id: clients[0]?.id || "", title: "", content: "", source: "manual" });
    setShowModal(true); setError("");
  };

  const openEdit = (u: UpdateRow) => {
    setEditing(u);
    setForm({ client_id: u.client_id, title: u.title || "", content: u.content || "", source: u.source });
    setShowModal(true); setError("");
  };

  const handleSave = async () => {
    if (!form.client_id || !form.content.trim()) { setError("Client and content required."); return; }
    setSaving(true); setError("");
    const supabase = createClient();

    if (editing) {
      const { error: err } = await supabase.from("client_updates").update({
        client_id: form.client_id, title: form.title || null,
        content: form.content, source: form.source,
        updated_at: new Date().toISOString(),
      }).eq("id", editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from("client_updates").insert({
        client_id: form.client_id, title: form.title || null,
        content: form.content, source: form.source,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false); setShowModal(false);
    setSuccess(editing ? "Update edited." : "Update sent to client.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("client_updates").delete().eq("id", id);
    setSuccess("Update removed."); setTimeout(() => setSuccess(""), 3000); loadData();
  };

  if (loading) return <div className="text-otai-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell size={24} className="text-otai-gold" /> Client Updates
        </h1>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Update
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm"><Check size={16} /> {success}</div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
            className="bg-otai-dark border border-otai-border rounded-lg px-3 py-2 text-xs text-otai-text-secondary appearance-none pr-7 focus:outline-none focus:border-otai-purple">
            <option value="all">All Clients</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
        </div>
        <span className="text-otai-text-muted text-xs">{filtered.length} update{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <Bell size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No updates yet.</p>
          <p className="text-otai-text-muted text-sm mt-1">Send updates that appear in your clients&apos; Updates tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div key={u.id} className="bg-otai-dark border border-otai-border rounded-xl p-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-medium text-sm">{u.title || "Update"}</span>
                    <span className="text-otai-purple text-xs">{clientMap[u.client_id] || "Unknown"}</span>
                    <span className="text-otai-text-muted text-xs">
                      {new Date(u.created_at).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {u.source === "automated" && (
                      <span className="px-1.5 py-0.5 bg-otai-purple/10 text-otai-purple rounded text-[10px]">auto</span>
                    )}
                  </div>
                  <p className="text-otai-text-secondary text-sm whitespace-pre-wrap line-clamp-3">{u.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(u)} className="p-1.5 text-otai-text-muted hover:text-white rounded"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 text-otai-text-muted hover:text-otai-red rounded"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowModal(false)} />
          <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{editing ? "Edit Update" : "New Client Update"}</h2>
              <button onClick={() => setShowModal(false)} className="text-otai-text-muted hover:text-white"><X size={20} /></button>
            </div>
            {error && <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Client</label>
                <div className="relative">
                  <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-otai-purple">
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple"
                  placeholder="e.g., Bi-Weekly Report, Website Launched" />
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Content *</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple resize-none"
                  placeholder="What you want the client to see..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-otai-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}{editing ? "Update" : "Send Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
