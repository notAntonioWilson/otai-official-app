"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Contact, Plus, X, ChevronDown, Pencil, MessageSquare,
  Loader2, Check, AlertCircle, Phone, Mail, Clock, FileText,
  ArrowLeft,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  services_interested: string[] | null;
  status: string;
  notes: string | null;
  additional_info: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ActivityEntry {
  id: string;
  lead_id: string;
  note: string;
  file_url: string | null;
  created_by: string;
  created_at: string;
}

const LEAD_STATUSES = [
  "Hot NOT Contacted",
  "Contact 1 (fail)",
  "Contact 1 (meeting 2)",
  "Contact 1 (closed)",
  "Contact 2 (fail)",
  "Contact 2 (closed)",
  "Contact 3 (slow-drip)",
];

const STATUS_COLORS: Record<string, string> = {
  "Hot NOT Contacted": "bg-otai-red/10 text-otai-red border-otai-red/30",
  "Contact 1 (fail)": "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "Contact 1 (meeting 2)": "bg-otai-gold/10 text-otai-gold border-otai-gold/30",
  "Contact 1 (closed)": "bg-otai-green/10 text-otai-green border-otai-green/30",
  "Contact 2 (fail)": "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "Contact 2 (closed)": "bg-otai-green/10 text-otai-green border-otai-green/30",
  "Contact 3 (slow-drip)": "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

const SERVICE_OPTIONS = [
  "Website & SEO", "Chatbot", "Phone Agent", "Automations",
  "Social Media", "Email Outreach", "App", "Custom",
];

export default function OwnerCRM() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Detail view
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    services_interested: [] as string[],
    status: "Hot NOT Contacted",
    notes: "",
  });

  const loadLeads = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("crm_leads")
      .select("*")
      .order("updated_at", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const loadActivities = async (leadId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("crm_activity_log")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    setActivities(data || []);
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    loadActivities(lead.id);
    setNewNote("");
  };

  const openAdd = () => {
    setEditingLead(null);
    setForm({
      name: "", email: "", phone: "",
      services_interested: [],
      status: "Hot NOT Contacted",
      notes: "",
    });
    setShowModal(true);
    setError("");
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || "",
      services_interested: lead.services_interested || [],
      status: lead.status,
      notes: lead.notes || "",
    });
    setShowModal(true);
    setError("");
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      setError("Name and email are required.");
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      services_interested: form.services_interested.length > 0 ? form.services_interested : null,
      status: form.status,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (editingLead) {
      const { error: err } = await supabase
        .from("crm_leads")
        .update(payload)
        .eq("id", editingLead.id);
      if (err) { setError(err.message); setSaving(false); return; }
      setSuccess("Lead updated.");

      // Refresh selected lead if viewing
      if (selectedLead?.id === editingLead.id) {
        setSelectedLead({ ...editingLead, ...payload, services_interested: payload.services_interested });
      }
    } else {
      const { error: err } = await supabase
        .from("crm_leads")
        .insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
      setSuccess("Lead added.");
    }

    setSaving(false);
    setShowModal(false);
    setTimeout(() => setSuccess(""), 3000);
    loadLeads();
  };

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    const supabase = createClient();
    await supabase
      .from("crm_leads")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", lead.id);

    // Log activity
    await supabase.from("crm_activity_log").insert({
      lead_id: lead.id,
      note: `Status changed to: ${newStatus}`,
      created_by: userId,
    });

    setSuccess("Status updated.");
    setTimeout(() => setSuccess(""), 3000);
    loadLeads();
    if (selectedLead?.id === lead.id) {
      setSelectedLead({ ...lead, status: newStatus });
      loadActivities(lead.id);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead) return;
    setAddingNote(true);
    const supabase = createClient();

    await supabase.from("crm_activity_log").insert({
      lead_id: selectedLead.id,
      note: newNote.trim(),
      created_by: userId,
    });

    // Touch updated_at
    await supabase
      .from("crm_leads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedLead.id);

    setNewNote("");
    setAddingNote(false);
    loadActivities(selectedLead.id);
    loadLeads();
  };

  const toggleService = (svc: string) => {
    setForm((prev) => ({
      ...prev,
      services_interested: prev.services_interested.includes(svc)
        ? prev.services_interested.filter((s) => s !== svc)
        : [...prev.services_interested, svc],
    }));
  };

  if (loading) {
    return <div className="text-otai-text-secondary">Loading CRM...</div>;
  }

  const filteredLeads = filterStatus === "all"
    ? leads
    : leads.filter((l) => l.status === filterStatus);

  // === LEAD DETAIL VIEW ===
  if (selectedLead) {
    const statusColor = STATUS_COLORS[selectedLead.status] || "bg-gray-500/10 text-gray-400 border-gray-500/30";

    return (
      <div>
        <button
          onClick={() => setSelectedLead(null)}
          className="flex items-center gap-2 text-otai-text-secondary hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> All Leads
        </button>

        {success && (
          <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm">
            <Check size={16} /> {success}
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedLead.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-otai-text-secondary">
              <span className="flex items-center gap-1"><Mail size={12} /> {selectedLead.email}</span>
              {selectedLead.phone && <span className="flex items-center gap-1"><Phone size={12} /> {selectedLead.phone}</span>}
            </div>
          </div>
          <button onClick={() => openEdit(selectedLead)}
            className="flex items-center gap-2 px-3 py-2 bg-otai-dark border border-otai-border rounded-lg text-otai-text-secondary hover:text-white text-sm">
            <Pencil size={14} /> Edit
          </button>
        </div>

        {/* Status + Services */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
            <p className="text-xs text-otai-text-muted uppercase tracking-wide mb-2">Status</p>
            <div className="relative">
              <select
                value={selectedLead.status}
                onChange={(e) => handleStatusChange(selectedLead, e.target.value)}
                className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-otai-purple"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
            </div>
            <div className="mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColor}`}>
                {selectedLead.status}
              </span>
            </div>
          </div>

          <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
            <p className="text-xs text-otai-text-muted uppercase tracking-wide mb-2">Services Interested</p>
            {selectedLead.services_interested && selectedLead.services_interested.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedLead.services_interested.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-otai-purple/10 border border-otai-purple/20 rounded text-xs text-otai-text-secondary">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-otai-text-muted text-sm">None specified</p>
            )}
          </div>
        </div>

        {/* Notes */}
        {selectedLead.notes && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
            <p className="text-xs text-otai-text-muted uppercase tracking-wide mb-2">Notes</p>
            <p className="text-otai-text-secondary text-sm whitespace-pre-wrap">{selectedLead.notes}</p>
          </div>
        )}

        {/* Activity Log */}
        <div className="bg-otai-dark border border-otai-border rounded-xl">
          <div className="p-5 border-b border-otai-border">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <MessageSquare size={16} className="text-otai-purple" />
              Activity Log
            </h2>
          </div>

          {/* Add Note */}
          <div className="p-4 border-b border-otai-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 bg-black border border-otai-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-otai-purple"
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="px-4 py-2 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                {addingNote ? <Loader2 size={14} className="animate-spin" /> : "Add"}
              </button>
            </div>
          </div>

          {/* Activity entries */}
          {activities.length === 0 ? (
            <div className="p-8 text-center text-otai-text-muted text-sm">No activity yet.</div>
          ) : (
            <div className="divide-y divide-otai-border">
              {activities.map((a) => (
                <div key={a.id} className="p-4">
                  <p className="text-white text-sm">{a.note}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-otai-text-muted">
                    <Clock size={10} />
                    <span>
                      {new Date(a.created_at).toLocaleString("en-US", {
                        timeZone: "America/New_York",
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </span>
                    {a.file_url && (
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-otai-purple hover:text-otai-purple-hover">
                        <FileText size={10} /> File
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === LEAD LIST ===
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Contact size={24} className="text-otai-purple" />
          CRM
        </h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterStatus === "all"
              ? "bg-otai-purple text-white"
              : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"
          }`}
        >
          All ({leads.length})
        </button>
        {LEAD_STATUSES.map((s) => {
          const count = leads.filter((l) => l.status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? "bg-otai-purple text-white"
                  : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"
              }`}
            >
              {s.split(" ")[0]} ({count})
            </button>
          );
        })}
      </div>

      {/* Leads Table */}
      {filteredLeads.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <Contact size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No leads yet.</p>
          <p className="text-otai-text-muted text-sm mt-1">Add your first lead to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLeads.map((lead) => {
            const statusColor = STATUS_COLORS[lead.status] || "bg-gray-500/10 text-gray-400 border-gray-500/30";
            const lastTouched = new Date(lead.updated_at).toLocaleDateString("en-US", {
              timeZone: "America/New_York",
              month: "short", day: "numeric",
            });

            return (
              <button
                key={lead.id}
                onClick={() => openLead(lead)}
                className="w-full bg-otai-dark border border-otai-border rounded-xl p-4 hover:border-otai-purple/30 transition-colors text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-medium">{lead.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${statusColor}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-otai-text-muted">
                      <span>{lead.email}</span>
                      {lead.phone && <span>{lead.phone}</span>}
                      <span>Last: {lastTouched}</span>
                    </div>
                    {lead.services_interested && lead.services_interested.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {lead.services_interested.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 bg-otai-purple/5 border border-otai-purple/20 rounded text-[10px] text-otai-text-muted">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Pencil size={14} className="text-otai-text-muted shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ============ ADD/EDIT LEAD MODAL ============ */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowModal(false)} />
          <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-lg p-6 z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">
                {editingLead ? "Edit Lead" : "Add Lead"}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple" />
                </div>
                <div>
                  <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple" />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-otai-purple"
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Services */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-2">Services Interested</label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map((svc) => (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => toggleService(svc)}
                      className={`px-3 py-2 rounded-lg text-xs text-left transition-colors border ${
                        form.services_interested.includes(svc)
                          ? "border-otai-purple bg-otai-purple/10 text-otai-purple"
                          : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                      }`}
                    >
                      {svc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple resize-none"
                  placeholder="General notes about this lead..."
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
                {editingLead ? "Update Lead" : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
