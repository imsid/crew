"use client";

import { CheckIcon, ChevronDownIcon, DatabaseIcon } from "lucide-react";
import { useWorkspace } from "@/providers/workspace-provider";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({
  collapsed = false,
}: Readonly<{
  collapsed?: boolean;
}>) {
  const { workspaceId, workspaces, setWorkspaceId, isReady } = useWorkspace();
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.workspace_id === workspaceId) ?? null;

  if (collapsed) {
    return (
      <div
        className="flex size-8 items-center justify-center rounded-[0.7rem] bg-secondary/70 text-foreground"
        title={workspaceId}
      >
        <DatabaseIcon className="size-4" />
      </div>
    );
  }

  return (
    <details className="group relative">
      <summary
        className={cn(
          "flex min-h-10 list-none items-center gap-2 rounded-[0.95rem] border border-border/70 bg-white/75 px-2.5 py-2 text-left shadow-sm transition-colors hover:bg-white [&::-webkit-details-marker]:hidden",
          (!isReady || workspaces.length === 0) && "pointer-events-none opacity-60",
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[0.7rem] bg-secondary text-foreground">
          <DatabaseIcon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.12em] text-muted-foreground">
            Workspace
          </span>
          <span className="block truncate text-[13px] font-semibold leading-4 text-foreground">
            {selectedWorkspace?.workspace_id ?? workspaceId}
          </span>
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="absolute left-0 top-full z-40 mt-2 w-full min-w-[210px] rounded-[1rem] border border-border/80 bg-white/98 p-1.5 shadow-[0_18px_40px_rgba(36,29,20,0.12)]">
        {workspaces.map((workspace) => {
          const isSelected = workspace.workspace_id === workspaceId;
          return (
            <button
              key={workspace.workspace_id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-[0.8rem] px-2.5 py-2 text-left transition-colors",
                isSelected ? "bg-primary/[0.08] text-primary" : "text-foreground hover:bg-secondary/80",
              )}
              onClick={(event) => {
                setWorkspaceId(workspace.workspace_id);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-[0.55rem] bg-secondary/80">
                {isSelected ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  <DatabaseIcon className="size-3.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {workspace.workspace_id}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {workspace.dataset_id}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </details>
  );
}
