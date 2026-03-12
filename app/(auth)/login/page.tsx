"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      let email = identifier.trim();

      // If input doesn't contain @, treat as username and look up email
      if (!email.includes("@")) {
        const { data: profile, error: lookupError } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", email)
          .maybeSingle();

        if (lookupError || !profile) {
          setError("User not found.");
          setLoading(false);
          return;
        }
        email = profile.email;
      }

      // Sign in with email and password
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Get profile to determine role
      const userId = data.user?.id;
      if (!userId) {
        setError("Authentication failed.");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", userId)
        .maybeSingle();

      if (!profile) {
        setError("Profile not found. Contact admin.");
        setLoading(false);
        return;
      }

      if (profile.status === "inactive") {
        await supabase.auth.signOut();
        setError("Account disabled. Contact admin.");
        setLoading(false);
        return;
      }

      // Redirect based on role
      const role = profile.role;
      if (role === "owner") window.location.href = "/owner";
      else if (role === "marketing") window.location.href = "/marketing";
      else if (role === "sales_rep") window.location.href = "/sales";
      else if (role === "client") window.location.href = "/client";
      else window.location.href = "/client";
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-otai-dark border border-otai-border rounded-xl p-8">
          <h1 className="text-3xl font-bold text-otai-purple text-center mb-2">
            OTAI APP
          </h1>
          <p className="text-white text-center text-lg mb-8">Welcome!</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username or Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 bg-otai-dark border border-otai-border rounded-lg text-white placeholder-otai-text-muted focus:outline-none focus:border-otai-purple transition-colors"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-otai-dark border border-otai-border rounded-lg text-white placeholder-otai-text-muted focus:outline-none focus:border-otai-purple transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-otai-purple hover:bg-otai-purple-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-otai-red text-center text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
