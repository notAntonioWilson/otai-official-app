"use client";

import DashboardShell from "@/components/ui/DashboardShell";
import {
  LayoutDashboard, Monitor, Eye, Contact, DollarSign, Megaphone,
  BarChart3, BookOpen, UserCog, Webhook, Bell,
} from "lucide-react";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { name: "Dashboard", href: "/owner", icon: LayoutDashboard },
    { name: "Control Room", href: "/owner/control-room", icon: Monitor },
    { name: "Third Eye", href: "/owner/third-eye", icon: Eye },
    { name: "CRM", href: "/owner/crm", icon: Contact },
    { name: "Finance", href: "/owner/finance", icon: DollarSign },
    { name: "Marketing", href: "/owner/marketing-oversight", icon: Megaphone },
    { name: "Sales", href: "/owner/sales-oversight", icon: BarChart3 },
    { name: "Courses", href: "/owner/courses", icon: BookOpen },
    { name: "Client Updates", href: "/owner/client-updates", icon: Bell },
    { name: "Users", href: "/owner/users", icon: UserCog },
    { name: "Webhooks", href: "/owner/webhooks", icon: Webhook },
  ];

  return (
    <DashboardShell
      role="owner"
      navItems={navItems}
      mobileMainTabs={[
        { name: "Home", href: "/owner", icon: LayoutDashboard },
        { name: "Control", href: "/owner/control-room", icon: Monitor },
        { name: "Third Eye", href: "/owner/third-eye", icon: Eye },
        { name: "CRM", href: "/owner/crm", icon: Contact },
      ]}
      mobileMoreItems={[
        { name: "Finance", href: "/owner/finance", icon: DollarSign },
        { name: "Marketing Oversight", href: "/owner/marketing-oversight", icon: Megaphone },
        { name: "Sales Oversight", href: "/owner/sales-oversight", icon: BarChart3 },
        { name: "Courses", href: "/owner/courses", icon: BookOpen },
        { name: "Client Updates", href: "/owner/client-updates", icon: Bell },
        { name: "Users", href: "/owner/users", icon: UserCog },
        { name: "Webhooks", href: "/owner/webhooks", icon: Webhook },
      ]}
      settingsHref="/owner/settings"
    >
      {children}
    </DashboardShell>
  );
}
