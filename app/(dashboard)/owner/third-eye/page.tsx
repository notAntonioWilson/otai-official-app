"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Eye, ArrowLeft, ChevronDown, Pencil, Save, X,
  Loader2, Check, AlertCircle, Globe, MessageSquare, Phone,
  Zap, Share2, Mail, Smartphone, Puzzle, Bell, BarChart3,
} from "lucide-react";

type ViewRole = "client" | "sales_rep" | "marketing";

interface ProfileRow {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  role: string;
  status: string;
}

interface ClientRow {
  id: string;
  user_id: string;
  company_name: string;
  status: string;
}

interface ServiceRow {
  id: string;
  client_id: string;
  service_type: string;
  custom_service_name: string | null;
  status: string;
  objective_text: string | null;
}

interface DataBlock {
  id: string;
  client_service_id: string;
  block_type: string;
  label: string;
  value: string;
  display_order: number;
  show_on_dashboard: boolean;
}

interface UpdateRow {
  id: string;
  client_id: string;
  title: string | null;
  content: string | null;
  source: string;
  created_at: string;
}

interface DailyReport {
  id: string;
  sales_rep_id: string;
  report_date: string;
  total_calls: number;
  total_answers: number;
  callbacks: number;
  send_info: number;
  bookings: number;
}

const SERVICE_ICONS: Record<string, typeof Globe> = {
  website_seo: Globe, chatbot: MessageSquare, phone_agent: Phone,
  automations: Zap, social_media: Share2, email_outreach: Mail,
  app: Smartphone, custom: Puzzle,
};

const SERVICE_NAMES: Record<string, string> = {
  website_seo: "Website & SEO", chatbot: "Chatbot", phone_agent: "Phone Agent",
  automations: "Automations", social_media: "Social Media",
  email_outreach: "Email Outreach", app: "App", custom: "Custom",
};

