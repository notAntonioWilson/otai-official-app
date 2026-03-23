"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserCog, Plus, X, Shield, Eye, EyeOff, ChevronDown,
  Pencil, UserX, UserCheck, Trash2, AlertCircle, Check, Loader2, Users,
} from "lucide-react";

type UserRole = "owner" | "marketing" | "sales_rep" | "client";

interface ProfileRow {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  role: UserRole;
  status: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientRow {
  id: string;
  user_id: string;
  company_name: string;
  phone: string | null;
  deal_value_upfront: number;
  deal_value_monthly: number;
  status: string;
  client_services: { id: string; service_type: string; status: string }[];
}

interface AllClientRow {
  id: string;
  company_name: string;
  user_id: string;
  profiles?: { display_name: string | null } | null;
}

interface AssignmentRow {
  id: string;
  marketer_id: string;
  client_id: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  marketing: "Marketing",
  sales_rep: "Sales Rep",
  client: "Client",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-otai-purple/10 text-otai-purple",
  marketing: "bg-blue-500/10 text-blue-400",
  sales_rep: "bg-otai-gold/10 text-otai-gold",
  client: "bg-otai-green/10 text-otai-green",
};

const SERVICE_OPTIONS = [
  { value: "website_seo", label: "Website & SEO" },
  { value: "chatbot", label: "Chatbot" },
  { value: "phone_agent", label: "Phone Agent" },
  { value: "automations", label: "Automations" },
  { value: "social_media", label: "Social Media" },
  { value: "email_outreach", label: "Email Outreach" },
  { value: "app", label: "App" },
  { value: "custom", label: "Custom" },
];

export default function OwnerUsers() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [allClients, setAllClients] = useState<AllClientRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([]);

