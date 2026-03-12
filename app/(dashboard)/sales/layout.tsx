"use client";

import DashboardShell from "@/components/ui/DashboardShell";
import { Trophy, BookOpen, DollarSign } from "lucide-react";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { name: "Leaderboard", href: "/sales", icon: Trophy },
    { name: "Courses", href: "/sales/courses", icon: BookOpen },
    { name: "Commission", href: "/sales/commission", icon: DollarSign },
  ];

  return (
    <DashboardShell
      role="sales_rep"
      navItems={navItems}
      mobileMainTabs={[
        { name: "Leaderboard", href: "/sales", icon: Trophy },
        { name: "Courses", href: "/sales/courses", icon: BookOpen },
      ]}
      mobileMoreItems={[
        { name: "Commission", href: "/sales/commission", icon: DollarSign },
      ]}
      settingsHref="/sales/settings"
    >
      {children}
    </DashboardShell>
  );
}
