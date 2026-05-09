"use client";

import { useMemo } from "react";
import { useAui } from "@assistant-ui/react";
import { Badge } from "@/components/ui/badge";
import { SLASH_COMMANDS } from "@/lib/commands";
import { cn } from "@/lib/utils";

type PaletteItem = (typeof SLASH_COMMANDS)[number];

export function SlashCommandPalette({
  query,
  highlightedIndex,
  onSelect,
  className,
}: Readonly<{
  query: string;
  highlightedIndex: number;
  onSelect?: (item: PaletteItem) => void;
  className?: string;
}>) {
  const aui = useAui();
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase().replace(/^\//, "");
    if (!normalized) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((command) =>
      `${command.surface} ${command.operation} ${command.label} ${command.hint}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  const groupedItems = useMemo(() => {
    return visibleItems.reduce<Record<string, PaletteItem[]>>((groups, item) => {
      const key = item.surface;
      groups[key] = [...(groups[key] ?? []), item];
      return groups;
    }, {});
  }, [visibleItems]);

  const submitOrInsert = (item: PaletteItem) => {
    aui.composer().setText(item.template);
    onSelect?.(item);
    if (!item.template.endsWith(" ")) {
      queueMicrotask(() => {
        aui.composer().send();
      });
    }
  };

  if (!query.startsWith("/") || visibleItems.length === 0) return null;

  let flatIndex = -1;

  return (
    <div
      className={cn(
        "max-h-[min(24rem,calc(100vh-16rem))] overflow-y-auto overscroll-contain rounded-[1.2rem] border border-border/80 bg-white p-2 shadow-[0_22px_60px_rgba(36,29,20,0.16)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="space-y-3">
        {Object.entries(groupedItems).map(([group, items]) => (
          <div key={group} className="space-y-1">
          <div className="px-3 py-2">
            <Badge variant="secondary" className="uppercase tracking-[0.12em]">
              {group}
            </Badge>
          </div>
          {items.map((item) => {
            flatIndex += 1;
            const isHighlighted = flatIndex === highlightedIndex;
            return (
              <button
                key={item.template}
                type="button"
                onClick={() => submitOrInsert(item)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-[1rem] px-3 py-3 text-left transition-colors",
                  isHighlighted ? "bg-secondary/90" : "hover:bg-secondary/65",
                )}
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </div>
                <code className="rounded-full bg-background px-2 py-1 text-[11px] text-muted-foreground">
                  {item.template.trim()}
                </code>
              </button>
            );
          })}
          </div>
        ))}
      </div>
    </div>
  );
}
