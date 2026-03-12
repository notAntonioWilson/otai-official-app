"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Trophy, Send, Phone, CalendarCheck, RefreshCw,
  PhoneCall, PhoneForwarded, Info, Loader2, Check, AlertCircle,
} from "lucide-react";

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

interface LeaderboardEntry {
  sales_rep_id: string;
  display_name: string;
  total_calls: number;
  total_bookings: number;
}

function getESTDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export default function SalesLeaderboard() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [view, setView] = useState<"all_time" | "today">("all_time");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [todayReports, setTodayReports] = useState<DailyReport[]>([]);
  const [allReports, setAllReports] = useState<DailyReport[]>([]);
  const [repNames, setRepNames] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    total_calls: "",
    total_answers: "",
    callbacks: "",
    send_info: "",
    bookings: "",
  });
  const [todayEntry, setTodayEntry] = useState<DailyReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    setDisplayName(profile?.display_name || "Sales Rep");

    // Get all sales rep profiles for names
    const { data: salesProfiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("role", "sales_rep");

    const names: Record<string, string> = {};
    (salesProfiles || []).forEach((p) => {
      names[p.id] = p.display_name || p.id;
    });
    setRepNames(names);

    // Get all daily reports
    const { data: reports } = await supabase
      .from("sales_daily_reports")
      .select("*")
      .order("report_date", { ascending: false });

    const all = reports || [];
    setAllReports(all);

    // Today's reports (EST)
    const estToday = getESTDate();
    const todayReps = all.filter((r) => r.report_date === estToday);
    setTodayReports(todayReps);

    // Check if current user already submitted today
    const myToday = todayReps.find((r) => r.sales_rep_id === user.id);
    if (myToday) {
      setTodayEntry(myToday);
      setFormData({
        total_calls: String(myToday.total_calls),
        total_answers: String(myToday.total_answers),
        callbacks: String(myToday.callbacks),
        send_info: String(myToday.send_info),
        bookings: String(myToday.bookings),
      });
    }

    // Build all-time leaderboard
    const repTotals: Record<string, { calls: number; bookings: number }> = {};
    all.forEach((r) => {
      if (!repTotals[r.sales_rep_id]) {
        repTotals[r.sales_rep_id] = { calls: 0, bookings: 0 };
      }
      repTotals[r.sales_rep_id].calls += r.total_calls;
      repTotals[r.sales_rep_id].bookings += r.bookings;
    });

    const lb: LeaderboardEntry[] = Object.entries(repTotals).map(([id, t]) => ({
      sales_rep_id: id,
      display_name: names[id] || id,
      total_calls: t.calls,
      total_bookings: t.bookings,
    }));
    setLeaderboard(lb);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    const calls = Number(formData.total_calls) || 0;
    const answers = Number(formData.total_answers) || 0;
    const callbacks = Number(formData.callbacks) || 0;
    const sendInfo = Number(formData.send_info) || 0;
    const bookings = Number(formData.bookings) || 0;

    if (calls === 0) {
      setError("Total calls is required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const estToday = getESTDate();

    if (todayEntry) {
      // Update existing
      const { error: err } = await supabase
        .from("sales_daily_reports")
        .update({
          total_calls: calls,
          total_answers: answers,
          callbacks,
          send_info: sendInfo,
          bookings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", todayEntry.id);

      if (err) { setError(err.message); setSaving(false); return; }
      setSuccess("Updated today's report.");
    } else {
      // Insert new
      const { error: err } = await supabase
        .from("sales_daily_reports")
        .insert({
          sales_rep_id: userId,
          report_date: estToday,
          total_calls: calls,
          total_answers: answers,
          callbacks,
          send_info: sendInfo,
          bookings,
        });

      if (err) { setError(err.message); setSaving(false); return; }
      setSuccess("Daily report submitted!");
    }

    setSaving(false);
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  if (loading) {
    return <div className="text-otai-text-secondary">Loading leaderboard...</div>;
  }

  // Sort leaderboards
  const callsRanking = [...leaderboard].sort((a, b) => b.total_calls - a.total_calls);
  const bookingsRanking = [...leaderboard].sort((a, b) => b.total_bookings - a.total_bookings);

  // Today view
  const todayCallsRanking = todayReports
    .map((r) => ({ ...r, display_name: repNames[r.sales_rep_id] || r.sales_rep_id }))
    .sort((a, b) => b.total_calls - a.total_calls);
  const todayBookingsRanking = todayReports
    .map((r) => ({ ...r, display_name: repNames[r.sales_rep_id] || r.sales_rep_id }))
    .sort((a, b) => b.bookings - a.bookings);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <p className="text-otai-text-secondary text-sm mt-1">Welcome, {displayName}</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 bg-otai-dark border border-otai-border rounded-lg text-otai-text-secondary hover:text-white text-sm"
        >
          <RefreshCw size={14} /> Refresh
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

      {/* Daily Submission Form */}
      <div className="bg-otai-dark border border-otai-border rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-otai-purple" />
            <h2 className="text-white font-semibold">
              {todayEntry ? "Update Today's Report" : "Daily Report"}
            </h2>
          </div>
          <span className="text-xs text-otai-text-muted">
            {new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" })} EST
          </span>
        </div>

        {todayEntry && (
          <div className="flex items-center gap-2 mb-4 text-xs text-otai-gold">
            <Info size={12} />
            <span>You already submitted today. Submitting again will overwrite your entry.</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {[
            { key: "total_calls", label: "Total Calls", icon: Phone },
            { key: "total_answers", label: "Answers", icon: PhoneCall },
            { key: "callbacks", label: "Call Me Back", icon: PhoneForwarded },
            { key: "send_info", label: "Send Info", icon: Send },
            { key: "bookings", label: "Bookings", icon: CalendarCheck },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key}>
              <label className="flex items-center gap-1 text-xs text-otai-text-muted mb-1.5">
                <Icon size={10} /> {label}
              </label>
              <input
                type="number"
                min="0"
                value={formData[key as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                className="w-full bg-black border border-otai-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-otai-purple"
                placeholder="0"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {todayEntry ? "Update Report" : "Submit Report"}
        </button>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setView("all_time")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === "all_time"
              ? "bg-otai-purple text-white"
              : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setView("today")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === "today"
              ? "bg-otai-purple text-white"
              : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"
          }`}
        >
          Today
        </button>
      </div>

      {/* Leaderboards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Calls Leaderboard */}
        <div className="bg-otai-dark border border-otai-border rounded-xl">
          <div className="flex items-center gap-2 p-5 border-b border-otai-border">
            <Phone size={16} className="text-otai-purple" />
            <h3 className="text-white font-semibold">Total Calls</h3>
          </div>
          <LeaderboardList
            items={
              view === "all_time"
                ? callsRanking.map((r) => ({ name: r.display_name, value: r.total_calls, id: r.sales_rep_id }))
                : todayCallsRanking.map((r) => ({ name: r.display_name, value: r.total_calls, id: r.sales_rep_id }))
            }
            currentUserId={userId}
          />
        </div>

        {/* Bookings Leaderboard */}
        <div className="bg-otai-dark border border-otai-border rounded-xl">
          <div className="flex items-center gap-2 p-5 border-b border-otai-border">
            <CalendarCheck size={16} className="text-otai-gold" />
            <h3 className="text-white font-semibold">Total Bookings</h3>
          </div>
          <LeaderboardList
            items={
              view === "all_time"
                ? bookingsRanking.map((r) => ({ name: r.display_name, value: r.total_bookings, id: r.sales_rep_id }))
                : todayBookingsRanking.map((r) => ({ name: r.display_name, value: r.bookings, id: r.sales_rep_id }))
            }
            currentUserId={userId}
          />
        </div>
      </div>
    </div>
  );
}

function LeaderboardList({
  items,
  currentUserId,
}: {
  items: { name: string; value: number; id: string }[];
  currentUserId: string;
}) {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-otai-text-muted text-sm">
        No data yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-otai-border">
      {items.map((item, idx) => {
        const isMe = item.id === currentUserId;
        return (
          <div
            key={item.id}
            className={`flex items-center justify-between p-4 ${
              isMe ? "bg-otai-purple/5" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0
                    ? "bg-otai-gold/20 text-otai-gold"
                    : idx === 1
                    ? "bg-gray-400/20 text-gray-300"
                    : idx === 2
                    ? "bg-orange-400/20 text-orange-400"
                    : "bg-white/5 text-otai-text-muted"
                }`}
              >
                {idx + 1}
              </span>
              <span className={`text-sm ${isMe ? "text-otai-purple font-medium" : "text-white"}`}>
                {item.name}
                {isMe && <span className="text-xs text-otai-text-muted ml-1">(you)</span>}
              </span>
            </div>
            <span className="text-white font-bold text-lg">{item.value.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}
