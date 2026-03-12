"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Monitor, ToggleLeft, ToggleRight, ChevronDown, RefreshCw,
  Activity, Users, AlertTriangle, CheckCircle2, XCircle,
  ArrowRight, Clock, Loader2, Check, AlertCircle, X,
  Phone, MessageSquare, Mail, Zap, Radio,
} from "lucide-react";

interface Automation {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  category: string;
  status: string;
  vendor_tool: string | null;
  last_run: string | null;
}

interface ActivityEntry {
  id: string;
  automation_id: string;
  activity_type: string;
  agent_name: string;
  status: string;
  duration_seconds: number;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface QueueItem {
  id: string;
  automation_id: string;
  lead_name: string;
  lead_email: string;
  lead_phone: string | null;
  stage: string;
  last_touched_by: string | null;
  last_touched_at: string | null;
  next_action: string | null;
  notes: string | null;
  created_at: string;
}

interface ErrorEntry {
  id: string;
  automation_id: string;
  error_text: string;
  reason: string | null;
  resolution: string | null;
  status: string;
  created_at: string;
}

interface ClientOption {
  id: string;
  company_name: string;
}

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  chat: MessageSquare,
  email: Mail,
  task: Zap,
};

const VENDOR_TOOLS = ["n8n", "Make", "Vapi", "Voiceflow", "ManyChat"];

