"use client";

import DashboardShell from "@/components/ui/DashboardShell";
import { Calendar, Users, BookOpen } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { name: "Calendar", href: "/marketing", icon: Calendar },
    { name: "Clients", href: "/marketing/clients", icon: Users },
    { name: "Courses", href: "/marketing/courses", icon: BookOpen },
  ];

  return (
    <DashboardShell
      role="marketing"
      navItems={navItems}
      mobileMainTabs={[
        { name: "Calendar", href: "/marketing", icon: Calendar },
        { name: "Clients", href: "/marketing/clients", icon: Users },
        { name: "Courses", href: "/marketing/courses", icon: BookOpen },
      ]}
      mobileMoreItems={[]}
      settingsHref="/marketing/settings"
    >
      {children}
    </DashboardShell>
  );
}
