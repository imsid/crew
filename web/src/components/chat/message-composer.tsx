"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AuiIf, ComposerPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { ArrowUpIcon, CornerDownLeftIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SLASH_COMMANDS } from "@/lib/commands";

const SlashCommandPalette = dynamic(
  () => import("@/components/chat/slash-command-palette").then((mod) => mod.SlashCommandPalette),
);

export function MessageComposer() {
  const aui = useAui();
  const text = useAuiState((state) => state.composer.text);
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const visibleCommands = useMemo(() => {
    const normalized = text.trim().toLowerCase().replace(/^\//, "");
    if (!text.startsWith("/")) return [];
    if (!normalized) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((command) =>
      `${command.surface} ${command.operation} ${command.label} ${command.hint}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [text]);

  const submitOrInsert = (template: string) => {
    aui.composer().setText(template);
    setHighlightedIndex(0);
    if (!template.endsWith(" ")) {
      queueMicrotask(() => {
        aui.composer().send();
      });
    }
  };

  return (
    <div className="relative isolate">
      <SlashCommandPalette
        query={text}
        highlightedIndex={highlightedIndex}
        onSelect={() => setHighlightedIndex(0)}
        className="absolute bottom-[calc(100%+0.75rem)] left-0 right-0 z-50"
      />
      <ComposerPrimitive.Root className="rounded-[1.35rem] border border-border/80 bg-white/98 shadow-[0_10px_28px_rgba(36,29,20,0.06)] backdrop-blur-sm transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/20 focus-within:ring-offset-0">
        <ComposerPrimitive.Input
          rows={1}
          placeholder="Ask Crew or type / for commands"
          className="min-h-[52px] w-full resize-none bg-transparent px-4 pb-1 pt-3 text-[15px] leading-6 placeholder:text-muted-foreground/75 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          onKeyDown={(event) => {
            if (!text.startsWith("/") || visibleCommands.length === 0) return;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightedIndex((current) => (current + 1) % visibleCommands.length);
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightedIndex((current) =>
                current === 0 ? visibleCommands.length - 1 : current - 1,
              );
            }

            if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey) {
              const selected = visibleCommands[highlightedIndex];
              if (!selected) return;
              event.preventDefault();
              submitOrInsert(selected.template);
            }
          }}
        />
        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-3.5 py-2">
          <div className="hidden items-center gap-2 text-[12px] text-muted-foreground sm:flex">
            <CornerDownLeftIcon className="size-3.5" />
            {isRunning
              ? "Streaming execution trace and final answer."
              : "Enter sends. Shift + Enter keeps drafting."}
          </div>
          <div className="ml-auto">
            <AuiIf condition={(state) => !state.thread.isRunning}>
              <ComposerPrimitive.Send asChild>
                <Button size="icon" className="size-9 shadow-sm">
                  <ArrowUpIcon className="size-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </ComposerPrimitive.Send>
            </AuiIf>
            <AuiIf condition={(state) => state.thread.isRunning}>
              <ComposerPrimitive.Cancel asChild>
                <Button size="icon" variant="secondary" className="size-9 border border-border/70">
                  <SquareIcon className="size-3.5" />
                  <span className="sr-only">Cancel run</span>
                </Button>
              </ComposerPrimitive.Cancel>
            </AuiIf>
          </div>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
}
