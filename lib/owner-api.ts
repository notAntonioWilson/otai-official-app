// Helper for owner pages to query data through the service-role API
// This bypasses RLS since the API route verifies owner + uses service role key

interface QueryOptions {
  select?: string;
  match?: Record<string, string>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

export async function ownerSelect(table: string, options?: QueryOptions) {
  const res = await fetch("/api/owner-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "select", table, ...options }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function ownerInsert(table: string, data: Record<string, unknown>) {
  const res = await fetch("/api/owner-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "insert", table, data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function ownerUpdate(table: string, match: Record<string, string>, data: Record<string, unknown>) {
  const res = await fetch("/api/owner-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", table, match, data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function ownerDelete(table: string, match: Record<string, string>) {
  const res = await fetch("/api/owner-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", table, match }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}
