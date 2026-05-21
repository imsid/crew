"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BrainCircuitIcon,
  FlaskConicalIcon,
  FileTextIcon,
  MessagesSquareIcon,
  WorkflowIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/app",
    label: "Chat",
    description: "Agent Mode",
    icon: MessagesSquareIcon,
  },
  {
    href: "/app/metrics",
    label: "Metrics",
    description: "Semantic Layer",
    icon: BarChart3Icon,
  },
  {
    href: "/app/experiments",
    label: "Experiments",
    description: "A/B",
    icon: FlaskConicalIcon,
  },
  {
    href: "/app/artifacts",
    label: "Artifacts",
    description: "Team Knowledge",
    icon: FileTextIcon,
  },
  {
    href: "/app/workflows",
    label: "Workflows",
    description: "Run Books",
    icon: WorkflowIcon,
  },
  {
    href: "/app/skills",
    label: "SKILLS",
    description: "Agent Capabilities",
    icon: BrainCircuitIcon,
  },
];

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: Readonly<{
  onNavigate?: () => void;
  collapsed?: boolean;
}>) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {navItems.map((item) => {
        const isActive =
          item.href === "/app"
            ? pathname === "/app" || pathname.startsWith("/app/chat")
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-10 items-center gap-2.5 rounded-[0.85rem] px-2.5 py-1.5 transition-colors",
              collapsed && "justify-center px-1.5",
              isActive
                ? "bg-primary/[0.09] text-primary"
                : "bg-transparent text-foreground hover:bg-white/55",
            )}
            title={collapsed ? item.label : undefined}
          >
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-[0.7rem]",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/70 text-foreground",
              )}
            >
              <Icon className="size-3.5" />
            </div>
            <div className={cn("min-w-0", collapsed && "sr-only")}>
              <p className="truncate text-sm font-semibold leading-5">{item.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">{item.description}</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
