"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users, ArrowLeft, FolderPlus, FilePlus, TrendingUp, TrendingDown,
  Minus, Folder, FileText, ChevronRight, Plus, X, Loader2,
  Check, AlertCircle, ChevronDown,
} from "lucide-react";

interface ClientItem {
  id: string;
  company_name: string;
}

interface MetricRow {
  id: string;
  platform: string;
  week_start: string;
  posts_count: number;
  engagement_total: number;
  impressions: number;
  reach: number;
  followers_change: number;
}

interface ContentFolder {
  id: string;
  client_id: string;
  parent_folder_id: string | null;
  name: string;
  created_by: string;
}

interface ContentItem {
  id: string;
  folder_id: string;
  client_id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  created_by: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "text-pink-400",
  facebook: "text-blue-400",
  linkedin: "text-sky-400",
  x: "text-gray-300",
  youtube: "text-red-400",
  tiktok: "text-teal-300",
};

export default function MarketingClients() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);

  // Metrics
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [prevMetrics, setPrevMetrics] = useState<MetricRow[]>([]);

  // Content folders
  const [folders, setFolders] = useState<ContentFolder[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([]);

  // Modals
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newItemForm, setNewItemForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadClients = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Get assigned clients
    const { data: assignments } = await supabase
      .from("marketing_client_assignments")
      .select("client_id")
      .eq("marketer_id", user.id);

    let clientIds = (assignments || []).map((a) => a.client_id);

    let clientsList: ClientItem[] = [];
    if (clientIds.length > 0) {
      const { data } = await supabase.from("clients").select("id, company_name").in("id", clientIds);
      clientsList = data || [];
    } else {
      const { data } = await supabase.from("clients").select("id, company_name");
      clientsList = data || [];
    }
    setClients(clientsList);
    setLoading(false);
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const loadClientData = async (client: ClientItem) => {
    setSelectedClient(client);
    setCurrentFolderId(null);
    setFolderPath([{ id: null, name: "Root" }]);

    const supabase = createClient();

    // Latest week metrics
    const { data: latestMetrics } = await supabase
      .from("social_media_metrics")
      .select("*")
      .eq("client_id", client.id)
      .order("week_start", { ascending: false })
      .limit(20);

    const allMetrics = latestMetrics || [];
    // Group by platform, get latest week
    const latestWeek = allMetrics.length > 0 ? allMetrics[0].week_start : null;
    if (latestWeek) {
      setMetrics(allMetrics.filter((m) => m.week_start === latestWeek));
      // Find previous week
      const prevWeeks = [...new Set(allMetrics.map((m) => m.week_start))].sort().reverse();
      if (prevWeeks.length > 1) {
        setPrevMetrics(allMetrics.filter((m) => m.week_start === prevWeeks[1]));
      } else {
        setPrevMetrics([]);
      }
    } else {
      setMetrics([]);
      setPrevMetrics([]);
    }

    // Content folders
    const { data: foldersData } = await supabase
      .from("marketing_content_folders")
      .select("*")
      .eq("client_id", client.id);
    setFolders(foldersData || []);

    const { data: itemsData } = await supabase
      .from("marketing_content_items")
      .select("*")
      .eq("client_id", client.id);
    setItems(itemsData || []);
  };

  const navigateFolder = (folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setFolderPath([{ id: null, name: "Root" }]);
    } else {
      const idx = folderPath.findIndex((p) => p.id === folderId);
      if (idx >= 0) {
        setFolderPath(folderPath.slice(0, idx + 1));
      } else {
        setFolderPath([...folderPath, { id: folderId, name: folderName }]);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedClient) return;
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("marketing_content_folders").insert({
      client_id: selectedClient.id,
      parent_folder_id: currentFolderId,
      name: newFolderName.trim(),
      created_by: userId,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setNewFolderName("");
    setShowNewFolder(false);
    setSaving(false);
    setSuccess("Folder created.");
    setTimeout(() => setSuccess(""), 3000);
    loadClientData(selectedClient);
  };

  const handleCreateItem = async () => {
    if (!newItemForm.title.trim() || !selectedClient || !currentFolderId) return;
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("marketing_content_items").insert({
      folder_id: currentFolderId,
      client_id: selectedClient.id,
      title: newItemForm.title.trim(),
      content: newItemForm.content || null,
      created_by: userId,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setNewItemForm({ title: "", content: "" });
    setShowNewItem(false);
    setSaving(false);
    setSuccess("Item added.");
    setTimeout(() => setSuccess(""), 3000);
    loadClientData(selectedClient);
  };

  const getTrend = (current: number, previous: number | undefined) => {
    if (previous === undefined) return null;
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "flat";
  };

  if (loading) {
    return <div className="text-otai-text-secondary">Loading clients...</div>;
  }

  // === CLIENT DETAIL VIEW ===
  if (selectedClient) {
    const currentFolders = folders.filter((f) => f.parent_folder_id === currentFolderId);
    const currentItems = currentFolderId ? items.filter((i) => i.folder_id === currentFolderId) : [];

    return (
      <div>
        <button
          onClick={() => setSelectedClient(null)}
          className="flex items-center gap-2 text-otai-text-secondary hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> All Clients
        </button>

        <h1 className="text-2xl font-bold text-white mb-6">{selectedClient.company_name}</h1>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError("")} className="ml-auto"><X size={14} /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm">
            <Check size={16} /> {success}
          </div>
        )}

        {/* Social Media Metrics */}
        <div className="bg-otai-dark border border-otai-border rounded-xl mb-6">
          <div className="p-5 border-b border-otai-border">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp size={16} className="text-otai-purple" />
              Weekly Metrics
            </h2>
          </div>

          {metrics.length === 0 ? (
            <div className="p-8 text-center text-otai-text-muted text-sm">
              No metrics data yet. Data will appear once connected via n8n.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-otai-text-muted text-xs uppercase tracking-wide">
                    <th className="text-left p-4 font-medium">Platform</th>
                    <th className="text-right p-4 font-medium">Posts</th>
                    <th className="text-right p-4 font-medium">Engagement</th>
                    <th className="text-right p-4 font-medium">Impressions</th>
                    <th className="text-right p-4 font-medium">Reach</th>
                    <th className="text-right p-4 font-medium">Followers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-otai-border">
                  {metrics.map((m) => {
                    const prev = prevMetrics.find((p) => p.platform === m.platform);
                    return (
                      <tr key={m.id} className="hover:bg-white/[0.02]">
                        <td className={`p-4 font-medium capitalize ${PLATFORM_COLORS[m.platform] || "text-white"}`}>
                          {m.platform}
                        </td>
                        <MetricCell value={m.posts_count} prev={prev?.posts_count} />
                        <MetricCell value={m.engagement_total} prev={prev?.engagement_total} />
                        <MetricCell value={m.impressions} prev={prev?.impressions} />
                        <MetricCell value={m.reach} prev={prev?.reach} />
                        <td className="p-4 text-right">
                          <span className={m.followers_change >= 0 ? "text-otai-green" : "text-otai-red"}>
                            {m.followers_change >= 0 ? "+" : ""}{m.followers_change.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Content Folders */}
        <div className="bg-otai-dark border border-otai-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-otai-border">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Folder size={16} className="text-otai-purple" />
              Content Folders
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowNewFolder(true); setError(""); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-otai-purple/10 text-otai-purple rounded-lg text-xs hover:bg-otai-purple/20 transition-colors"
              >
                <FolderPlus size={12} /> New Folder
              </button>
              {currentFolderId && (
                <button
                  onClick={() => { setShowNewItem(true); setError(""); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-otai-purple/10 text-otai-purple rounded-lg text-xs hover:bg-otai-purple/20 transition-colors"
                >
                  <FilePlus size={12} /> Add Item
                </button>
              )}
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 px-5 py-3 text-xs text-otai-text-muted border-b border-otai-border overflow-x-auto">
            {folderPath.map((p, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight size={10} />}
                <button
                  onClick={() => navigateFolder(p.id, p.name)}
                  className={`hover:text-white transition-colors ${
                    i === folderPath.length - 1 ? "text-otai-purple" : ""
                  }`}
                >
                  {p.name}
                </button>
              </span>
            ))}
          </div>

          <div className="p-4">
            {currentFolders.length === 0 && currentItems.length === 0 ? (
              <div className="text-center text-otai-text-muted text-sm py-8">
                {currentFolderId ? "Empty folder. Add items or subfolders." : "No folders yet. Create one to organize content."}
              </div>
            ) : (
              <div className="space-y-1">
                {currentFolders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => navigateFolder(f.id, f.name)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <Folder size={16} className="text-otai-gold shrink-0" />
                    <span className="text-white text-sm">{f.name}</span>
                    <ChevronRight size={14} className="text-otai-text-muted ml-auto" />
                  </button>
                ))}
                {currentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    <FileText size={16} className="text-otai-text-muted shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm">{item.title}</p>
                      {item.content && (
                        <p className="text-otai-text-muted text-xs mt-0.5 line-clamp-2">{item.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* New Folder Inline */}
        {showNewFolder && (
          <div className="mt-3 bg-otai-dark border border-otai-purple/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 bg-black border border-otai-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-otai-purple"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
              <button onClick={handleCreateFolder} disabled={saving}
                className="px-4 py-2 bg-otai-purple text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : "Create"}
              </button>
              <button onClick={() => setShowNewFolder(false)} className="text-otai-text-muted hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* New Item Inline */}
        {showNewItem && (
          <div className="mt-3 bg-otai-dark border border-otai-purple/30 rounded-xl p-4 space-y-3">
            <input
              type="text"
              value={newItemForm.title}
              onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })}
              placeholder="Item title"
              className="w-full bg-black border border-otai-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-otai-purple"
              autoFocus
            />
            <textarea
              value={newItemForm.content}
              onChange={(e) => setNewItemForm({ ...newItemForm, content: e.target.value })}
              placeholder="Notes / content (optional)"
              rows={3}
              className="w-full bg-black border border-otai-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-otai-purple resize-none"
            />
            <div className="flex items-center gap-3">
              <button onClick={handleCreateItem} disabled={saving}
                className="px-4 py-2 bg-otai-purple text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : "Add Item"}
              </button>
              <button onClick={() => setShowNewItem(false)} className="text-otai-text-muted hover:text-white text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === CLIENT LIST ===
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users size={24} className="text-otai-purple" />
          Clients
        </h1>
        <p className="text-otai-text-secondary text-sm mt-1">Your assigned clients</p>
      </div>

      {clients.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <Users size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No clients assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => loadClientData(c)}
              className="w-full bg-otai-dark border border-otai-border rounded-xl p-5 hover:border-otai-purple/40 transition-colors text-left flex items-center justify-between"
            >
              <span className="text-white font-medium">{c.company_name}</span>
              <ChevronRight size={16} className="text-otai-text-muted" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCell({ value, prev }: { value: number; prev?: number }) {
  const trend = prev !== undefined
    ? value > prev ? "up" : value < prev ? "down" : "flat"
    : null;

  return (
    <td className="p-4 text-right">
      <div className="flex items-center justify-end gap-1">
        <span className="text-white">{value.toLocaleString()}</span>
        {trend === "up" && <TrendingUp size={12} className="text-otai-green" />}
        {trend === "down" && <TrendingDown size={12} className="text-otai-red" />}
        {trend === "flat" && <Minus size={12} className="text-otai-text-muted" />}
      </div>
    </td>
  );
}
