"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Webhook, Plus, X, Pencil, Loader2, Check, AlertCircle,
  ChevronDown, ExternalLink, Clock, ToggleLeft, ToggleRight,
} from "lucide-react";

interface WebhookRow {
  id: string;
  tag: string;
  url: string;
  method: string;
  description: string | null;
  source: string;
  target_table: string;
  status: string;
  last_triggered: string | null;
  created_at: string;
}

export default function OwnerWebhooks() {
  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WebhookRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    tag: "", url: "", method: "POST", description: "",
    source: "n8n", target_table: "", status: "inactive",
  });

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("webhooks").select("*").order("created_at");
    setWebhooks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ tag: "", url: "", method: "POST", description: "", source: "n8n", target_table: "", status: "inactive" });
    setShowModal(true); setError("");
  };

  const openEdit = (w: WebhookRow) => {
    setEditing(w);
    setForm({
      tag: w.tag, url: w.url, method: w.method,
      description: w.description || "", source: w.source,
      target_table: w.target_table, status: w.status,
    });
    setShowModal(true); setError("");
  };

  const handleSave = async () => {
    if (!form.tag.trim() || !form.url.trim()) { setError("Tag and URL are required."); return; }
    setSaving(true); setError("");
    const supabase = createClient();

    const payload = {
      tag: form.tag.trim(),
      url: form.url.trim(),
      method: form.method,
      description: form.description || null,
      source: form.source,
      target_table: form.target_table || "",
      status: form.status,
    };

    if (editing) {
      const { error: err } = await supabase.from("webhooks").update(payload).eq("id", editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from("webhooks").insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false); setShowModal(false);
    setSuccess(editing ? "Webhook updated." : "Webhook added.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  const toggleStatus = async (w: WebhookRow) => {
    const newStatus = w.status === "active" ? "inactive" : "active";
    const supabase = createClient();
    await supabase.from("webhooks").update({ status: newStatus }).eq("id", w.id);
    setSuccess(`Webhook ${newStatus}.`);
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("webhooks").delete().eq("id", id);
    setSuccess("Webhook removed.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  if (loading) return <div className="text-otai-text-secondary">Loading webhooks...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Webhook size={24} className="text-otai-purple" /> Webhooks
          </h1>
          <p className="text-otai-text-muted text-xs mt-1">
            Registry for all n8n and external webhook endpoints. Active endpoints wired post-launch.
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Webhook
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm"><Check size={16} /> {success}</div>
      )}

      {webhooks.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <Webhook size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No webhooks registered yet.</p>
          <p className="text-otai-text-muted text-sm mt-1">Add webhook entries to prepare for n8n integration.</p>
        </div>
      ) : (
        <div className="bg-otai-dark border border-otai-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-otai-text-muted text-xs uppercase tracking-wide">
                  <th className="text-left p-4 font-medium">Tag</th>
                  <th className="text-left p-4 font-medium">Source</th>
                  <th className="text-left p-4 font-medium">Target Table</th>
                  <th className="text-left p-4 font-medium">Method</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Last Triggered</th>
                  <th className="text-right p-4 font-medium w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-otai-border">
                {webhooks.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.02]">
                    <td className="p-4">
                      <div>
                        <span className="text-white font-medium text-xs font-mono">{w.tag}</span>
                        {w.description && <p className="text-otai-text-muted text-xs mt-0.5 truncate max-w-48">{w.description}</p>}
                      </div>
                    </td>
                    <td className="p-4 text-otai-text-secondary text-xs">{w.source}</td>
                    <td className="p-4 text-otai-text-secondary text-xs font-mono">{w.target_table}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-otai-purple/10 text-otai-purple rounded text-xs font-mono">{w.method}</span>
                    </td>
                    <td className="p-4">
                      <button onClick={() => toggleStatus(w)} className="flex items-center gap-1.5">
                        {w.status === "active" ? (
                          <><ToggleRight size={16} className="text-otai-green" /><span className="text-otai-green text-xs">Active</span></>
                        ) : w.status === "testing" ? (
                          <><ToggleRight size={16} className="text-otai-gold" /><span className="text-otai-gold text-xs">Testing</span></>
                        ) : (
                          <><ToggleLeft size={16} className="text-otai-text-muted" /><span className="text-otai-text-muted text-xs">Inactive</span></>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-otai-text-muted text-xs">
                      {w.last_triggered ? (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(w.last_triggered).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                      ) : "Never"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(w)} className="p-1.5 text-otai-text-muted hover:text-white rounded"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(w.id)} className="p-1.5 text-otai-text-muted hover:text-otai-red rounded"><X size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowModal(false)} />
          <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{editing ? "Edit Webhook" : "Add Webhook"}</h2>
              <button onClick={() => setShowModal(false)} className="text-otai-text-muted hover:text-white"><X size={20} /></button>
            </div>
            {error && <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm"><AlertCircle size={16} /> {error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Tag *</label>
                <input type="text" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-otai-purple"
                  placeholder="n8n-social-metrics-weekly" />
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">URL *</label>
                <input type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple"
                  placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Method</label>
                  <div className="relative">
                    <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}
                      className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-otai-purple">
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Source</label>
                  <div className="relative">
                    <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                      className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-otai-purple">
                      <option value="n8n">n8n</option>
                      <option value="make">Make</option>
                      <option value="manual">Manual</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Target Table</label>
                <input type="text" value={form.target_table} onChange={(e) => setForm({ ...form, target_table: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-otai-purple"
                  placeholder="social_media_metrics" />
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple resize-none"
                  placeholder="What this webhook does..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-otai-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}{editing ? "Update" : "Add Webhook"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