export default function OwnerThirdEye() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  // Selection
  const [selectedRole, setSelectedRole] = useState<ViewRole | "">("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [viewing, setViewing] = useState(false);

  // Mirror data
  const [viewProfile, setViewProfile] = useState<ProfileRow | null>(null);
  const [clientData, setClientData] = useState<ClientRow | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [dataBlocks, setDataBlocks] = useState<DataBlock[]>([]);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);

  // Editing
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Client view tab
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const loadProfiles = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, email, username, display_name, role, status")
      .in("role", ["client", "sales_rep", "marketing"])
      .eq("status", "active")
      .order("display_name");
    setProfiles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const roleUsers = profiles.filter((p) => p.role === selectedRole);

  const enterView = async () => {
    if (!selectedUserId) return;
    const supabase = createClient();
    const profile = profiles.find((p) => p.id === selectedUserId);
    if (!profile) return;
    setViewProfile(profile);

    if (profile.role === "client") {
      const { data: client } = await supabase.from("clients").select("*").eq("user_id", profile.id).maybeSingle();
      setClientData(client);

      if (client) {
        const { data: svcs } = await supabase.from("client_services").select("*").eq("client_id", client.id).eq("status", "active");
        setServices(svcs || []);

        if (svcs && svcs.length > 0) {
          const svcIds = svcs.map((s) => s.id);
          const { data: blocks } = await supabase.from("service_data_blocks").select("*").in("client_service_id", svcIds).order("display_order");
          setDataBlocks(blocks || []);
        }

        const { data: ups } = await supabase.from("client_updates").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
        setUpdates(ups || []);
      }
      setActiveTab("dashboard");
    }

    if (profile.role === "sales_rep") {
      const { data: reports } = await supabase.from("sales_daily_reports").select("*").eq("sales_rep_id", profile.id).order("report_date", { ascending: false });
      setDailyReports(reports || []);
    }

    setViewing(true);
  };

  const exitView = () => {
    setViewing(false);
    setViewProfile(null);
    setClientData(null);
    setServices([]);
    setDataBlocks([]);
    setUpdates([]);
    setDailyReports([]);
    setEditingBlock(null);
    setSuccess("");
    setError("");
  };

  const startEdit = (block: DataBlock) => {
    setEditingBlock(block.id);
    setEditValue(block.value);
  };

  const saveEdit = async (blockId: string) => {
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("service_data_blocks")
      .update({ value: editValue, updated_at: new Date().toISOString() })
      .eq("id", blockId);

    if (err) { setError(err.message); setSaving(false); return; }

    setDataBlocks((prev) => prev.map((b) => b.id === blockId ? { ...b, value: editValue } : b));
    setEditingBlock(null);
    setSaving(false);
    setSuccess("Updated.");
    setTimeout(() => setSuccess(""), 2000);
  };

  if (loading) {
    return <div className="text-otai-text-secondary">Loading Third Eye...</div>;
  }

  // === MIRROR VIEW ===
  if (viewing && viewProfile) {
    return (
      <div>
        {/* Red BACK button */}
        <button
          onClick={exitView}
          className="fixed top-4 left-4 md:left-64 z-[60] flex items-center gap-2 px-4 py-2.5 bg-otai-red hover:bg-red-600 text-white rounded-lg text-sm font-bold shadow-lg transition-colors"
        >
          <ArrowLeft size={16} /> BACK
        </button>

        {/* Third Eye indicator */}
        <div className="mb-6 mt-2 p-3 bg-otai-purple/10 border border-otai-purple/30 rounded-xl flex items-center gap-3">
          <Eye size={18} className="text-otai-purple" />
          <div>
            <p className="text-white text-sm font-medium">
              Viewing as: {viewProfile.display_name}
            </p>
            <p className="text-otai-text-muted text-xs capitalize">{viewProfile.role.replace("_", " ")}</p>
          </div>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm">
            <Check size={16} /> {success}
          </div>
        )}

        {/* CLIENT MIRROR */}
        {viewProfile.role === "client" && clientData && (
          <div>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
              <TabBtn active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} label="Dashboard" />
              <TabBtn active={activeTab === "updates"} onClick={() => setActiveTab("updates")} label="Updates" />
              {services.map((s) => (
                <TabBtn key={s.id} active={activeTab === s.id} onClick={() => setActiveTab(s.id)}
                  label={s.service_type === "custom" ? s.custom_service_name || "Custom" : SERVICE_NAMES[s.service_type] || s.service_type} />
              ))}
            </div>

            {/* Dashboard Tab */}
            {activeTab === "dashboard" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Dashboard — {clientData.company_name}</h2>
                {dataBlocks.filter((b) => b.show_on_dashboard).length === 0 ? (
                  <div className="bg-otai-dark border border-otai-border rounded-xl p-8 text-center text-otai-text-muted text-sm">
                    No dashboard blocks configured.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {dataBlocks.filter((b) => b.show_on_dashboard).map((block) => {
                      const svc = services.find((s) => s.id === block.client_service_id);
                      return (
                        <div key={block.id} className="bg-otai-dark border border-otai-border rounded-xl p-4 group relative">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-6 rounded-full bg-otai-purple" />
                            <span className="text-[10px] text-otai-text-muted uppercase tracking-wide">
                              {svc ? SERVICE_NAMES[svc.service_type] || svc.service_type : ""}
                            </span>
                          </div>
                          <p className="text-otai-text-secondary text-xs mb-1">{block.label}</p>
                          {editingBlock === block.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 bg-black border border-otai-purple rounded px-2 py-1 text-white text-sm focus:outline-none"
                                autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit(block.id)}
                              />
                              <button onClick={() => saveEdit(block.id)} disabled={saving}
                                className="text-otai-green hover:text-green-400"><Save size={14} /></button>
                              <button onClick={() => setEditingBlock(null)}
                                className="text-otai-text-muted hover:text-white"><X size={14} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-white text-xl font-bold">{block.value || "0"}</p>
                              <button onClick={() => startEdit(block)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-otai-text-muted hover:text-otai-purple transition-all">
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Updates Tab */}
            {activeTab === "updates" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Bell size={18} className="text-otai-gold" /> Updates
                </h2>
                {updates.length === 0 ? (
                  <div className="bg-otai-dark border border-otai-border rounded-xl p-8 text-center text-otai-text-muted text-sm">No updates.</div>
                ) : (
                  <div className="space-y-3">
                    {updates.map((u) => (
                      <div key={u.id} className="bg-otai-dark border border-otai-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium text-sm">{u.title || "Update"}</span>
                          <span className="text-otai-text-muted text-xs">
                            {new Date(u.created_at).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-otai-text-secondary text-sm whitespace-pre-wrap">{u.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Service Tabs */}
            {services.map((svc) => {
              if (activeTab !== svc.id) return null;
              const svcBlocks = dataBlocks.filter((b) => b.client_service_id === svc.id).sort((a, b) => a.display_order - b.display_order);
              const Icon = SERVICE_ICONS[svc.service_type] || Puzzle;

              return (
                <div key={svc.id}>
                  <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Icon size={18} className="text-otai-purple" />
                    {svc.service_type === "custom" ? svc.custom_service_name || "Custom" : SERVICE_NAMES[svc.service_type]}
                  </h2>
                  {svc.objective_text && (
                    <p className="text-otai-text-secondary text-sm mb-4">{svc.objective_text}</p>
                  )}

                  {svcBlocks.length === 0 ? (
                    <div className="bg-otai-dark border border-otai-border rounded-xl p-8 text-center text-otai-text-muted text-sm">
                      No data blocks configured for this service.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {svcBlocks.map((block) => (
                        <div key={block.id} className="bg-otai-dark border border-otai-border rounded-xl p-4 group relative">
                          <p className="text-otai-text-muted text-xs mb-1">{block.label}</p>
                          {editingBlock === block.id ? (
                            <div className="flex items-center gap-2">
                              <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 bg-black border border-otai-purple rounded px-2 py-1 text-white text-sm focus:outline-none"
                                autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit(block.id)} />
                              <button onClick={() => saveEdit(block.id)} disabled={saving} className="text-otai-green"><Save size={14} /></button>
                              <button onClick={() => setEditingBlock(null)} className="text-otai-text-muted"><X size={14} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-white text-lg font-bold">{block.value || "—"}</p>
                              <button onClick={() => startEdit(block)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-otai-text-muted hover:text-otai-purple transition-all">
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* SALES REP MIRROR */}
        {viewProfile.role === "sales_rep" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-otai-gold" />
              {viewProfile.display_name}&apos;s Reports
            </h2>

            {dailyReports.length === 0 ? (
              <div className="bg-otai-dark border border-otai-border rounded-xl p-8 text-center text-otai-text-muted text-sm">
                No daily reports submitted yet.
              </div>
            ) : (
              <div className="bg-otai-dark border border-otai-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-otai-text-muted text-xs uppercase tracking-wide">
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-right p-4 font-medium">Calls</th>
                        <th className="text-right p-4 font-medium">Answers</th>
                        <th className="text-right p-4 font-medium">Callbacks</th>
                        <th className="text-right p-4 font-medium">Send Info</th>
                        <th className="text-right p-4 font-medium">Bookings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-otai-border">
                      {dailyReports.map((r) => (
                        <tr key={r.id} className="hover:bg-white/[0.02]">
                          <td className="p-4 text-white">{r.report_date}</td>
                          <td className="p-4 text-right text-otai-text-secondary">{r.total_calls}</td>
                          <td className="p-4 text-right text-otai-text-secondary">{r.total_answers}</td>
                          <td className="p-4 text-right text-otai-text-secondary">{r.callbacks}</td>
                          <td className="p-4 text-right text-otai-text-secondary">{r.send_info}</td>
                          <td className="p-4 text-right text-otai-green font-medium">{r.bookings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-otai-border text-xs text-otai-text-muted">
                  Totals: {dailyReports.reduce((s, r) => s + r.total_calls, 0)} calls · {dailyReports.reduce((s, r) => s + r.bookings, 0)} bookings
                </div>
              </div>
            )}
          </div>
        )}

        {/* MARKETING MIRROR */}
        {viewProfile.role === "marketing" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              {viewProfile.display_name}&apos;s Marketing View
            </h2>
            <div className="bg-otai-dark border border-otai-border rounded-xl p-8 text-center text-otai-text-muted text-sm">
              Marketing mirror shows their calendar and client assignments. Use Marketing Oversight for full access.
            </div>
          </div>
        )}

        {/* Client not found */}
        {viewProfile.role === "client" && !clientData && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-8 text-center text-otai-text-muted text-sm">
            No client record found for this user.
          </div>
        )}
      </div>
    );
  }

  // === SELECTOR VIEW ===
  return (
    <div>
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
        <Eye size={24} className="text-otai-purple" />
        Third Eye
      </h1>
      <p className="text-otai-text-secondary text-sm mb-8">
        Mirror into any user&apos;s view. See exactly what they see and edit data directly.
      </p>

      <div className="max-w-md space-y-6">
        {/* Role Selector */}
        <div>
          <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-2">1. Select Role</label>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: "client", label: "Client" },
              { value: "sales_rep", label: "Sales Rep" },
              { value: "marketing", label: "Marketing" },
            ] as { value: ViewRole; label: string }[]).map((r) => (
              <button
                key={r.value}
                onClick={() => { setSelectedRole(r.value); setSelectedUserId(""); }}
                className={`px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                  selectedRole === r.value
                    ? "border-otai-purple bg-otai-purple/10 text-white"
                    : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Selector */}
        {selectedRole && (
          <div>
            <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-2">2. Select User</label>
            {roleUsers.length === 0 ? (
              <p className="text-otai-text-muted text-sm">No active users with this role.</p>
            ) : (
              <div className="space-y-2">
                {roleUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm ${
                      selectedUserId === u.id
                        ? "border-otai-purple bg-otai-purple/10 text-white"
                        : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                    }`}
                  >
                    <span className="font-medium">{u.display_name}</span>
                    <span className="text-otai-text-muted ml-2 text-xs">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enter Button */}
        {selectedUserId && (
          <button
            onClick={enterView}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Eye size={16} /> Enter Third Eye View
          </button>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-otai-purple text-white"
          : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
