"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";
import { MoreHorizontal, X, LogOut, Settings } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
}

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
  navItems: NavItem[];
  mobileMainTabs: NavItem[];
  mobileMoreItems: NavItem[];
  settingsHref: string;
}

export default function DashboardShell({
  children, role, navItems, mobileMainTabs, mobileMoreItems, settingsHref,
}: DashboardShellProps) {
  const [loading, setLoading] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== role) {
        window.location.href = "/login";
        return;
      }
      setLoading(false);
    }
    check();
  }, [role]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const isActive = (href: string) => {
    const basePaths: Record<string, string> = {
      "/owner": "/owner", "/marketing": "/marketing",
      "/sales": "/sales", "/client": "/client",
    };
    const base = basePaths[`/${role === "sales_rep" ? "sales" : role}`];
    if (href === base) return pathname === base;
    return pathname.startsWith(href);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-otai-purple text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-60 bg-otai-dark border-r border-otai-border">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-otai-purple">OTAI</h1>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-otai-purple/20 text-otai-purple"
                    : "text-otai-text-secondary hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>
        <div className="p-3 border-t border-otai-border">
          <a
            href={settingsHref}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              pathname === settingsHref
                ? "bg-otai-purple/20 text-otai-purple"
                : "text-otai-text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </a>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-otai-text-muted hover:bg-white/5 hover:text-otai-red transition-colors w-full"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-60 min-h-screen pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-otai-dark border-t border-otai-border z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="h-16 flex items-center justify-around px-1">
          {mobileMainTabs.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 min-w-0 flex-1 transition-colors ${
                  active ? "text-otai-purple" : "text-otai-text-secondary"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  active ? "bg-otai-purple/20" : ""
                }`}>
                  <Icon size={19} />
                </div>
                <span className="text-[10px] leading-tight truncate">{item.name}</span>
              </a>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-2 min-w-0 flex-1 transition-colors ${
              moreOpen ? "text-otai-purple" : "text-otai-text-secondary"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              moreOpen ? "bg-otai-purple/20" : ""
            }`}>
              <MoreHorizontal size={19} />
            </div>
            <span className="text-[10px] leading-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile More Drawer */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-otai-dark border-t border-otai-border rounded-t-2xl z-10"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-otai-border">
              <span className="text-white font-semibold text-base">More</span>
              <button onClick={() => setMoreOpen(false)} className="p-1 text-otai-text-secondary hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-colors ${
                      active
                        ? "bg-otai-purple/20 text-otai-purple"
                        : "text-white hover:bg-white/5"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? "bg-otai-purple/30" : "bg-white/5"
                    }`}>
                      <Icon size={18} />
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </a>
                );
              })}
              <a
                href={settingsHref}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-colors ${
                  pathname === settingsHref
                    ? "bg-otai-purple/20 text-otai-purple"
                    : "text-white hover:bg-white/5"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Settings size={18} />
                </div>
                <span className="font-medium">Settings</span>
              </a>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm text-otai-red hover:bg-white/5 w-full"
              >
                <div className="w-9 h-9 rounded-lg bg-otai-red/10 flex items-center justify-center shrink-0">
                  <LogOut size={18} />
                </div>
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
