"use client";

import { useMemo } from "react";
import { SparklesIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/layout/account-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SessionList } from "@/components/layout/session-list";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Separator } from "@/components/ui/separator";

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
    description: "Search and read team-authored Markdown outputs.",
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

  const currentSection = useMemo(() => {
    if (pathname.startsWith("/app/metrics")) return "metrics";
    if (pathname.startsWith("/app/experiments")) return "experiments";
    if (pathname.startsWith("/app/artifacts")) return "artifacts";
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
        className={`hidden h-full shrink-0 rounded-r-[1.25rem] border-r border-border/55 bg-white/[0.34] md:flex md:flex-col ${
          isChatSection ? "w-[272px]" : "w-[320px]"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-4">
          <div className="flex size-10 items-center justify-center rounded-[1rem] border border-primary/15 bg-primary text-primary-foreground shadow-sm">
            <SparklesIcon className="size-[18px] stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-5">Crew</p>
            <p className="truncate text-[11px] text-muted-foreground">
              Collaborative agent
            </p>
          </div>
          <AccountMenu />
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-3.5 py-4">
          <div className="space-y-3">
            <div className="px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Workspace
              </p>
            </div>
            <SidebarNav />
          </div>
          <Separator className="bg-border/45" />
          <SessionList />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
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
