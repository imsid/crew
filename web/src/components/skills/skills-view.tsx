"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { listSkills, searchSkills } from "@/lib/api";
import type { SkillListItem, SkillListResponse, SkillSearchResponse } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileNav } from "@/components/layout/mobile-nav";
import { truncate } from "@/lib/utils";

export function SkillsView() {
  const { auth } = useAuth();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const skillQuery = useQuery<
    | { mode: "list"; data: SkillListResponse }
    | { mode: "search"; data: SkillSearchResponse }
    | null
  >({
    queryKey: ["skills", deferredQuery],
    queryFn: () => {
      if (!auth) return null;
      if (deferredQuery) {
        return searchSkills(auth.token, deferredQuery).then((data) => ({
          mode: "search" as const,
          data,
        }));
      }
      return listSkills(auth.token).then((data) => ({
        mode: "list" as const,
        data,
      }));
    },
    enabled: Boolean(auth),
  });

  const results =
    skillQuery.data?.mode === "search"
      ? skillQuery.data.data.results
      : skillQuery.data?.mode === "list"
        ? skillQuery.data.data.skills
        : [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <Card className="bg-white/80">
        <CardHeader className="gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <MobileNav />
            <div className="min-w-0">
              <CardTitle className="text-xl sm:text-2xl">Skills library</CardTitle>
              <CardDescription className="mt-1 text-sm sm:text-base">
                Browse packaged SKILL.md workflows available to Crew agents.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search analyst, roadmap, artifact..."
              className="h-12 pl-9 text-base"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {skillQuery.isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full rounded-[1.5rem]" />
          ))}

        {!skillQuery.isLoading &&
          results.map((skill) => (
            <Link key={skill.skill_id} href={`/app/skills/${skill.skill_id}`}>
              <Card className="h-full transition-transform hover:-translate-y-0.5 hover:bg-white">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{skill.name}</CardTitle>
                    <Badge variant="outline">{skill.scope}</Badge>
                  </div>
                  <CardDescription>{getSkillSnippet(skill)}</CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {skill.used_by.map((agentId) => (
                      <Badge key={agentId} variant="secondary">
                        {agentId}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(skill.frontmatter)
                      .filter(([key]) => key !== "name" && key !== "description")
                      .slice(0, 3)
                      .map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-full border border-border/70 bg-secondary/45 px-2.5 py-1 text-xs"
                        >
                          {key}: {truncate(String(value), 28)}
                        </span>
                      ))}
                  </div>
                  <p className="truncate">{skill.path}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>

      {!skillQuery.isLoading && results.length === 0 ? (
        <Card className="bg-white/70">
          <CardContent className="pt-5 text-sm text-muted-foreground">
            No skills matched that search.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function getSkillSnippet(
  skill: SkillListItem | SkillSearchResponse["results"][number],
) {
  if ("preview" in skill && typeof skill.preview === "string") {
    return truncate(skill.preview, 140);
  }
  return truncate(skill.description || `Used by ${skill.used_by.join(", ")}`, 140);
}
