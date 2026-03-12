"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DollarSign, Plus, X, TrendingUp, TrendingDown, Filter,
  Loader2, Check, AlertCircle, ChevronDown, Trash2,
} from "lucide-react";

interface Transaction {
  id: string;
  client_id: string | null;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  auto_generated: boolean;
  created_at: string;
}

interface ClientOption {
  id: string;
  company_name: string;
  deal_value_upfront: number;
  deal_value_monthly: number;
  status: string;
}

const CATEGORIES_INCOME = ["upfront", "monthly_recurring", "upsell", "other"];
const CATEGORIES_EXPENSE = ["tool_cost", "contractor", "advertising", "hosting", "other"];

export default function OwnerFinance() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});

  // Filters
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterClient, setFilterClient] = useState<string>("all");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    type: "income",
    category: "upfront",
    client_id: "",
    amount: "",
    description: "",
    date: new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }),
  });

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const { data: txns } = await supabase
      .from("finance_transactions")
      .select("*")
      .order("date", { ascending: false });
    setTransactions(txns || []);

    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, company_name, deal_value_upfront, deal_value_monthly, status")
      .order("company_name");
    setClients(clientsData || []);

    const map: Record<string, string> = {};
    (clientsData || []).forEach((c) => { map[c.id] = c.company_name; });
    setClientMap(map);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdd = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Amount is required.");
      return;
    }
    if (!form.date) {
      setError("Date is required.");
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();

    const { error: err } = await supabase.from("finance_transactions").insert({
      client_id: form.client_id || null,
      type: form.type,
      category: form.category,
      amount: Number(form.amount),
      description: form.description || "",
      date: form.date,
      auto_generated: false,
    });

    if (err) { setError(err.message); setSaving(false); return; }

    setSaving(false);
    setShowAdd(false);
    setSuccess("Transaction added.");
    setTimeout(() => setSuccess(""), 3000);
    setForm({
      type: "income", category: "upfront", client_id: "",
      amount: "", description: "",
      date: new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }),
    });
    loadData();
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("finance_transactions").delete().eq("id", id);
    setSuccess("Transaction deleted.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return <div className="text-otai-text-secondary">Loading finance...</div>;
  }

  // Filtered transactions
  const filtered = transactions.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterClient !== "all" && t.client_id !== filterClient) return false;
    return true;
  });

  // Totals
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const net = totalIncome - totalExpenses;

  // Per-client summary
  const clientSummary = clients.map((c) => {
    const cTxns = transactions.filter((t) => t.client_id === c.id);
    const cIncome = cTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const cExpense = cTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { ...c, totalIncome: cIncome, totalExpenses: cExpense, net: cIncome - cExpense };
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign size={24} className="text-otai-green" />
          Finance
        </h1>
        <button
          onClick={() => { setShowAdd(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-otai-green" />
            <span className="text-xs text-otai-text-muted uppercase tracking-wide">Total Income</span>
          </div>
          <p className="text-2xl font-bold text-otai-green">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-otai-red" />
            <span className="text-xs text-otai-text-muted uppercase tracking-wide">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-otai-red">{fmt(totalExpenses)}</p>
        </div>
        <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-otai-purple" />
            <span className="text-xs text-otai-text-muted uppercase tracking-wide">Net</span>
          </div>
          <p className={`text-2xl font-bold ${net >= 0 ? "text-otai-green" : "text-otai-red"}`}>{fmt(net)}</p>
        </div>
      </div>

      {/* Per-Client Breakdown */}
      <div className="bg-otai-dark border border-otai-border rounded-xl mb-8">
        <div className="p-5 border-b border-otai-border">
          <h2 className="text-white font-semibold">Per-Client Breakdown</h2>
        </div>
        {clientSummary.length === 0 ? (
          <div className="p-8 text-center text-otai-text-muted text-sm">No clients.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-otai-text-muted text-xs uppercase tracking-wide">
                  <th className="text-left p-4 font-medium">Client</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Upfront</th>
                  <th className="text-right p-4 font-medium">Monthly</th>
                  <th className="text-right p-4 font-medium">Total Paid</th>
                  <th className="text-right p-4 font-medium">Expenses</th>
                  <th className="text-right p-4 font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-otai-border">
                {clientSummary.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 text-white font-medium">{c.company_name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "active" ? "bg-otai-green/10 text-otai-green"
                        : c.status === "paused" ? "bg-otai-gold/10 text-otai-gold"
                        : "bg-otai-red/10 text-otai-red"
                      }`}>{c.status}</span>
                    </td>
                    <td className="p-4 text-right text-otai-text-secondary">{fmt(c.deal_value_upfront)}</td>
                    <td className="p-4 text-right text-otai-text-secondary">{fmt(c.deal_value_monthly)}/mo</td>
                    <td className="p-4 text-right text-otai-green">{fmt(c.totalIncome)}</td>
                    <td className="p-4 text-right text-otai-red">{fmt(c.totalExpenses)}</td>
                    <td className={`p-4 text-right font-medium ${c.net >= 0 ? "text-otai-green" : "text-otai-red"}`}>{fmt(c.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Filter size={14} className="text-otai-text-muted" />
          <span className="text-xs text-otai-text-muted">Filter:</span>
        </div>
        {(["all", "income", "expense"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === t
                ? "bg-otai-purple text-white"
                : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"
            }`}
          >
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="relative ml-2">
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="bg-otai-dark border border-otai-border rounded-lg px-3 py-1.5 text-xs text-otai-text-secondary appearance-none pr-7 focus:outline-none focus:border-otai-purple"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-otai-dark border border-otai-border rounded-xl">
        <div className="p-5 border-b border-otai-border">
          <h2 className="text-white font-semibold">Transactions ({filtered.length})</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-otai-text-muted text-sm">
            No transactions found.
          </div>
        ) : (
          <div className="divide-y divide-otai-border">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 group hover:bg-white/[0.01]">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.type === "income" ? "bg-otai-green" : "bg-otai-red"}`} />
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate">{t.description || t.category}</p>
                    <div className="flex items-center gap-2 text-xs text-otai-text-muted mt-0.5">
                      <span>{t.date}</span>
                      <span>·</span>
                      <span className="capitalize">{t.category.replace(/_/g, " ")}</span>
                      {t.client_id && clientMap[t.client_id] && (
                        <>
                          <span>·</span>
                          <span>{clientMap[t.client_id]}</span>
                        </>
                      )}
                      {t.auto_generated && (
                        <span className="px-1.5 py-0.5 bg-otai-purple/10 text-otai-purple rounded text-[10px]">auto</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-medium text-sm ${t.type === "income" ? "text-otai-green" : "text-otai-red"}`}>
                    {t.type === "income" ? "+" : "-"}{fmt(Number(t.amount))}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded text-otai-text-muted hover:text-otai-red opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ ADD TRANSACTION MODAL ============ */}
      {showAdd && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowAdd(false)} />
          <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Add Transaction</h2>
              <button onClick={() => setShowAdd(false)} className="text-otai-text-muted hover:text-white">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["income", "expense"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t, category: t === "income" ? "upfront" : "tool_cost" })}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.type === t
                          ? t === "income"
                            ? "border-otai-green bg-otai-green/10 text-otai-green"
                            : "border-otai-red bg-otai-red/10 text-otai-red"
                          : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                      }`}
                    >
                      {t === "income" ? "Income" : "Expense"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {(form.type === "income" ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat })}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors capitalize ${
                        form.category === cat
                          ? "border-otai-purple bg-otai-purple/10 text-otai-purple"
                          : "border-otai-border text-otai-text-secondary hover:border-otai-purple/40"
                      }`}
                    >
                      {cat.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Client (optional)</label>
                <div className="relative">
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-otai-purple"
                  >
                    <option value="">OTAI (no client)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-otai-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple"
                  placeholder="0.00"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple"
                  placeholder="What is this for?"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-otai-border">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Add Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
