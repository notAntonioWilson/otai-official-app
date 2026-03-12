"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DollarSign } from "lucide-react";

export default function SalesCommission() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("sales_commission_page")
        .select("content, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setContent(data.content || "");
        if (data.updated_at) {
          setUpdatedAt(
            new Date(data.updated_at).toLocaleDateString("en-US", {
              timeZone: "America/New_York",
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          );
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-otai-text-secondary">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign size={24} className="text-otai-green" />
          Commission Structure
        </h1>
        {updatedAt && (
          <p className="text-otai-text-muted text-xs mt-1">Last updated: {updatedAt}</p>
        )}
      </div>

      {content ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-6">
          <div
            className="prose prose-invert max-w-none text-otai-text-secondary leading-relaxed whitespace-pre-wrap"
            style={{ fontSize: "0.9375rem" }}
          >
            {content}
          </div>
        </div>
      ) : (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <DollarSign size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">Commission structure has not been set up yet.</p>
          <p className="text-otai-text-muted text-sm mt-1">
            Your manager will publish commission details here.
          </p>
        </div>
      )}
    </div>
  );
}
