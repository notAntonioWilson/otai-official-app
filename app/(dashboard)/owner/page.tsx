"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

interface FinanceTransaction {
  id: string;
  client_id: string | null;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  auto_generated: boolean;
}

interface ClientWithFinance {
  id: string;
  company_name: string;
  deal_value_monthly: number;
  status: string;
  totalIncome: number;
  totalExpenses: number;
}

export default function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [clientBreakdown, setClientBreakdown] = useState<ClientWithFinance[]>([]);
  const [activeClients, setActiveClients] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<FinanceTransaction[]>([]);

  async function loadData() {
    try {
      const res = await fetch("/api/owner-dashboard");
      if (!res.ok) return;
      const data = await res.json();

      setDisplayName(data.display_name);

      const txns = data.transactions || [];

      let income = 0;
      let expenses = 0;
      txns.forEach((t: FinanceTransaction) => {
        if (t.type === "income") income += Number(t.amount);
        if (t.type === "expense") expenses += Number(t.amount);
      });
      setTotalIncome(income);
      setTotalExpenses(expenses);
      setRecentTransactions(txns.slice(0, 8));

      const allClients = data.clients || [];
      setActiveClients(allClients.filter((c: ClientWithFinance) => c.status === "active").length);

      const monthlyRecurring = allClients
        .filter((c: ClientWithFinance) => c.status === "active")
        .reduce((sum: number, c: ClientWithFinance) => sum + Number(c.deal_value_monthly || 0), 0);
      setMrr(monthlyRecurring);

      const breakdown: ClientWithFinance[] = allClients.map((c: ClientWithFinance) => {
        const clientTxns = txns.filter((t: FinanceTransaction) => t.client_id === c.id);
        const cIncome = clientTxns
          .filter((t: FinanceTransaction) => t.type === "income")
          .reduce((s: number, t: FinanceTransaction) => s + Number(t.amount), 0);
        const cExpenses = clientTxns
          .filter((t: FinanceTransaction) => t.type === "expense")
          .reduce((s: number, t: FinanceTransaction) => s + Number(t.amount), 0);
        return { ...c, totalIncome: cIncome, totalExpenses: cExpenses };
      });
      setClientBreakdown(breakdown);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { loadData(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return <div className="text-otai-text-secondary">Loading dashboard...</div>;
  }

  const net = totalIncome - totalExpenses;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-otai-text-secondary mt-1">Welcome back, {displayName}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-otai-dark border border-otai-border rounded-lg text-otai-text-secondary hover:text-white hover:border-otai-purple/40 transition-colors text-sm"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-otai-green/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-otai-green" />
            </div>
            <span className="text-xs text-otai-text-muted uppercase tracking-wide">Total Income</span>
          </div>
          <p className="text-2xl font-bold text-otai-green">{fmt(totalIncome)}</p>
        </div>

        <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-otai-red/10 flex items-center justify-center">
              <TrendingDown size={16} className="text-otai-red" />
            </div>
            <span className="text-xs text-otai-text-muted uppercase tracking-wide">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-otai-red">{fmt(totalExpenses)}</p>
        </div>

        <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-otai-purple/10 flex items-center justify-center">
              <DollarSign size={16} className="text-otai-purple" />
            </div>
            <span className="text-xs text-otai-text-muted uppercase tracking-wide">Net Income</span>
          </div>
          <p className={`text-2xl font-bold ${net >= 0 ? "text-otai-green" : "text-otai-red"}`}>
            {fmt(net)}
          </p>
        </div>

        <div className="bg-otai-dark border border-otai-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-otai-gold/10 flex items-center justify-center">
              <RefreshCw size={16} className="text-otai-gold" />
            </div>
            <span className="text-xs text-otai-text-muted uppercase tracking-wide">Monthly Recurring</span>
          </div>
          <p className="text-2xl font-bold text-otai-gold">{fmt(mrr)}</p>
          <p className="text-xs text-otai-text-muted mt-1">
            {activeClients} active client{activeClients !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Client Breakdown */}
      <div className="bg-otai-dark border border-otai-border rounded-xl mb-8">
        <div className="flex items-center justify-between p-5 border-b border-otai-border">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-otai-purple" />
            <h2 className="text-white font-semibold">Per-Client Breakdown</h2>
          </div>
          <a href="/owner/finance" className="text-xs text-otai-purple hover:text-otai-purple-hover flex items-center gap-1">
            View All <ArrowUpRight size={12} />
          </a>
        </div>

        {clientBreakdown.length === 0 ? (
          <div className="p-8 text-center text-otai-text-muted text-sm">
            No clients yet. Add clients via User Management.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-otai-text-muted text-xs uppercase tracking-wide">
                  <th className="text-left p-4 font-medium">Client</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Monthly</th>
                  <th className="text-right p-4 font-medium">Income</th>
                  <th className="text-right p-4 font-medium">Expenses</th>
                  <th className="text-right p-4 font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-otai-border">
                {clientBreakdown.map((c) => {
                  const cNet = c.totalIncome - c.totalExpenses;
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 text-white font-medium">{c.company_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === "active"
                            ? "bg-otai-green/10 text-otai-green"
                            : c.status === "paused"
                            ? "bg-otai-gold/10 text-otai-gold"
                            : "bg-otai-red/10 text-otai-red"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-otai-text-secondary">{fmt(c.deal_value_monthly)}</td>
                      <td className="p-4 text-right text-otai-green">{fmt(c.totalIncome)}</td>
                      <td className="p-4 text-right text-otai-red">{fmt(c.totalExpenses)}</td>
                      <td className={`p-4 text-right font-medium ${cNet >= 0 ? "text-otai-green" : "text-otai-red"}`}>
                        {fmt(cNet)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-otai-dark border border-otai-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-otai-border">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-otai-purple" />
            <h2 className="text-white font-semibold">Recent Transactions</h2>
          </div>
          <a href="/owner/finance" className="text-xs text-otai-purple hover:text-otai-purple-hover flex items-center gap-1">
            View All <ArrowUpRight size={12} />
          </a>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-otai-text-muted text-sm">
            No transactions yet. Add entries in the Finance page.
          </div>
        ) : (
          <div className="divide-y divide-otai-border">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${t.type === "income" ? "bg-otai-green" : "bg-otai-red"}`} />
                  <div>
                    <p className="text-white text-sm">{t.description || t.category}</p>
                    <p className="text-otai-text-muted text-xs">{t.date}</p>
                  </div>
                </div>
                <span className={`font-medium text-sm ${t.type === "income" ? "text-otai-green" : "text-otai-red"}`}>
                  {t.type === "income" ? "+" : "-"}{fmt(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
