"use client";

import { useEffect, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const fallbackSteps = [
  "Checking metrics",
  "Reviewing experiments",
  "Searching artifacts",
  "Drafting answer",
];

export function StreamingStatus({
  isRunning,
  label,
  className,
}: Readonly<{
  isRunning: boolean;
  label?: string | null;
  className?: string;
}>) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isRunning || label) return;
    const timer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % fallbackSteps.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isRunning, label]);

  useEffect(() => {
    if (!isRunning) {
      setStepIndex(0);
    }
  }, [isRunning]);

  if (!isRunning) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-border/80 bg-white/90 px-4 py-2 text-sm text-muted-foreground shadow-sm",
        className,
      )}
    >
      <LoaderCircleIcon className="size-4 animate-spin" />
      <span>{label || fallbackSteps[stepIndex]}</span>
      <Badge variant="secondary" className="ml-auto">
        streaming
      </Badge>
    </div>
  );
}
