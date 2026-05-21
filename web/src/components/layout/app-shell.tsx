"use client";

import { useMemo, useState } from "react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, SparklesIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/layout/account-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SessionList } from "@/components/layout/session-list";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sectionMeta = {
  chat: {
    title: "Agent workspace",
    description: "Conversational analysis across metrics, experiments, skills, and artifacts.",
  },
  metrics: {
    title: "Metrics explorer",
    description: "Metric definitions and compiled SQL.",
  },
  experiments: {
    title: "Experiments explorer",
    description: "Experiment configs and analysis plans.",
  },
  artifacts: {
    title: "Artifact library",
    description: "Search and read team-authored Markdown and HTML outputs.",
  },
  workflows: {
    title: "Workflow runner",
    description: "Run registered Mash workflows and inspect their results.",
  },
  skills: {
    title: "Skills library",
    description: "Reusable SKILL.md workflows available across Crew agents.",
  },
} as const;

export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const currentSection = useMemo(() => {
    if (pathname.startsWith("/app/metrics")) return "metrics";
    if (pathname.startsWith("/app/experiments")) return "experiments";
    if (pathname.startsWith("/app/artifacts")) return "artifacts";
    if (pathname.startsWith("/app/workflows")) return "workflows";
    if (pathname.startsWith("/app/skills")) return "skills";
    return "chat";
  }, [pathname]);

  const meta = sectionMeta[currentSection];
  const isChatSection = currentSection === "chat";
  const showShellHeader =
    currentSection !== "chat" &&
    currentSection !== "artifacts" &&
    currentSection !== "skills";

  return (
    <div className="mx-auto flex h-screen w-full max-w-[1660px] gap-2 overflow-hidden py-3 pr-3 pl-0 sm:py-4 sm:pr-4 sm:pl-0">
      <aside
        className={cn(
          "hidden h-full shrink-0 rounded-r-[1.25rem] border-r border-border/55 bg-white/[0.34] transition-[width] duration-200 md:flex md:flex-col",
          sidebarCollapsed ? "w-[56px]" : isChatSection ? "w-[248px]" : "w-[272px]",
        )}
      >
        <div className={cn(
          "border-b border-border/50 px-3 py-3",
          sidebarCollapsed && "px-2",
        )}>
          <div className={cn(
            "flex items-center gap-2",
            sidebarCollapsed && "flex-col",
          )}>
            <div className="flex size-9 items-center justify-center rounded-[0.9rem] border border-primary/15 bg-primary text-primary-foreground shadow-sm">
              <SparklesIcon className="size-[18px] stroke-[2.2]" />
            </div>
            <div className={cn("min-w-0 flex-1", sidebarCollapsed && "sr-only")}>
              <p className="truncate text-[15px] font-semibold leading-5">Crew</p>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Collaborative agent
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setSidebarCollapsed((value) => !value)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpenIcon className="size-4" />
              ) : (
                <PanelLeftCloseIcon className="size-4" />
              )}
              <span className="sr-only">
                {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </span>
            </Button>
          </div>
          {!sidebarCollapsed ? (
            <div className="mt-2">
              <AccountMenu />
            </div>
          ) : null}
        </div>
        <div className={cn(
          "flex flex-1 flex-col gap-3 overflow-y-auto px-2.5 py-3",
          sidebarCollapsed && "items-center px-1.5",
        )}>
          <div className="space-y-2">
            <div className={cn("px-1", sidebarCollapsed && "sr-only")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Workspace
              </p>
            </div>
            <SidebarNav collapsed={sidebarCollapsed} />
          </div>
          {!sidebarCollapsed ? (
            <>
              <Separator className="bg-border/45" />
              <SessionList />
            </>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        {!showShellHeader ? (
          <div className="absolute left-3 top-3 z-20 md:hidden">
            <MobileNav />
          </div>
        ) : null}

        {showShellHeader ? (
          <header className="surface-panel px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
              <MobileNav />
              <div className="min-w-0">
                <h1 className="text-xl font-semibold sm:text-2xl">{meta.title}</h1>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  {meta.description}
                </p>
              </div>
            </div>
          </header>
        ) : null}

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
