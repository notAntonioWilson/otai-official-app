"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3, Pencil, Save, X, Check, Loader2, RefreshCw,
  Trophy, ChevronDown, DollarSign, Rocket, Target, Star, Flame,
  Shield, Crown, Users, ChevronRight, Zap,
} from "lucide-react";

interface ProfileRow {
  id: string;
  display_name: string | null;
  email: string;
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

export default function OwnerSalesOversight() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [reps, setReps] = useState<ProfileRow[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [filterRep, setFilterRep] = useState("all");

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ total_calls: 0, total_answers: 0, callbacks: 0, send_info: 0, bookings: 0 });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [showCommission, setShowCommission] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: repProfiles } = await supabase.from("profiles").select("id, display_name, email").eq("role", "sales_rep");
    setReps(repProfiles || []);

    const { data: r } = await supabase.from("sales_daily_reports").select("*").order("report_date", { ascending: false });
    setReports(r || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const repNameMap: Record<string, string> = {};
  reps.forEach((r) => { repNameMap[r.id] = r.display_name || r.email; });

  const filtered = filterRep === "all" ? reports : reports.filter((r) => r.sales_rep_id === filterRep);

  // Leaderboard totals
  const repTotals = reps.map((rep) => {
    const repReports = reports.filter((r) => r.sales_rep_id === rep.id);
    return {
      id: rep.id,
      name: rep.display_name || rep.email,
      totalCalls: repReports.reduce((s, r) => s + r.total_calls, 0),
      totalBookings: repReports.reduce((s, r) => s + r.bookings, 0),
    };
  }).sort((a, b) => b.totalBookings - a.totalBookings);

  const startEdit = (r: DailyReport) => {
    setEditingId(r.id);
    setEditForm({
      total_calls: r.total_calls,
      total_answers: r.total_answers,
      callbacks: r.callbacks,
      send_info: r.send_info,
      bookings: r.bookings,
    });
  };

  const saveEdit = async (report: DailyReport) => {
    setSaving(true);

    const res = await fetch("/api/sales-oversight", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: report.id,
        ...editForm,
        owner_id: userId,
        old_value: {
          total_calls: report.total_calls, total_answers: report.total_answers,
          callbacks: report.callbacks, send_info: report.send_info, bookings: report.bookings,
        },
      }),
    });

    const data = await res.json();
    setSaving(false);
    if (data.error) { setSuccess(""); return; }
    setEditingId(null);
    setSuccess("Numbers updated (logged in audit trail).");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  if (loading) return <div className="text-otai-text-secondary">Loading sales oversight...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-otai-purple" /> Sales Oversight
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCommission(true)} className="flex items-center gap-2 px-3 py-2 bg-otai-gold/10 border border-otai-gold/30 rounded-lg text-otai-gold hover:bg-otai-gold/20 text-sm font-medium">
            <DollarSign size={14} /> Commission
          </button>
          <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 bg-otai-dark border border-otai-border rounded-lg text-otai-text-secondary hover:text-white text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm"><Check size={16} /> {success}</div>
      )}

      {/* All-Time Leaderboard */}
      <div className="bg-otai-dark border border-otai-border rounded-xl mb-6">
        <div className="p-5 border-b border-otai-border">
          <h2 className="text-white font-semibold flex items-center gap-2"><Trophy size={16} className="text-otai-gold" /> All-Time Leaderboard</h2>
        </div>
        {repTotals.length === 0 ? (
          <div className="p-8 text-center text-otai-text-muted text-sm">No sales reps.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-otai-text-muted text-xs uppercase tracking-wide">
                  <th className="text-left p-4 font-medium">Rank</th>
                  <th className="text-left p-4 font-medium">Rep</th>
                  <th className="text-right p-4 font-medium">Total Calls</th>
                  <th className="text-right p-4 font-medium">Total Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-otai-border">
                {repTotals.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="p-4">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? "bg-otai-gold/20 text-otai-gold" : idx === 1 ? "bg-gray-400/20 text-gray-300" : idx === 2 ? "bg-orange-400/20 text-orange-400" : "bg-white/5 text-otai-text-muted"
                      }`}>{idx + 1}</span>
                    </td>
                    <td className="p-4 text-white font-medium">{r.name}</td>
                    <td className="p-4 text-right text-otai-text-secondary">{r.totalCalls.toLocaleString()}</td>
                    <td className="p-4 text-right text-otai-green font-medium">{r.totalBookings.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-otai-text-muted">Filter by rep:</span>
        <div className="relative">
          <select value={filterRep} onChange={(e) => setFilterRep(e.target.value)}
            className="bg-otai-dark border border-otai-border rounded-lg px-3 py-2 text-xs text-otai-text-secondary appearance-none pr-7 focus:outline-none focus:border-otai-purple">
            <option value="all">All Reps</option>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.display_name || r.email}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Daily Submissions Table */}
      <div className="bg-otai-dark border border-otai-border rounded-xl">
        <div className="p-5 border-b border-otai-border">
          <h2 className="text-white font-semibold">Daily Submissions ({filtered.length})</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-otai-text-muted text-sm">No submissions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-otai-text-muted text-xs uppercase tracking-wide">
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Rep</th>
                  <th className="text-right p-4 font-medium">Calls</th>
                  <th className="text-right p-4 font-medium">Answers</th>
                  <th className="text-right p-4 font-medium">Callbacks</th>
                  <th className="text-right p-4 font-medium">Send Info</th>
                  <th className="text-right p-4 font-medium">Bookings</th>
                  <th className="text-right p-4 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-otai-border">
                {filtered.map((r) => {
                  const isEditing = editingId === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 text-white">{r.report_date}</td>
                      <td className="p-4 text-otai-text-secondary">{repNameMap[r.sales_rep_id] || "Unknown"}</td>
                      {isEditing ? (
                        <>
                          <EditCell value={editForm.total_calls} onChange={(v) => setEditForm({ ...editForm, total_calls: v })} />
                          <EditCell value={editForm.total_answers} onChange={(v) => setEditForm({ ...editForm, total_answers: v })} />
                          <EditCell value={editForm.callbacks} onChange={(v) => setEditForm({ ...editForm, callbacks: v })} />
                          <EditCell value={editForm.send_info} onChange={(v) => setEditForm({ ...editForm, send_info: v })} />
                          <EditCell value={editForm.bookings} onChange={(v) => setEditForm({ ...editForm, bookings: v })} />
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => saveEdit(r)} disabled={saving}
                                className="p-1.5 text-otai-green hover:text-green-400 rounded">
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 text-otai-text-muted hover:text-white rounded"><X size={13} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4 text-right text-otai-text-secondary">{r.total_calls}</td>
                          <td className="p-4 text-right text-otai-text-secondary">{r.total_answers}</td>
                          <td className="p-4 text-right text-otai-text-secondary">{r.callbacks}</td>
                          <td className="p-4 text-right text-otai-text-secondary">{r.send_info}</td>
                          <td className="p-4 text-right text-otai-green font-medium">{r.bookings}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => startEdit(r)} className="p-1.5 text-otai-text-muted hover:text-otai-purple rounded"><Pencil size={13} /></button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Commission Modal */}
      {showCommission && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowCommission(false)} />
          <div className="relative bg-black border border-otai-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto z-10 p-6">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-black pb-4 border-b border-otai-border -mx-6 px-6 -mt-6 pt-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Trophy size={20} className="text-otai-gold" /> Commission & Ranking System</h2>
              <button onClick={() => setShowCommission(false)} className="p-2 rounded-lg text-otai-text-muted hover:text-white hover:bg-white/5"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <CommissionTier title="Starting Point" subtitle="Where every champion begins" color="#1E3A5F" border="#2563EB" icon={Rocket}
                stats={[{label:"Commission Rate",value:"20%"},{label:"Monthly Retaining",value:"3%"}]} />
              <CommissionTier title="Monthly Winner Bonus" subtitle="Compete to be #1" color="#4C1D95" border="#7C3AED" icon={Trophy}
                stats={[{label:"Reward",value:"+0.5%"},{label:"Type",value:"Permanent"}]}
                body="The person with the most bookings at the end of each month gets a permanent 0.5% commission increase." />
              <CommissionTier title="Level 1: Consistent Performer" subtitle="150 bookings per month" color="#14532D" border="#22C55E" icon={Target}
                stats={[{label:"Monthly Goal",value:"150"},{label:"Daily Target",value:"5"},{label:"Commission",value:"+5%"}]}
                body="That's just 5 bookings per day. Achievable with focus and consistency." />
              <CommissionTier title="Level 2: Career Milestone" subtitle="500 total bookings (lifetime)" color="#7C2D12" border="#F97316" icon={Star}
                stats={[{label:"Total Bookings",value:"500"},{label:"Commission",value:"+5%"}]}
                body="Unlocks sales calls, Zoom meetings, and closing training." />
              <CommissionTier title="Level 3: Elite Status" subtitle="500 bookings in a single month" color="#7F1D1D" border="#EF4444" icon={Flame}
                stats={[{label:"Monthly Goal",value:"500"},{label:"Daily Target",value:"~17"},{label:"Commission",value:"+10%"}]}
                body="This is where legends are made. ~17 bookings per day with the right systems." />
              <CommissionTier title="Level 4: Closer Training" subtitle="Owner approval required" color="#134E4A" border="#14B8A6" icon={Shield}
                stats={[{label:"Commission",value:"+15%"},{label:"Retaining",value:"5%"}]}
                body="Start closing calls with supervision, then independently." />
              <CommissionTier title="Level 5: Master Closer" subtitle="15 successful closes" color="#713F12" border="#EAB308" icon={Crown}
                stats={[{label:"Close Commission",value:"40%"},{label:"Recurring",value:"10%"}]}
                body="Highest individual tier. 40% on closes, 10% recurring monthly." />
              <CommissionTier title="Level 6: Team Leader" subtitle="Build your own sales team" color="#6B1A1A" border="#DC2626" icon={Users}
                stats={[]}
                body="Earn a percentage of all team bookings and closes. This is where real wealth is built." />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <td className="p-2 text-right">
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-16 bg-black border border-otai-purple rounded px-2 py-1 text-white text-sm text-right focus:outline-none" />
    </td>
  );
}

function CommissionTier({ title, subtitle, color, border, icon: Icon, stats, body }: {
  title: string; subtitle: string; color: string; border: string;
  icon: React.ElementType; stats: { label: string; value: string }[];
  body?: string;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}30` }}>
      <div className="p-4 flex items-center gap-3" style={{ backgroundColor: `${color}40` }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${border}20` }}>
          <Icon size={18} style={{ color: border }} />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">{title}</h3>
          <p className="text-[11px]" style={{ color: `${border}CC` }}>{subtitle}</p>
        </div>
      </div>
      {stats.length > 0 && (
        <div className="flex flex-wrap gap-4 px-4 py-3" style={{ backgroundColor: `${color}20` }}>
          {stats.map((s, i) => (
            <div key={i}>
              <p className="text-[10px] text-otai-text-muted uppercase">{s.label}</p>
              <p className="text-sm font-bold" style={{ color: border }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {body && <div className="px-4 py-3" style={{ backgroundColor: `${color}10` }}><p className="text-xs text-otai-text-secondary leading-relaxed">{body}</p></div>}
    </div>
  );
}
