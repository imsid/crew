"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { listSessions, searchSessions } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime, truncate } from "@/lib/utils";

export function SessionList({
  onNavigate,
}: Readonly<{
  onNavigate?: () => void;
}>) {
  const { auth } = useAuth();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const sessionQuery = useQuery({
    queryKey: deferredQuery
      ? ["sessions", "search", deferredQuery]
      : ["sessions", "list"],
    queryFn: async () => {
      if (!auth) return null;
      if (deferredQuery) {
        return { mode: "search" as const, data: await searchSessions(auth.token, deferredQuery) };
      }
      return { mode: "list" as const, data: await listSessions(auth.token) };
    },
    enabled: Boolean(auth),
  });

  const items = useMemo(() => {
    if (!sessionQuery.data) return [];
    if (sessionQuery.data.mode === "list") {
      const sessions = Array.isArray(sessionQuery.data.data?.sessions)
        ? sessionQuery.data.data.sessions
        : [];
      return sessions.map((session) => ({
        id: session.session_id,
        label: session.label || "Untitled analysis",
        meta: formatRelativeTime(session.last_message_at ?? session.last_opened_at),
        preview: session.preview_text || null,
        turnCount: session.turn_count ?? 0,
      }));
    }

    const results = Array.isArray(sessionQuery.data.data?.results)
      ? sessionQuery.data.data.results
      : [];
    return results.map((result) => ({
      id: result.session_id,
      label: result.preview.split(/[.!?]/)[0] || "Matching turn",
      meta: "Search match",
      preview: result.preview,
      turnCount: null,
    }));
  }, [sessionQuery.data]);

  return (
    <section className="space-y-3.5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Recent chats</h2>
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sessions"
          className="h-11 rounded-[1.1rem] border-border/70 bg-white/85 pl-9 text-sm shadow-sm"
        />
      </div>

      <div className="space-y-1.5">
        {sessionQuery.isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-md" />
          ))}

        {!sessionQuery.isLoading && items.length === 0 && (
          <div className="rounded-[1.2rem] border border-dashed border-border bg-white/55 px-4 py-6 text-sm text-muted-foreground">
            {deferredQuery
              ? "No saved sessions match that search."
              : "No saved analyses yet. Start a new chat to create one."}
          </div>
        )}

        {items.map((item) => {
          const isActive = pathname === `/app/chat/${item.id}`;
          return (
            <Link
              key={item.id}
              href={`/app/chat/${item.id}`}
              onClick={onNavigate}
              className={`block rounded-md px-2 py-2 transition-colors ${
                isActive
                  ? "bg-primary/[0.08] text-primary"
                  : "text-foreground hover:bg-secondary/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {truncate(item.label, 42)}
                </p>
                <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                  <span>{item.meta}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
