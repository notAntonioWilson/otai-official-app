import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

// Platform display labels for task names
const PLATFORM_LABEL: Record<string, string> = {
  facebook: "FB",
  instagram: "IG",
  tiktok: "TT",
  youtube: "YT",
  linkedin_p: "LiN P",
  linkedin_b: "LiN B",
  x: "X",
};

// Order platforms appear within a client group
const PLATFORM_ORDER: Record<string, number> = {
  facebook: 1, instagram: 2, tiktok: 3, youtube: 4, linkedin_p: 5, linkedin_b: 6, x: 7,
};

async function getAuthedProfile() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null };
  const svc = createServiceRoleClient();
  const { data: profile } = await svc.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { user, role: profile?.role || null };
}

// Eastern "today" as YYYY-MM-DD
function easternToday(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }))
    .toLocaleDateString("en-CA");
}
// Day of week 0=Sun..6=Sat for a given YYYY-MM-DD evaluated in Eastern
function dowFor(dateStr: string): number {
  // Parse as local noon to avoid TZ rollover, then read weekday
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getDay();
}

export async function GET(req: NextRequest) {
  const { user, role } = await getAuthedProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "owner" && role !== "marketing") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = createServiceRoleClient();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || easternToday();
  const dow = dowFor(date);

  // Active cadences + their clients
  const { data: cadences, error: cadErr } = await svc
    .from("marketing_task_cadences")
    .select("id, client_id, platform, posts_per_day, days_of_week, active, paused_until, labels")
    .eq("active", true);
  if (cadErr) return NextResponse.json({ error: cadErr.message }, { status: 400 });

  const cadenceList = cadences || [];
  const clientIds = Array.from(new Set(cadenceList.map((c) => c.client_id)));

  const { data: clients } = await svc
    .from("clients")
    .select("id, company_name")
    .in("id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);
  const clientName: Record<string, string> = {};
  (clients || []).forEach((c) => { clientName[c.id] = c.company_name; });

  // Completions for this date
  const cadenceIds = cadenceList.map((c) => c.id);
  const { data: completions } = await svc
    .from("marketing_task_completions")
    .select("cadence_id, slot_number, completed_by, completed_at, archived")
    .eq("completion_date", date)
    .in("cadence_id", cadenceIds.length ? cadenceIds : ["00000000-0000-0000-0000-000000000000"]);
  const compMap: Record<string, { completed_by: string | null; completed_at: string; archived: boolean }> = {};
  (completions || []).forEach((c) => { compMap[`${c.cadence_id}:${c.slot_number}`] = c; });

  // Overrides that defer a task AWAY from this date, or TO this date
  const { data: overrides } = await svc
    .from("marketing_task_overrides")
    .select("cadence_id, slot_number, defer_from, defer_to, client_id")
    .or(`defer_from.eq.${date},defer_to.eq.${date}`);
  const deferredFrom = new Set<string>(); // keys removed from today
  const deferredTo: { client_id: string; cadence_id: string | null; slot_number: number | null }[] = [];
  (overrides || []).forEach((o) => {
    if (o.defer_from === date) {
      // whole-client (cadence null) or specific
      deferredFrom.add(`${o.cadence_id ?? "ALL"}:${o.slot_number ?? "ALL"}:${o.client_id}`);
    }
    if (o.defer_to === date) deferredTo.push({ client_id: o.client_id, cadence_id: o.cadence_id, slot_number: o.slot_number });
  });

  // Build groups: client -> tasks[]
  type Task = { cadence_id: string; platform: string; slot_number: number; label: string; checked: boolean; archived: boolean; completed_by: string | null };
  const groups: Record<string, { client_id: string; company_name: string; tasks: Task[] }> = {};

  const isClientPausedToday = (paused_until: string | null) => !!paused_until && paused_until >= date;

  for (const cad of cadenceList) {
    const scheduledToday = (cad.days_of_week as number[]).includes(dow);
    // deferred away as whole-client or this specific slot/cadence?
    const clientDeferredAway = deferredFrom.has(`ALL:ALL:${cad.client_id}`);
    if (isClientPausedToday(cad.paused_until)) continue;
    if (clientDeferredAway) continue;

    const labels = (cad.labels as Record<string, string> | null) || null;
    const slots = cad.posts_per_day || 2;
    for (let slot = 1; slot <= slots; slot++) {
      const cadDeferredAway = deferredFrom.has(`${cad.id}:${slot}:${cad.client_id}`) || deferredFrom.has(`${cad.id}:ALL:${cad.client_id}`);
      const show = scheduledToday || deferredTo.some((d) => d.client_id === cad.client_id && (d.cadence_id === null || d.cadence_id === cad.id) && (d.slot_number === null || d.slot_number === slot));
      if (!show || cadDeferredAway) continue;

      const key = `${cad.id}:${slot}`;
      const comp = compMap[key];
      const baseLabel = `${PLATFORM_LABEL[cad.platform] || cad.platform.toUpperCase()} Post ${slot}`;
      const label = labels?.[String(slot)] || baseLabel;

      if (!groups[cad.client_id]) {
        groups[cad.client_id] = { client_id: cad.client_id, company_name: clientName[cad.client_id] || "Client", tasks: [] };
      }
      groups[cad.client_id].tasks.push({
        cadence_id: cad.id,
        platform: cad.platform,
        slot_number: slot,
        label,
        checked: !!comp && !comp.archived,
        archived: !!comp && comp.archived,
        completed_by: comp?.completed_by || null,
      });
    }
  }

  // sort tasks within each group by platform order then slot; drop archived from view
  const result = Object.values(groups).map((g) => ({
    ...g,
    tasks: g.tasks
      .filter((t) => !t.archived)
      .sort((a, b) => (PLATFORM_ORDER[a.platform] || 99) - (PLATFORM_ORDER[b.platform] || 99) || a.slot_number - b.slot_number),
  })).filter((g) => g.tasks.length > 0)
    .sort((a, b) => a.company_name.localeCompare(b.company_name));

  return NextResponse.json({ date, groups: result });
}

