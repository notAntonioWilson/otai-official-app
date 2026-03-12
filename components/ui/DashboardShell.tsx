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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-otai-dark border-t border-otai-border h-16 flex items-center justify-around px-2 z-50">
        {mobileMainTabs.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-xs ${
                isActive(item.href) ? "text-otai-purple" : "text-otai-text-secondary"
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </a>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 text-xs text-otai-text-secondary"
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Drawer */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-otai-dark border-t border-otai-border rounded-t-2xl max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-otai-border">
              <span className="text-white font-semibold">More</span>
              <button onClick={() => setMoreOpen(false)}>
                <X size={20} className="text-otai-text-secondary" />
              </button>
            </div>
            <div className="p-2 space-y-1">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
                      isActive(item.href)
                        ? "bg-otai-purple/20 text-otai-purple"
                        : "text-otai-text-secondary hover:bg-white/5"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </a>
                );
              })}
              <a
                href={settingsHref}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-otai-text-secondary hover:bg-white/5"
              >
                <Settings size={18} />
                <span>Settings</span>
              </a>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-otai-red hover:bg-white/5 w-full"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
