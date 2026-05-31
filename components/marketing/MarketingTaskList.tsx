"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { CheckCheck, MoreHorizontal, Loader2, X, Calendar, Pencil, CalendarClock, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Task {
  cadence_id: string;
  platform: string;
  slot_number: number;
  label: string;
  checked: boolean;
  archived: boolean;
  completed_by: string | null;
}
interface Group {
  client_id: string;
  company_name: string;
  tasks: Task[];
}

const DAYS = [
  { i: 0, label: "Sun" }, { i: 1, label: "Mon" }, { i: 2, label: "Tue" },
  { i: 3, label: "Wed" }, { i: 4, label: "Thu" }, { i: 5, label: "Fri" }, { i: 6, label: "Sat" },
];

function easternToday(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }))
    .toLocaleDateString("en-CA");
}

export default function MarketingTaskList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [date] = useState(easternToday());
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { type: string; group?: Group; task?: Task }>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/marketing-tasks?date=${date}`);
      const data = await res.json();
      setGroups(data.groups || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Realtime: any change to completions refreshes (debounced)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("marketing-tasks-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_task_completions" }, () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => { load(); }, 250);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/marketing-tasks", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    return res.ok;
  };

  const toggle = async (g: Group, t: Task) => {
    const key = `${t.cadence_id}:${t.slot_number}`;
    setBusy(key);
    // optimistic
    setGroups((prev) => prev.map((gr) => gr.client_id !== g.client_id ? gr : {
      ...gr, tasks: gr.tasks.map((x) => x.cadence_id === t.cadence_id && x.slot_number === t.slot_number ? { ...x, checked: !x.checked } : x),
    }));
    await post({ action: "toggle", cadence_id: t.cadence_id, slot_number: t.slot_number, date, client_id: g.client_id, checked: !t.checked });
    setBusy(null);
  };

  const archiveCompleted = async (g: Group) => {
    const done = g.tasks.filter((t) => t.checked);
    if (done.length === 0) return;
    setModalBusy(true);
    await post({ action: "archive", date, tasks: done.map((t) => ({ cadence_id: t.cadence_id, slot_number: t.slot_number })) });
    setModalBusy(false);
    setModal(null);
    load();
  };

  if (loading) {
    return (
      <div className="mt-8 flex items-center gap-2 text-otai-text-muted text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading task list…
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><CheckCheck size={20} className="text-otai-purple" /> Daily Task List</h2>
          <p className="text-otai-text-secondary text-sm mt-1">Posting checklist for today — resets at midnight</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-6 text-center text-otai-text-muted text-sm">
          No tasks scheduled for today.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const completed = g.tasks.filter((t) => t.checked).length;
            return (
              <div key={g.client_id} className="bg-otai-dark border border-otai-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-otai-border">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{g.company_name}</span>
                    <span className="text-[11px] text-otai-text-muted">{completed}/{g.tasks.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => completed > 0 && setModal({ type: "archive_group", group: g })}
                      disabled={completed === 0}
                      title="Archive completed tasks"
                      className={`p-1.5 rounded-lg border ${completed > 0 ? "border-otai-purple/40 text-otai-purple hover:bg-otai-purple/10" : "border-otai-border text-otai-text-muted opacity-50"}`}
                    >
                      <CheckCheck size={16} />
                    </button>
                    <button
                      onClick={() => setMenuOpen(menuOpen === `client:${g.client_id}` ? null : `client:${g.client_id}`)}
                      className="p-1.5 rounded-lg border border-otai-border text-otai-text-muted hover:text-white relative"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menuOpen === `client:${g.client_id}` && (
                      <div className="absolute right-0 mt-2 z-20 bg-otai-darker border border-otai-border rounded-lg shadow-xl py-1 w-48" style={{ marginTop: "2.5rem" }}>
                        <button onClick={() => { setMenuOpen(null); setModal({ type: "pause_client", group: g }); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-otai-text-secondary hover:bg-otai-dark hover:text-white">
                          <CalendarClock size={14} /> Pause client until…
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-otai-border/50">
                  {g.tasks.map((t) => {
                    const key = `${t.cadence_id}:${t.slot_number}`;
                    return (
                      <div key={key} className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => toggle(g, t)}
                          disabled={busy === key}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${t.checked ? "bg-yellow-500 border-yellow-500" : "border-otai-border hover:border-otai-purple"}`}
                        >
                          {busy === key ? <Loader2 size={12} className="animate-spin text-white" /> : t.checked ? <Check size={14} className="text-black" strokeWidth={3} /> : null}
                        </button>
                        <span className={`flex-1 text-sm ${t.checked ? "line-through text-otai-text-muted" : "text-white"}`}>{t.label}</span>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === key ? null : key)}
                            className="p-1.5 rounded-lg text-otai-text-muted hover:text-white hover:bg-otai-darker"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {menuOpen === key && (
                            <div className="absolute right-0 mt-2 z-20 bg-otai-darker border border-otai-border rounded-lg shadow-xl py-1 w-48">
                              <button onClick={() => { setMenuOpen(null); setModal({ type: "rename", group: g, task: t }); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-otai-text-secondary hover:bg-otai-dark hover:text-white">
                                <Pencil size={14} /> Rename
                              </button>
                              <button onClick={() => { setMenuOpen(null); setModal({ type: "edit_days", group: g, task: t }); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-otai-text-secondary hover:bg-otai-dark hover:text-white">
                                <Calendar size={14} /> Edit repeat days
                              </button>
                              <button onClick={() => { setMenuOpen(null); setModal({ type: "defer_task", group: g, task: t }); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-otai-text-secondary hover:bg-otai-dark hover:text-white">
                                <CalendarClock size={14} /> Push to date…
                              </button>
                              <button onClick={() => { setMenuOpen(null); setModal({ type: "delete_task", group: g, task: t }); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-otai-dark">
                                <Trash2 size={14} /> Delete task
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <TaskModal
          modal={modal}
          date={date}
          busy={modalBusy}
          onClose={() => setModal(null)}
          onArchive={archiveCompleted}
          onAction={async (payload) => {
            setModalBusy(true);
            await post(payload);
            setModalBusy(false);
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function TaskModal({
  modal, date, busy, onClose, onArchive, onAction,
}: {
  modal: { type: string; group?: Group; task?: Task };
  date: string;
  busy: boolean;
  onClose: () => void;
  onArchive: (g: Group) => void;
  onAction: (payload: Record<string, unknown>) => void;
}) {
  const { type, group, task } = modal;
  const [label, setLabel] = useState(task?.label || "");
  const [pickDate, setPickDate] = useState("");
  const [days, setDays] = useState<number[]>([]);

  const title = {
    archive_group: "Archive completed tasks",
    rename: "Rename task",
    edit_days: "Edit repeat days",
    defer_task: "Push task to a date",
    pause_client: "Pause client until a date",
    delete_task: "Delete task",
  }[type] || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-otai-dark border border-otai-border rounded-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-otai-text-muted hover:text-white"><X size={18} /></button>
        </div>

        {type === "archive_group" && group && (
          <>
            <p className="text-otai-text-secondary text-sm mb-5">
              Archive the {group.tasks.filter((t) => t.checked).length} completed task(s) for {group.company_name}? They’ll be hidden for today.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white">Cancel</button>
              <button onClick={() => onArchive(group)} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {busy && <Loader2 size={14} className="animate-spin" />} Archive
              </button>
            </div>
          </>
        )}

        {type === "rename" && task && (
          <>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full bg-otai-darker border border-otai-border rounded-lg px-3 py-2 text-white text-sm mb-5" placeholder="Task name" />
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white">Cancel</button>
              <button onClick={() => onAction({ action: "rename", cadence_id: task.cadence_id, slot_number: task.slot_number, label })} disabled={busy || !label.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {busy && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </>
        )}

        {type === "edit_days" && task && (
          <>
            <p className="text-otai-text-secondary text-xs mb-3">Applies to both posts on this platform.</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {DAYS.map((d) => {
                const on = days.includes(d.i);
                return (
                  <button key={d.i} onClick={() => setDays((prev) => on ? prev.filter((x) => x !== d.i) : [...prev, d.i])}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${on ? "bg-otai-purple border-otai-purple text-white" : "border-otai-border text-otai-text-secondary hover:text-white"}`}>
                    {d.label}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white">Cancel</button>
              <button onClick={() => onAction({ action: "edit_cadence", cadence_id: task.cadence_id, days_of_week: days.sort((a, b) => a - b) })} disabled={busy || days.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {busy && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </>
        )}

        {(type === "defer_task" || type === "pause_client") && (
          <>
            <p className="text-otai-text-secondary text-sm mb-3">
              {type === "defer_task" ? "Hide this task until the selected date, then it reappears." : `Pause all of ${group?.company_name}'s tasks until the selected date.`}
            </p>
            <input type="date" value={pickDate} min={date} onChange={(e) => setPickDate(e.target.value)} className="w-full bg-otai-darker border border-otai-border rounded-lg px-3 py-2 text-white text-sm mb-5" />
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white">Cancel</button>
              <button
                onClick={() => type === "defer_task" && task
                  ? onAction({ action: "defer_task", cadence_id: task.cadence_id, slot_number: task.slot_number, client_id: group?.client_id, defer_from: date, defer_to: pickDate })
                  : onAction({ action: "defer_client", client_id: group?.client_id, paused_until: pickDate })}
                disabled={busy || !pickDate}
                className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {busy && <Loader2 size={14} className="animate-spin" />} Confirm
              </button>
            </div>
          </>
        )}

        {type === "delete_task" && task && (
          <>
            <p className="text-otai-text-secondary text-sm mb-5">Delete “{task.label}” permanently? This removes both posts on this platform from the cadence.</p>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white">Cancel</button>
              <button onClick={() => onAction({ action: "delete_cadence", cadence_id: task.cadence_id })} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {busy && <Loader2 size={14} className="animate-spin" />} Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
