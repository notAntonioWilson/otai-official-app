"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Client, ClientService, ServiceType } from "@/types";
import {
  LayoutDashboard, Bell, Settings, Home, MoreHorizontal, X,
  Globe, MessageSquare, Phone, Zap, Share2, Mail, Smartphone, Puzzle, LogOut,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SERVICE_ICONS: Record<string, any> = {
  website_seo: Globe, chatbot: MessageSquare, phone_agent: Phone,
  automations: Zap, social_media: Share2, email_outreach: Mail,
  app: Smartphone, custom: Puzzle,
};

const SERVICE_NAMES: Record<string, string> = {
  website_seo: "Website & SEO", chatbot: "Chatbot", phone_agent: "Phone Agent",
  automations: "Automations", social_media: "Social Media",
  email_outreach: "Email Outreach", app: "App", custom: "Custom",
};

interface NavItem {
  name: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [services, setServices] = useState<ClientService[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!p || p.role !== "client") { window.location.href = "/login"; return; }
      setProfile(p);

      const { data: c } = await supabase.from("clients").select("*").eq("user_id", user.id).maybeSingle();
      if (c) {
        setClient(c);
        const { data: s } = await supabase
          .from("client_services")
          .select("*")
          .eq("client_id", c.id)
          .eq("status", "active")
          .order("created_at");
        setServices(s || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-otai-purple text-lg">Loading...</div>
      </div>
    );
  }

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/client", icon: LayoutDashboard },
    { name: "Updates", href: "/client/updates", icon: Bell },
    ...services.map((s) => ({
      name: s.custom_service_name || SERVICE_NAMES[s.service_type] || s.service_type,
      href: `/client/services/${s.id}`,
      icon: SERVICE_ICONS[s.service_type] || Puzzle,
    })),
  ];

  const isActive = (href: string) => {
    if (href === "/client") return pathname === "/client";
    return pathname.startsWith(href);
  };

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
            href="/client/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              pathname === "/client/settings"
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
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-otai-dark border-t border-otai-border h-16 flex items-center justify-around px-2 z-50">
        <a
          href="/client/updates"
          className={`flex flex-col items-center gap-1 text-xs ${
            pathname === "/client/updates" ? "text-otai-purple" : "text-otai-text-secondary"
          }`}
        >
          <Bell size={20} />
          <span>Updates</span>
        </a>
        <a
          href="/client"
          className={`flex flex-col items-center gap-1 text-xs ${
            pathname === "/client" ? "text-otai-purple" : "text-otai-text-secondary"
          }`}
        >
          <Home size={20} />
          <span>Home</span>
        </a>
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-1 text-xs ${
            moreOpen ? "text-otai-purple" : "text-otai-text-secondary"
          }`}
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
              {services.map((s) => {
                const Icon = SERVICE_ICONS[s.service_type] || Puzzle;
                const name = s.custom_service_name || SERVICE_NAMES[s.service_type] || s.service_type;
                const href = `/client/services/${s.id}`;
                return (
                  <a
                    key={s.id}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
                      isActive(href)
                        ? "bg-otai-purple/20 text-otai-purple"
                        : "text-otai-text-secondary hover:bg-white/5"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{name}</span>
                  </a>
                );
              })}
              <a
                href="/client/settings"
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
