"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClientUpdate } from "@/types";
import { Bell } from "lucide-react";

export default function ClientUpdates() {
  const [updates, setUpdates] = useState<ClientUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!client) { setLoading(false); return; }

      const { data } = await supabase
        .from("client_updates")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      setUpdates(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-otai-text-secondary">Loading updates...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Updates</h1>

      {updates.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <Bell size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No updates yet</p>
          <p className="text-otai-text-muted text-sm mt-1">
            Updates about your services will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <div
              key={update.id}
              className="bg-otai-dark border border-otai-border rounded-xl p-5"
            >
              <p className="text-otai-gold text-xs mb-2">
                {new Date(update.created_at).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "numeric", minute: "2-digit",
                })}
              </p>
              {update.title && (
                <h3 className="text-white font-semibold mb-1">{update.title}</h3>
              )}
              {update.content && (
                <p className="text-otai-text-secondary text-sm">{update.content}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
