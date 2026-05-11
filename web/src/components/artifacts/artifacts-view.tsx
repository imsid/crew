"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { listArtifacts, searchArtifacts } from "@/lib/api";
import type { ArtifactListResponse, ArtifactSearchResponse } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileNav } from "@/components/layout/mobile-nav";
import { formatDateTime, truncate } from "@/lib/utils";

export function ArtifactsView() {
  const { auth } = useAuth();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const artifactQuery = useQuery<
    | { mode: "list"; data: ArtifactListResponse }
    | { mode: "search"; data: ArtifactSearchResponse }
    | null
  >({
    queryKey: ["artifacts", deferredQuery],
    queryFn: () => {
      if (!auth) return null;
      if (deferredQuery) {
        return searchArtifacts(auth.token, deferredQuery).then((data) => ({
          mode: "search" as const,
          data,
        }));
      }
      return listArtifacts(auth.token).then((data) => ({
        mode: "list" as const,
        data,
      }));
    },
    enabled: Boolean(auth),
  });

  const results =
    artifactQuery.data?.mode === "search"
      ? artifactQuery.data.data.results
      : artifactQuery.data?.mode === "list"
        ? artifactQuery.data.data.artifacts
        : [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <Card className="bg-white/80">
        <CardHeader className="gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <MobileNav />
            <div className="min-w-0">
              <CardTitle className="text-xl sm:text-2xl">Artifact library</CardTitle>
              <CardDescription className="mt-1 text-sm sm:text-base">
                Search shared Markdown and HTML outputs created from prior analyses.
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
              placeholder="Search launch readiness, signup, activation..."
              className="h-12 pl-9 text-base"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {artifactQuery.isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-[1.5rem]" />
          ))}

        {!artifactQuery.isLoading &&
          results.map((artifact) => (
            <Link key={artifact.artifact_id} href={`/app/artifacts/${artifact.artifact_id}`}>
                <Card className="h-full transition-transform hover:-translate-y-0.5 hover:bg-white">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{artifact.title}</CardTitle>
                    <Badge variant="outline">{artifact.kind}</Badge>
                    <Badge variant="secondary">{artifact.format}</Badge>
                  </div>
                  <CardDescription>{getArtifactSnippet(artifact)}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>{artifact.source_agent}</span>
                  <span>{formatDateTime(artifact.updated_at)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>

      {!artifactQuery.isLoading && results.length === 0 ? (
        <Card className="bg-white/70">
          <CardContent className="pt-5 text-sm text-muted-foreground">
            No artifacts matched that search.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function getArtifactSnippet(
  artifact:
    | ArtifactListResponse["artifacts"][number]
    | ArtifactSearchResponse["results"][number],
) {
  if ("preview" in artifact && typeof artifact.preview === "string") {
    return truncate(artifact.preview, 120);
  }
  return artifact.description;
}