  // Add user form
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    username: "",
    display_name: "",
    role: "client" as UserRole,
    company_name: "",
    phone: "",
    preferred_contact: "email",
    contract_type: "Monthly",
    deal_value_upfront: "",
    deal_value_monthly: "",
    renewal_date_day: "",
    contract_start_date: "",
    potential_value: "",
    upsell_notes: "",
    lead_source: "",
    industry: "",
    timezone: "EST",
    services: [] as string[],
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    display_name: "",
    username: "",
    email: "",
  });

  // Role change
  const [newRole, setNewRole] = useState<UserRole>("client");

  const [showPassword, setShowPassword] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("all");

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setProfiles(data.profiles || []);
      setClients(data.clients || []);
      setAllClients(data.allClients || []);
      setAssignments(data.assignments || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const clearMessages = () => { setError(""); setSuccess(""); };

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  // --- ADD USER ---
  const handleAddUser = async () => {
    clearMessages();
    if (!newUser.email || !newUser.password || !newUser.display_name) {
      setError("Email, password, and display name are required.");
      return;
    }
    if (newUser.role === "client" && !newUser.company_name) {
      setError("Company name is required for client users.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newUser,
          deal_value_upfront: Number(newUser.deal_value_upfront) || 0,
          deal_value_monthly: Number(newUser.deal_value_monthly) || 0,
          renewal_date_day: Number(newUser.renewal_date_day) || null,
          potential_value: Number(newUser.potential_value) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      flashSuccess("User created successfully.");
      setShowAddModal(false);
      resetNewUserForm();
      loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const resetNewUserForm = () => {
    setNewUser({
      email: "", password: "", username: "", display_name: "",
      role: "client", company_name: "", phone: "", preferred_contact: "email",
      contract_type: "Monthly", deal_value_upfront: "", deal_value_monthly: "",
      renewal_date_day: "", contract_start_date: "", potential_value: "",
      upsell_notes: "", lead_source: "", industry: "", timezone: "EST",
      services: [],
    });
    setShowPassword(false);
  };

  // --- EDIT USER ---
  const openEditModal = (user: ProfileRow) => {
    setSelectedUser(user);
    setEditForm({
      display_name: user.display_name || "",
      username: user.username || "",
      email: user.email,
    });
    setShowEditModal(true);
    clearMessages();
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    clearMessages();
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: "update_profile",
          ...editForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      flashSuccess("User updated.");
      setShowEditModal(false);
      loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  // --- ROLE CHANGE ---
  const openRoleModal = (user: ProfileRow) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
    clearMessages();
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    clearMessages();
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: "update_role",
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      flashSuccess(`Role changed to ${ROLE_LABELS[newRole]}.`);
      setShowRoleModal(false);
      loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to change role");
    } finally {
      setSaving(false);
    }
  };

  // --- ACTIVATE / DEACTIVATE ---
  const handleToggleStatus = async (user: ProfileRow) => {
    clearMessages();
    const action = user.status === "active" ? "deactivate" : "activate";
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      flashSuccess(`User ${action}d.`);
      loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Failed to ${action} user`);
    }
  };

  // --- DELETE ---
  const openDeleteConfirm = (user: ProfileRow) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
    clearMessages();
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    clearMessages();
    setSaving(true);
    try {
      const res = await fetch(`/api/users?userId=${selectedUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      flashSuccess("User removed.");
      setShowDeleteConfirm(false);
      loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  // --- SERVICE TOGGLE ---
  const toggleService = (svc: string) => {
    setNewUser((prev) => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter((s) => s !== svc)
        : [...prev.services, svc],
    }));
  };

  // --- CLIENT ASSIGNMENTS ---
  const openAssignModal = (user: ProfileRow) => {
    setSelectedUser(user);
    const currentAssigned = assignments.filter((a) => a.marketer_id === user.id).map((a) => a.client_id);
    setAssignedClientIds(currentAssigned);
    setShowAssignModal(true);
    clearMessages();
  };

  const toggleAssignClient = (clientId: string) => {
    setAssignedClientIds((prev) => prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]);
  };

  const handleSaveAssignments = async () => {
    if (!selectedUser) return;
    clearMessages();
    setSaving(true);
    try {
      const res = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selectedUser.id, action: "assign_clients", client_ids: assignedClientIds }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flashSuccess("Client assignments updated.");
      setShowAssignModal(false);
      loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update assignments");
    } finally {
      setSaving(false);
    }
  };

  const getAssignmentsForUser = (userId: string) => assignments.filter((a) => a.marketer_id === userId);

  const getClientLabel = (clientId: string) => {
    const c = allClients.find((cl) => cl.id === clientId);
    if (!c) return "Unknown";
    const personName = c.profiles?.display_name;
    if (personName && personName !== c.company_name) return `${personName} (${c.company_name})`;
    return c.company_name;
  };

  // --- HELPERS ---
  const getClientForUser = (userId: string) =>
    clients.find((c) => c.user_id === userId);

  const filteredProfiles = filterRole === "all"
    ? profiles
    : profiles.filter((p) => p.role === filterRole);

  if (loading) {
    return <div className="text-otai-text-secondary">Loading users...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCog size={24} className="text-otai-purple" />
            User Management
          </h1>
          <p className="text-otai-text-secondary text-sm mt-1">
            {profiles.length} total user{profiles.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { resetNewUserForm(); setShowAddModal(true); clearMessages(); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        {["all", "owner", "marketing", "sales_rep", "client"].map((r) => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterRole === r
                ? "bg-otai-purple text-white"
                : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"
            }`}
          >
            {r === "all" ? "All" : ROLE_LABELS[r] || r}
          </button>
        ))}
      </div>

      {/* User List */}
      <div className="space-y-3">
        {filteredProfiles.map((user) => {
          const client = getClientForUser(user.id);
          return (
            <div
              key={user.id}
              className={`bg-otai-dark border rounded-xl p-4 transition-colors ${
                user.status === "inactive"
                  ? "border-otai-red/20 opacity-60"
                  : "border-otai-border hover:border-otai-purple/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-white font-medium">{user.display_name || user.email}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || "bg-gray-500/10 text-gray-400"}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                    {user.status === "inactive" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-otai-red/10 text-otai-red">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-otai-text-muted flex-wrap">
                    <span>{user.email}</span>
                    {user.username && <span>@{user.username}</span>}
                    {client && (
                      <span className="text-otai-text-secondary">
                        {client.company_name} · ${Number(client.deal_value_monthly).toLocaleString()}/mo
                      </span>
                    )}
                  </div>
                  {client && client.client_services && client.client_services.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {client.client_services.map((s) => (
                        <span key={s.id} className="px-2 py-0.5 bg-otai-purple/5 border border-otai-purple/20 rounded text-xs text-otai-text-secondary">
                          {SERVICE_OPTIONS.find((o) => o.value === s.service_type)?.label || s.service_type}
                        </span>
                      ))}
                    </div>
                  )}
                  {user.role === "marketing" && (
                    <div className="mt-2">
                      {getAssignmentsForUser(user.id).length > 0 ? (
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-[10px] text-otai-text-muted uppercase tracking-wide self-center mr-1">Clients:</span>
                          {getAssignmentsForUser(user.id).map((a) => (
                            <span key={a.id} className="px-2 py-0.5 bg-blue-500/5 border border-blue-500/20 rounded text-xs text-blue-400">
                              {getClientLabel(a.client_id)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-otai-text-muted italic">No clients assigned</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-2 rounded-lg text-otai-text-muted hover:text-white hover:bg-white/5 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  {user.role === "marketing" && (
                    <button
                      onClick={() => openAssignModal(user)}
                      className="p-2 rounded-lg text-otai-text-muted hover:text-blue-400 hover:bg-blue-400/5 transition-colors"
                      title="Assign Clients"
                    >
                      <Users size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => openRoleModal(user)}
                    className="p-2 rounded-lg text-otai-text-muted hover:text-otai-purple hover:bg-otai-purple/5 transition-colors"
                    title="Change Role"
                  >
                    <Shield size={14} />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className={`p-2 rounded-lg transition-colors ${
                      user.status === "active"
                        ? "text-otai-text-muted hover:text-otai-gold hover:bg-otai-gold/5"
                        : "text-otai-text-muted hover:text-otai-green hover:bg-otai-green/5"
                    }`}
                    title={user.status === "active" ? "Deactivate" : "Activate"}
                  >
                    {user.status === "active" ? <UserX size={14} /> : <UserCheck size={14} />}
                  </button>
                  {user.role !== "owner" && (
                    <button
                      onClick={() => openDeleteConfirm(user)}
                      className="p-2 rounded-lg text-otai-text-muted hover:text-otai-red hover:bg-otai-red/5 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredProfiles.length === 0 && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
            <UserCog size={40} className="text-otai-text-muted mx-auto mb-3" />
            <p className="text-otai-text-secondary text-sm">No users found for this filter.</p>
          </div>
        )}
      </div>

      {/* ============ ADD USER MODAL ============ */}
      {showAddModal && (
        <ModalOverlay onClose={() => setShowAddModal(false)}>
          <div className="max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="text-otai-text-muted hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Role</label>
                <div className="relative">
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-otai-purple"
                  >
                    <option value="client">Client</option>
                    <option value="sales_rep">Sales Rep</option>
                    <option value="marketing">Marketing</option>
                    <option value="owner">Owner</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Credentials */}
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Display Name *" value={newUser.display_name}
                  onChange={(v) => setNewUser({ ...newUser, display_name: v })} />
                <FormInput label="Username" value={newUser.username}
                  onChange={(v) => setNewUser({ ...newUser, username: v })} />
              </div>
              <FormInput label="Email *" type="email" value={newUser.email}
                onChange={(v) => setNewUser({ ...newUser, email: v })} />
              <div className="relative">
                <FormInput label="Password *" type={showPassword ? "text" : "password"}
                  value={newUser.password}
                  onChange={(v) => setNewUser({ ...newUser, password: v })} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-otai-text-muted hover:text-white"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Client-specific fields */}
              {newUser.role === "client" && (
                <>
                  <div className="border-t border-otai-border pt-4 mt-2">
                    <p className="text-xs text-otai-purple uppercase tracking-wide font-medium mb-3">Client Details</p>
                  </div>
                  <FormInput label="Company Name *" value={newUser.company_name}
                    onChange={(v) => setNewUser({ ...newUser, company_name: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Phone" value={newUser.phone}
                      onChange={(v) => setNewUser({ ...newUser, phone: v })} />
                    <FormInput label="Industry" value={newUser.industry}
                      onChange={(v) => setNewUser({ ...newUser, industry: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Upfront Value ($)" type="number" value={newUser.deal_value_upfront}
                      onChange={(v) => setNewUser({ ...newUser, deal_value_upfront: v })} />
                    <FormInput label="Monthly Value ($)" type="number" value={newUser.deal_value_monthly}
                      onChange={(v) => setNewUser({ ...newUser, deal_value_monthly: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Renewal Day (1-31)" type="number" value={newUser.renewal_date_day}
                      onChange={(v) => setNewUser({ ...newUser, renewal_date_day: v })} />
                    <FormInput label="Contract Start" type="date" value={newUser.contract_start_date}
                      onChange={(v) => setNewUser({ ...newUser, contract_start_date: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Potential Value ($)" type="number" value={newUser.potential_value}
                      onChange={(v) => setNewUser({ ...newUser, potential_value: v })} />
                    <FormInput label="Lead Source" value={newUser.lead_source}
                      onChange={(v) => setNewUser({ ...newUser, lead_source: v })} />
                  </div>
                  <FormInput label="Upsell Notes" value={newUser.upsell_notes}
                    onChange={(v) => setNewUser({ ...newUser, upsell_notes: v })} />

                  {/* Services Multi-Select */}
                  <div>
                    <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-2">Services</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SERVICE_OPTIONS.map((svc) => (
                        <button
                          key={svc.value}
                          type="button"
                          onClick={() => toggleService(svc.value)}
                          className={`px-3 py-2 rounded-lg text-xs text-left transition-colors border ${
                            newUser.services.includes(svc.value)
                              ? "border-otai-purple bg-otai-purple/10 text-otai-purple"
                              : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                          }`}
                        >
                          {svc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-otai-border">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Create User
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ============ EDIT USER MODAL ============ */}
      {showEditModal && selectedUser && (
        <ModalOverlay onClose={() => setShowEditModal(false)}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Edit User</h2>
            <button onClick={() => setShowEditModal(false)} className="text-otai-text-muted hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <FormInput label="Display Name" value={editForm.display_name}
              onChange={(v) => setEditForm({ ...editForm, display_name: v })} />
            <FormInput label="Username" value={editForm.username}
              onChange={(v) => setEditForm({ ...editForm, username: v })} />
            <FormInput label="Email" type="email" value={editForm.email}
              onChange={(v) => setEditForm({ ...editForm, email: v })} />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-otai-border">
            <button onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={handleEditUser} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ============ ROLE CHANGE MODAL ============ */}
      {showRoleModal && selectedUser && (
        <ModalOverlay onClose={() => setShowRoleModal(false)}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Change Role</h2>
            <button onClick={() => setShowRoleModal(false)} className="text-otai-text-muted hover:text-white">
              <X size={20} />
            </button>
          </div>
          <p className="text-otai-text-secondary text-sm mb-4">
            Changing <span className="text-white font-medium">{selectedUser.display_name}</span>&apos;s role.
            Old data stays preserved; the user starts fresh on the new side.
          </p>
          <div className="space-y-2 mb-6">
            {(["owner", "marketing", "sales_rep", "client"] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setNewRole(r)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${
                  newRole === r
                    ? "border-otai-purple bg-otai-purple/10 text-white"
                    : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                }`}
              >
                <span className="font-medium">{ROLE_LABELS[r]}</span>
                {r === selectedUser.role && (
                  <span className="ml-2 text-xs text-otai-text-muted">(current)</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-otai-border">
            <button onClick={() => setShowRoleModal(false)}
              className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={handleRoleChange} disabled={saving || newRole === selectedUser.role}
              className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Change Role
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ============ DELETE CONFIRM MODAL ============ */}
      {showDeleteConfirm && selectedUser && (
        <ModalOverlay onClose={() => setShowDeleteConfirm(false)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-otai-red">Remove User</h2>
            <button onClick={() => setShowDeleteConfirm(false)} className="text-otai-text-muted hover:text-white">
              <X size={20} />
            </button>
          </div>
          <p className="text-otai-text-secondary text-sm mb-2">
            Are you sure you want to permanently remove{" "}
            <span className="text-white font-medium">{selectedUser.display_name}</span>?
          </p>
          <p className="text-otai-red/70 text-xs mb-6">
            This will delete their auth account, profile, and any associated client/service records.
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-otai-border">
            <button onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-otai-red hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Remove Permanently
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ============ ASSIGN CLIENTS MODAL ============ */}
      {showAssignModal && selectedUser && (
        <ModalOverlay onClose={() => setShowAssignModal(false)}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Assign Clients</h2>
            <button onClick={() => setShowAssignModal(false)} className="text-otai-text-muted hover:text-white"><X size={20} /></button>
          </div>
          <p className="text-otai-text-secondary text-sm mb-4">Select which clients <span className="text-white font-medium">{selectedUser.display_name}</span> can manage.</p>
          {error && <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm"><AlertCircle size={16} /> {error}</div>}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {allClients.length === 0 ? (
              <p className="text-otai-text-muted text-sm text-center py-4">No clients in the system yet.</p>
            ) : (
              allClients.map((c) => {
                const personName = c.profiles?.display_name;
                const label = personName && personName !== c.company_name ? `${personName} (${c.company_name})` : c.company_name;
                const isAssigned = assignedClientIds.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleAssignClient(c.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm flex items-center justify-between ${isAssigned ? "border-blue-500/40 bg-blue-500/10 text-white" : "border-otai-border text-otai-text-secondary hover:border-blue-500/30"}`}>
                    <span>{label}</span>
                    {isAssigned && <Check size={14} className="text-blue-400" />}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-otai-border">
            <span className="text-xs text-otai-text-muted">{assignedClientIds.length} client{assignedClientIds.length !== 1 ? "s" : ""} selected</span>
            <div className="flex gap-3">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSaveAssignments} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />} Save Assignments
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ============ REUSABLE COMPONENTS ============

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-lg p-6 z-10">
        {children}
      </div>
    </div>
  );
}

function FormInput({
  label, value, onChange, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-otai-text-muted focus:outline-none focus:border-otai-purple transition-colors"
      />
    </div>
  );
}