export async function POST(req: NextRequest) {
  const { user, role } = await getAuthedProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "owner" && role !== "marketing") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = createServiceRoleClient();
  const body = await req.json();
  const { action } = body;

  if (action === "toggle") {
    const { cadence_id, slot_number, date, client_id, checked } = body;
    if (checked) {
      // create completion (idempotent on unique constraint)
      const { error } = await svc.from("marketing_task_completions").upsert(
        { cadence_id, slot_number, completion_date: date, client_id, completed_by: user.id, completed_at: new Date().toISOString(), archived: false },
        { onConflict: "cadence_id,slot_number,completion_date" }
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { error } = await svc.from("marketing_task_completions")
        .delete()
        .eq("cadence_id", cadence_id).eq("slot_number", slot_number).eq("completion_date", date);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "archive") {
    // archive given completed tasks for a date: [{cadence_id, slot_number}]
    const { date, tasks } = body as { date: string; tasks: { cadence_id: string; slot_number: number }[] };
    for (const t of tasks) {
      await svc.from("marketing_task_completions")
        .update({ archived: true })
        .eq("cadence_id", t.cadence_id).eq("slot_number", t.slot_number).eq("completion_date", date);
    }
    return NextResponse.json({ success: true });
  }

  if (action === "rename") {
    const { cadence_id, slot_number, label } = body;
    const { data: cad } = await svc.from("marketing_task_cadences").select("labels").eq("id", cadence_id).maybeSingle();
    const labels = (cad?.labels as Record<string, string> | null) || {};
    labels[String(slot_number)] = label;
    const { error } = await svc.from("marketing_task_cadences").update({ labels }).eq("id", cadence_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === "edit_cadence") {
    const { cadence_id, days_of_week } = body;
    const { error } = await svc.from("marketing_task_cadences").update({ days_of_week }).eq("id", cadence_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === "defer_task") {
    const { cadence_id, slot_number, client_id, defer_from, defer_to } = body;
    const { error } = await svc.from("marketing_task_overrides").insert({ cadence_id, slot_number, client_id, defer_from, defer_to });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === "defer_client") {
    // pause whole client until a date
    const { client_id, paused_until } = body;
    const { error } = await svc.from("marketing_task_cadences").update({ paused_until }).eq("client_id", client_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === "delete_cadence") {
    const { cadence_id } = body;
    const { error } = await svc.from("marketing_task_cadences").delete().eq("id", cadence_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
