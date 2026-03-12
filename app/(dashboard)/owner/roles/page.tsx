"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, Plus, X, Pencil, Trash2, Loader2, Check, AlertCircle,
} from "lucide-react";

interface CustomRole {
  id: string;
  name: string;
  display_name: string;
  permissions: string[];
  created_at: string;
}

const ALL_PERMISSIONS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "control_room", label: "Control Room" },
  { value: "third_eye", label: "Third Eye" },
  { value: "crm", label: "CRM" },
  { value: "finance", label: "Finance" },
  { value: "marketing_oversight", label: "Marketing Oversight" },
  { value: "sales_oversight", label: "Sales Oversight" },
  { value: "courses", label: "Courses" },
  { value: "client_updates", label: "Client Updates" },
  { value: "user_management", label: "User Management" },
  { value: "webhooks", label: "Webhooks" },
  { value: "calendar", label: "Calendar" },
  { value: "clients", label: "Client View" },
  { value: "leaderboard", label: "Leaderboard" },
  { value: "commission", label: "Commission" },
];

export default function OwnerRoles() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [form, setForm] = useState({ name: "", display_name: "", permissions: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("roles").select("*").order("created_at");
    setRoles((data || []).map((r) => ({
      ...r,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", display_name: "", permissions: [] });
    setShowModal(true); setError("");
  };

  const openEdit = (r: CustomRole) => {
    setEditing(r);
    setForm({ name: r.name, display_name: r.display_name, permissions: r.permissions });
    setShowModal(true); setError("");
  };

  const togglePerm = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.display_name.trim()) {
      setError("Name and display name required."); return;
    }
    setSaving(true); setError("");
    const supabase = createClient();

    const payload = {
      name: form.name.trim().toLowerCase().replace(/\s+/g, "_"),
      display_name: form.display_name.trim(),
      permissions: form.permissions,
    };

    if (editing) {
      const { error: err } = await supabase.from("roles").update(payload).eq("id", editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from("roles").insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false); setShowModal(false);
    setSuccess(editing ? "Role updated." : "Role created.");
    setTimeout(() => setSuccess(""), 3000); loadData();
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("roles").delete().eq("id", id);
    setSuccess("Role deleted."); setTimeout(() => setSuccess(""), 3000); loadData();
  };

  if (loading) return <div className="text-otai-text-secondary">Loading roles...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={24} className="text-otai-purple" /> Custom Roles
          </h1>
          <p className="text-otai-text-muted text-xs mt-1">
            Create custom roles beyond the 4 defaults. Assign them to users via User Management.
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Role
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm"><Check size={16} /> {success}</div>
      )}

      {/* Default roles info */}
      <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-6">
        <h3 className="text-white font-semibold text-sm mb-3">Default Roles (built-in)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: "Owner", color: "text-otai-purple", desc: "Full access" },
            { name: "Marketing", color: "text-blue-400", desc: "Calendar, clients, courses" },
            { name: "Sales Rep", color: "text-otai-gold", desc: "Leaderboard, courses, commission" },
            { name: "Client", color: "text-otai-green", desc: "View-only dashboard" },
          ].map((r) => (
            <div key={r.name} className="px-3 py-2 bg-black/20 rounded-lg">
              <p className={`font-medium text-sm ${r.color}`}>{r.name}</p>
              <p className="text-otai-text-muted text-xs">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Custom roles list */}
      {roles.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <Shield size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No custom roles created yet.</p>
          <p className="text-otai-text-muted text-sm mt-1">Custom roles let you define exactly which tabs a user can access.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="bg-otai-dark border border-otai-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium">{role.display_name}</h3>
                    <span className="text-otai-text-muted text-xs font-mono">{role.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {role.permissions.length === 0 ? (
                      <span className="text-otai-text-muted text-xs">No permissions set</span>
                    ) : (
                      role.permissions.map((p) => {
                        const label = ALL_PERMISSIONS.find((ap) => ap.value === p)?.label || p;
                        return (
                          <span key={p} className="px-2 py-0.5 bg-otai-purple/10 border border-otai-purple/20 rounded text-xs text-otai-text-secondary">
                            {label}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(role)} className="p-2 text-otai-text-muted hover:text-white rounded"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(role.id)} className="p-2 text-otai-text-muted hover:text-otai-red rounded"><Trash2 size={13} /></button>
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
          <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-md p-6 z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{editing ? "Edit Role" : "Create Custom Role"}</h2>
              <button onClick={() => setShowModal(false)} className="text-otai-text-muted hover:text-white"><X size={20} /></button>
            </div>
            {error && <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm"><AlertCircle size={16} /> {error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Display Name *</label>
                <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple"
                  placeholder="e.g., Account Manager" />
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Identifier *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-otai-purple"
                  placeholder="e.g., account_manager" />
              </div>
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-2">Permissions (tab access)</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map((perm) => (
                    <button
                      key={perm.value}
                      type="button"
                      onClick={() => togglePerm(perm.value)}
                      className={`px-3 py-2 rounded-lg text-xs text-left transition-colors border ${
                        form.permissions.includes(perm.value)
                          ? "border-otai-purple bg-otai-purple/10 text-otai-purple"
                          : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                      }`}
                    >
                      {perm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-otai-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}{editing ? "Update" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