export default function OwnerControlRoom() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"otai" | "client">("otai");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [userId, setUserId] = useState("");

  // Manual override
  const [showOverride, setShowOverride] = useState(false);
  const [overrideItem, setOverrideItem] = useState<QueueItem | null>(null);
  const [overrideAction, setOverrideAction] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: clientsData } = await supabase.from("clients").select("id, company_name").order("company_name");
    setClients(clientsData || []);
    const map: Record<string, string> = {};
    (clientsData || []).forEach((c) => { map[c.id] = c.company_name; });
    setClientMap(map);

    const { data: autos } = await supabase.from("automations").select("*").order("name");
    setAutomations(autos || []);

    const { data: acts } = await supabase.from("automation_activity").select("*").order("created_at", { ascending: false }).limit(50);
    setActivities(acts || []);

    const { data: q } = await supabase.from("automation_queue").select("*").order("created_at", { ascending: false });
    setQueue(q || []);

    const { data: errs } = await supabase.from("automation_errors").select("*").order("created_at", { ascending: false }).limit(30);
    setErrors(errs || []);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter automations by tab + client
  const filteredAutomations = automations.filter((a) => {
    if (tab === "otai" && a.category !== "otai") return false;
    if (tab === "client" && a.category !== "client") return false;
    if (tab === "client" && clientFilter !== "all" && a.client_id !== clientFilter) return false;
    return true;
  });

  const filteredAutoIds = new Set(filteredAutomations.map((a) => a.id));
  const filteredActivities = activities.filter((a) => filteredAutoIds.has(a.automation_id));
  const filteredQueue = queue.filter((q) => filteredAutoIds.has(q.automation_id));
  const filteredErrors = errors.filter((e) => filteredAutoIds.has(e.automation_id));

  const queueNew = filteredQueue.filter((q) => q.stage === "new");
  const queueInProgress = filteredQueue.filter((q) => q.stage === "in_progress");
  const queueStuck = filteredQueue.filter((q) => q.stage === "stuck" || q.stage === "failed");

  const autoNameMap: Record<string, string> = {};
  automations.forEach((a) => { autoNameMap[a.id] = a.name; });

  const handleOverride = async () => {
    if (!overrideItem || !overrideAction) return;
    setSaving(true);
    const supabase = createClient();

    let newStage = overrideItem.stage;
    if (overrideAction === "move_in_progress") newStage = "in_progress";
    if (overrideAction === "move_completed") newStage = "completed";
    if (overrideAction === "move_stuck") newStage = "stuck";
    if (overrideAction === "force_followup") newStage = "in_progress";

    await supabase.from("automation_queue").update({
      stage: newStage,
      last_touched_by: userId,
      last_touched_at: new Date().toISOString(),
      next_action: overrideAction === "force_followup" ? "Follow-up forced by owner" : null,
      notes: overrideNotes || overrideItem.notes,
    }).eq("id", overrideItem.id);

    // Audit trail
    await supabase.from("audit_trail").insert({
      user_id: userId,
      action: overrideAction,
      target_table: "automation_queue",
      target_id: overrideItem.id,
      old_value: { stage: overrideItem.stage },
      new_value: { stage: newStage, notes: overrideNotes },
    });

    setSaving(false);
    setShowOverride(false);
    setSuccess("Override applied.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  const openOverride = (item: QueueItem) => {
    setOverrideItem(item);
    setOverrideAction("move_in_progress");
    setOverrideNotes("");
    setShowOverride(true);
  };

  const fmtTime = (ts: string) => new Date(ts).toLocaleString("en-US", {
    timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  if (loading) {
    return <div className="text-otai-text-secondary">Loading control room...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Monitor size={24} className="text-otai-purple" />
          Control Room
        </h1>
        <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 bg-otai-dark border border-otai-border rounded-lg text-otai-text-secondary hover:text-white text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Toggle: OTAI / Client */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setTab("otai")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "otai" ? "bg-otai-purple text-white" : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"
          }`}
        >
          {tab === "otai" ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          OTAI Automations
        </button>
        <button
          onClick={() => setTab("client")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "client" ? "bg-otai-purple text-white" : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"
          }`}
        >
          {tab === "client" ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          Client Automations
        </button>

        {tab === "client" && (
          <div className="relative">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="bg-otai-dark border border-otai-border rounded-lg px-3 py-2.5 text-sm text-otai-text-secondary appearance-none pr-8 focus:outline-none focus:border-otai-purple"
            >
              <option value="all">All Clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
          </div>
        )}
      </div>

      {/* Compact View — Live Activity */}
      <div className="bg-otai-dark border border-otai-border rounded-xl mb-6">
        <div className="flex items-center gap-2 p-5 border-b border-otai-border">
          <Activity size={16} className="text-otai-green" />
          <h2 className="text-white font-semibold">Live Activity</h2>
          <Radio size={12} className="text-otai-green animate-pulse ml-1" />
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-otai-text-muted text-sm">
            No live activity. Data will stream in once n8n automations are connected.
          </div>
        ) : (
          <div className="divide-y divide-otai-border max-h-64 overflow-y-auto">
            {filteredActivities.slice(0, 15).map((a) => {
              const Icon = ACTIVITY_ICONS[a.activity_type] || Zap;
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 px-5">
                  <Icon size={14} className={a.status === "active" ? "text-otai-green" : a.status === "failed" ? "text-otai-red" : "text-otai-text-muted"} />
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm">{a.agent_name}</span>
                    <span className="text-otai-text-muted text-xs ml-2">{autoNameMap[a.automation_id] || ""}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.status === "active" ? "bg-otai-green/10 text-otai-green"
                    : a.status === "completed" ? "bg-otai-text-muted/10 text-otai-text-muted"
                    : "bg-otai-red/10 text-otai-red"
                  }`}>{a.status}</span>
                  {a.duration_seconds > 0 && (
                    <span className="text-xs text-otai-text-muted">{a.duration_seconds}s</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Queue — 3 Columns */}
      <div className="mb-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Users size={16} className="text-otai-purple" /> Queue
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <QueueColumn title="New + Untouched" items={queueNew} color="text-otai-gold" autoNameMap={autoNameMap} onOverride={openOverride} fmtTime={fmtTime} />
          <QueueColumn title="In Progress" items={queueInProgress} color="text-blue-400" autoNameMap={autoNameMap} onOverride={openOverride} fmtTime={fmtTime} />
          <QueueColumn title="Stuck / Failed" items={queueStuck} color="text-otai-red" autoNameMap={autoNameMap} onOverride={openOverride} fmtTime={fmtTime} />
        </div>
      </div>

      {/* Error Feed */}
      <div className="bg-otai-dark border border-otai-border rounded-xl mb-6">
        <div className="flex items-center gap-2 p-5 border-b border-otai-border">
          <AlertTriangle size={16} className="text-otai-red" />
          <h2 className="text-white font-semibold">Error Feed</h2>
        </div>

        {filteredErrors.length === 0 ? (
          <div className="p-8 text-center text-otai-text-muted text-sm">
            No errors. Error data will populate once n8n pushes error logs.
          </div>
        ) : (
          <div className="divide-y divide-otai-border max-h-64 overflow-y-auto">
            {filteredErrors.map((e) => (
              <div key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white text-sm">{e.error_text}</p>
                    {e.reason && <p className="text-otai-text-muted text-xs mt-1">Reason: {e.reason}</p>}
                    {e.resolution && <p className="text-otai-green text-xs mt-1">Resolution: {e.resolution}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] shrink-0 ${
                    e.status === "open" ? "bg-otai-red/10 text-otai-red" : "bg-otai-green/10 text-otai-green"
                  }`}>{e.status}</span>
                </div>
                <p className="text-otai-text-muted text-xs mt-2">{fmtTime(e.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vendor Tools */}
      <div className="bg-otai-dark border border-otai-border rounded-xl">
        <div className="flex items-center gap-2 p-5 border-b border-otai-border">
          <Zap size={16} className="text-otai-gold" />
          <h2 className="text-white font-semibold">Vendor Tools</h2>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          {VENDOR_TOOLS.map((tool) => {
            const connected = automations.some((a) => a.vendor_tool?.toLowerCase() === tool.toLowerCase());
            return (
              <div key={tool} className="flex items-center gap-2 px-3 py-2.5 bg-black rounded-lg border border-otai-border">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-otai-green" : "bg-otai-text-muted"}`} />
                <span className="text-sm text-white">{tool}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ MANUAL OVERRIDE MODAL ============ */}
      {showOverride && overrideItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowOverride(false)} />
          <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Manual Override</h2>
              <button onClick={() => setShowOverride(false)} className="text-otai-text-muted hover:text-white"><X size={20} /></button>
            </div>

            <p className="text-otai-text-secondary text-sm mb-4">
              Lead: <span className="text-white font-medium">{overrideItem.lead_name}</span>
              <br />Current stage: <span className="text-white">{overrideItem.stage}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-2">Action</label>
                <div className="space-y-2">
                  {[
                    { value: "move_in_progress", label: "Move to In Progress" },
                    { value: "move_completed", label: "Mark as Done" },
                    { value: "move_stuck", label: "Move to Stuck" },
                    { value: "force_followup", label: "Force Follow-up" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setOverrideAction(opt.value)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                        overrideAction === opt.value
                          ? "border-otai-purple bg-otai-purple/10 text-white"
                          : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Notes (optional)</label>
                <textarea
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple resize-none"
                  placeholder="Reason for override..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-otai-border">
              <button onClick={() => setShowOverride(false)} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white transition-colors">Cancel</button>
              <button onClick={handleOverride} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Queue Column Component ===
function QueueColumn({
  title, items, color, autoNameMap, onOverride, fmtTime,
}: {
  title: string;
  items: QueueItem[];
  color: string;
  autoNameMap: Record<string, string>;
  onOverride: (item: QueueItem) => void;
  fmtTime: (ts: string) => string;
}) {
  return (
    <div className="bg-otai-dark border border-otai-border rounded-xl">
      <div className="p-4 border-b border-otai-border flex items-center justify-between">
        <h3 className={`text-sm font-medium ${color}`}>{title}</h3>
        <span className="text-xs text-otai-text-muted">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-otai-text-muted text-xs">Empty</div>
      ) : (
        <div className="divide-y divide-otai-border max-h-72 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="p-3 hover:bg-white/[0.01]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.lead_name}</p>
                  <p className="text-otai-text-muted text-xs truncate">{item.lead_email}</p>
                </div>
                <button
                  onClick={() => onOverride(item)}
                  className="shrink-0 p-1 rounded text-otai-text-muted hover:text-otai-purple transition-colors"
                  title="Override"
                >
                  <ArrowRight size={12} />
                </button>
              </div>
              {item.next_action && (
                <p className="text-otai-purple text-xs mt-1.5">Next: {item.next_action}</p>
              )}
              {item.last_touched_at && (
                <p className="text-otai-text-muted text-[10px] mt-1 flex items-center gap-1">
                  <Clock size={8} /> {fmtTime(item.last_touched_at)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
