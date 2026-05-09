"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, BrainCircuitIcon } from "lucide-react";
import { getSkill } from "@/lib/api";
import type { SkillDetailResponse } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

export function SkillReader({
  skillId,
  skill,
}: Readonly<{
  skillId?: string;
  skill?: SkillDetailResponse;
}>) {
  const { auth } = useAuth();
  const skillQuery = useQuery({
    queryKey: ["skill", skillId],
    queryFn: () => (auth && skillId ? getSkill(auth.token, skillId) : null),
    enabled: Boolean(auth && skillId && !skill),
  });

  const resolvedSkill = skill ?? skillQuery.data ?? null;

  if (skillQuery.isLoading && !skill) {
    return (
      <div className="h-full min-h-0 space-y-3 overflow-y-auto">
        <Skeleton className="h-14 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!resolvedSkill) {
    return (
      <Card className="h-full">
        <CardContent className="pt-5 text-sm text-muted-foreground">
          Skill unavailable.
        </CardContent>
      </Card>
    );
  }

  const title =
    String(resolvedSkill.frontmatter.name || "").trim() ||
    resolvedSkill.skill_id;
  const description = String(resolvedSkill.frontmatter.description || "").trim();

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit shrink-0 rounded-full border border-border/70 bg-white/70 px-4"
      >
        <Link href="/app/skills">
          <ArrowLeftIcon className="size-4" />
          Back to skills
        </Link>
      </Button>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="shrink-0 gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <BrainCircuitIcon className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
              <CardDescription className="max-w-3xl text-base leading-7">
                {description || "Reusable workflow instructions for Crew agents."}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge>{resolvedSkill.scope}</Badge>
            {resolvedSkill.used_by.map((agentId) => (
              <Badge key={agentId} variant="outline">
                {agentId}
              </Badge>
            ))}
            <span>{resolvedSkill.path}</span>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-0 sm:px-7 sm:pb-7">
          <div className="mb-6 h-px bg-border/70" />
          <div className="mb-6 flex flex-wrap gap-2">
            {Object.entries(resolvedSkill.frontmatter)
              .filter(([key]) => key !== "name" && key !== "description")
              .map(([key, value]) => (
                <span
                  key={key}
                  className="rounded-full border border-border/70 bg-secondary/45 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {key}: {String(value)}
                </span>
              ))}
          </div>
          <MarkdownRenderer
            markdown={stripSkillFrontmatter(resolvedSkill.content)}
            className="[&>*:first-child]:mt-0"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function stripSkillFrontmatter(content: string) {
  if (!content.startsWith("---")) return content;
  const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  if (!match) return content;
  return content.slice(match[0].length);
}
