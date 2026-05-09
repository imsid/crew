"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BrainCircuitIcon,
  FlaskConicalIcon,
  FileTextIcon,
  MessagesSquareIcon,
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
    href: "/app/skills",
    label: "SKILLS",
    description: "Agent Capabilities",
    icon: FileTextIcon,
  },
];

export function SidebarNav({
  onNavigate,
}: Readonly<{
  onNavigate?: () => void;
}>) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
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
              "flex min-h-11 items-center gap-3 rounded-[0.95rem] px-3 py-2 transition-colors",
              isActive
                ? "bg-primary/[0.09] text-primary"
                : "bg-transparent text-foreground hover:bg-white/55",
            )}
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-[0.8rem]",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/70 text-foreground",
              )}
            >
              <Icon className="size-[15px]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5">{item.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">{item.description}</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
