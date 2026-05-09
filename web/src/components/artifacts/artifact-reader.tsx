"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, FileTextIcon } from "lucide-react";
import { getArtifact } from "@/lib/api";
import type { ArtifactDetailResponse } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { formatDateTime } from "@/lib/utils";

export function ArtifactReader({
  artifactId,
  artifact,
  compact = false,
}: Readonly<{
  artifactId?: string;
  artifact?: ArtifactDetailResponse;
  compact?: boolean;
}>) {
  const { auth } = useAuth();
  const artifactQuery = useQuery({
    queryKey: ["artifact", artifactId],
    queryFn: () => (auth && artifactId ? getArtifact(auth.token, artifactId) : null),
    enabled: Boolean(auth && artifactId && !artifact),
  });

  const resolvedArtifact = artifact ?? artifactQuery.data ?? null;

  if (artifactQuery.isLoading && !artifact) {
    return (
      <div className="h-full min-h-0 space-y-3 overflow-y-auto">
        <Skeleton className="h-14 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!resolvedArtifact) {
    return (
      <Card className="h-full">
        <CardContent className="pt-5 text-sm text-muted-foreground">
          Artifact unavailable.
        </CardContent>
      </Card>
    );
  }

  const content = compact
    ? toBodyOnlyMarkdown(resolvedArtifact)
    : stripArtifactFrontmatter(resolvedArtifact.content);

  if (compact) {
    return (
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="px-0 pb-0">
          <MarkdownRenderer markdown={content} className="[&>*:first-child]:mt-0" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit shrink-0 rounded-full border border-border/70 bg-white/70 px-4"
      >
        <Link href="/app/artifacts">
          <ArrowLeftIcon className="size-4" />
          Back to artifacts
        </Link>
      </Button>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="shrink-0 gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <FileTextIcon className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl sm:text-2xl">
                {resolvedArtifact.frontmatter.title}
              </CardTitle>
              <CardDescription className="max-w-3xl text-base leading-7">
                {resolvedArtifact.frontmatter.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge>{resolvedArtifact.frontmatter.kind}</Badge>
            <Badge variant="outline">{resolvedArtifact.frontmatter.source_agent}</Badge>
            <span>{formatDateTime(resolvedArtifact.frontmatter.updated_at)}</span>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-0 sm:px-7 sm:pb-7">
          <div className="mb-6 h-px bg-border/70" />
          <MarkdownRenderer markdown={content} className="[&>*:first-child]:mt-0" />
        </CardContent>
      </Card>
    </div>
  );
}

function toBodyOnlyMarkdown(artifact: ArtifactDetailResponse) {
  return artifact.ordered_sections
    .map((section) => `## ${section}\n\n${artifact.sections[section]}`)
    .join("\n\n");
}

function stripArtifactFrontmatter(content: string) {
  if (!content.startsWith("---")) return content;

  const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  if (!match) return content;
  return content.slice(match[0].length);
}
