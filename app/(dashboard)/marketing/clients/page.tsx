"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, ArrowLeft, FolderPlus, FilePlus,
  Folder, FileText, ChevronRight, X, Loader2,
  Check, AlertCircle,
} from "lucide-react";

interface ClientItem { id: string; company_name: string; display_name: string; }
interface ContentFolder { id: string; client_id: string; parent_folder_id: string | null; name: string; }
interface ContentItem { id: string; folder_id: string; client_id: string; title: string; content: string | null; }

export default function MarketingClients() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [folders, setFolders] = useState<ContentFolder[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newItemForm, setNewItemForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing?view=clients");
      const data = await res.json();
      const clientsList = (data.clients || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        company_name: c.company_name as string,
        display_name: ((c.profiles as Record<string, unknown>)?.display_name as string) || c.company_name as string,
      }));
      setClients(clientsList);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const loadClientData = async (client: ClientItem) => {
    setSelectedClient(client);
    setCurrentFolderId(null);
    setFolderPath([{ id: null, name: "Root" }]);
    try {
      const res = await fetch(`/api/marketing?view=client_data&clientId=${client.id}`);
      const data = await res.json();
      setFolders(data.folders || []);
      setItems(data.items || []);
    } catch { /* ignore */ }
  };

  const navigateFolder = (folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId);
    if (folderId === null) { setFolderPath([{ id: null, name: "Root" }]); }
    else {
      const idx = folderPath.findIndex((p) => p.id === folderId);
      if (idx >= 0) setFolderPath(folderPath.slice(0, idx + 1));
      else setFolderPath([...folderPath, { id: folderId, name: folderName }]);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedClient) return;
    setSaving(true);
    const res = await fetch("/api/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_folder", client_id: selectedClient.id, parent_folder_id: currentFolderId, name: newFolderName.trim() }) });
    const result = await res.json();
    if (result.error) { setError(result.error); setSaving(false); return; }
    setNewFolderName(""); setShowNewFolder(false); setSaving(false);
    setSuccess("Folder created."); setTimeout(() => setSuccess(""), 3000);
    loadClientData(selectedClient);
  };

  const handleCreateItem = async () => {
    if (!newItemForm.title.trim() || !selectedClient || !currentFolderId) return;
    setSaving(true);
    const res = await fetch("/api/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_item", folder_id: currentFolderId, client_id: selectedClient.id, title: newItemForm.title.trim(), content: newItemForm.content || null }) });
    const result = await res.json();
    if (result.error) { setError(result.error); setSaving(false); return; }
    setNewItemForm({ title: "", content: "" }); setShowNewItem(false); setSaving(false);
    setSuccess("Doc added."); setTimeout(() => setSuccess(""), 3000);
    loadClientData(selectedClient);
  };

  const currentFolders = folders.filter((f) => f.parent_folder_id === currentFolderId);
  const currentItems = items.filter((i) => i.folder_id === currentFolderId);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-otai-purple" size={32} /></div>;

  if (selectedClient) {
    return (
      <div>
        <button onClick={() => setSelectedClient(null)} className="flex items-center gap-2 text-otai-text-secondary hover:text-white mb-4 text-sm"><ArrowLeft size={14} /> Back to Clients</button>
        <h1 className="text-2xl font-bold text-white mb-1">{selectedClient.display_name}</h1>
        {selectedClient.company_name !== selectedClient.display_name && <p className="text-otai-text-secondary text-sm mb-6">{selectedClient.company_name}</p>}
        {success && <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm"><Check size={16} /> {success}</div>}
        {error && <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm"><AlertCircle size={16} /> {error}</div>}

        <div className="bg-otai-dark border border-otai-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-otai-border">
            <h2 className="text-white font-semibold flex items-center gap-2"><Folder size={16} className="text-otai-purple" /> Content Folders</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowNewFolder(true); setError(""); }} className="flex items-center gap-1 px-3 py-1.5 bg-otai-purple/10 text-otai-purple rounded-lg text-xs hover:bg-otai-purple/20"><FolderPlus size={12} /> New Folder</button>
              {currentFolderId && <button onClick={() => { setShowNewItem(true); setError(""); }} className="flex items-center gap-1 px-3 py-1.5 bg-otai-purple/10 text-otai-purple rounded-lg text-xs hover:bg-otai-purple/20"><FilePlus size={12} /> Add Doc</button>}
            </div>
          </div>
          <div className="flex items-center gap-1 px-5 py-3 text-xs text-otai-text-muted border-b border-otai-border overflow-x-auto">
            {folderPath.map((p, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight size={10} />}
                <button onClick={() => navigateFolder(p.id, p.name)} className={`hover:text-white ${i === folderPath.length - 1 ? "text-otai-purple" : ""}`}>{p.name}</button>
              </span>
            ))}
          </div>
          <div className="p-4">
            {currentFolders.length === 0 && currentItems.length === 0 ? (
              <div className="text-center text-otai-text-muted text-sm py-8">{currentFolderId ? "Empty folder. Add docs or subfolders." : "No folders yet. Create one to organize your work."}</div>
            ) : (
              <div className="space-y-1">
                {currentFolders.map((f) => (
                  <button key={f.id} onClick={() => navigateFolder(f.id, f.name)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] text-left">
                    <Folder size={16} className="text-otai-gold shrink-0" /><span className="text-white text-sm">{f.name}</span><ChevronRight size={14} className="text-otai-text-muted ml-auto" />
                  </button>
                ))}
                {currentItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03]">
                    <FileText size={16} className="text-otai-text-muted shrink-0 mt-0.5" />
                    <div><p className="text-white text-sm">{item.title}</p>{item.content && <p className="text-otai-text-muted text-xs mt-0.5 line-clamp-2">{item.content}</p>}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {showNewFolder && (
          <div className="mt-3 bg-otai-dark border border-otai-purple/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder name" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                className="flex-1 bg-black border border-otai-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-otai-purple" />
              <button onClick={handleCreateFolder} disabled={saving} className="px-4 py-2 bg-otai-purple text-white rounded-lg text-sm disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : "Create"}</button>
              <button onClick={() => setShowNewFolder(false)} className="text-otai-text-muted hover:text-white"><X size={16} /></button>
            </div>
          </div>
        )}
        {showNewItem && (
          <div className="mt-3 bg-otai-dark border border-otai-purple/30 rounded-xl p-4 space-y-3">
            <input type="text" value={newItemForm.title} onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })} placeholder="Doc title" autoFocus
              className="w-full bg-black border border-otai-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-otai-purple" />
            <textarea value={newItemForm.content} onChange={(e) => setNewItemForm({ ...newItemForm, content: e.target.value })} placeholder="Notes / content (optional)" rows={3}
              className="w-full bg-black border border-otai-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-otai-purple resize-none" />
            <div className="flex items-center gap-3">
              <button onClick={handleCreateItem} disabled={saving} className="px-4 py-2 bg-otai-purple text-white rounded-lg text-sm disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : "Add Doc"}</button>
              <button onClick={() => setShowNewItem(false)} className="text-otai-text-muted hover:text-white text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Users size={24} className="text-otai-purple" /> Clients</h1>
        <p className="text-otai-text-secondary text-sm mt-1">Your assigned clients</p>
      </div>
      {clients.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <Users size={48} className="text-otai-text-muted mx-auto mb-4" /><p className="text-otai-text-secondary">No clients assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <button key={c.id} onClick={() => loadClientData(c)} className="w-full bg-otai-dark border border-otai-border rounded-xl p-5 hover:border-otai-purple/40 transition-colors text-left flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-white font-medium">{c.display_name}</span>
                {c.company_name !== c.display_name && <span className="text-sm text-gray-400">{c.company_name}</span>}
              </div>
              <ChevronRight size={16} className="text-otai-text-muted" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
