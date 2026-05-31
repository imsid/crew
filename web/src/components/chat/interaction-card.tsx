"use client";

import { useState } from "react";
import {
  CheckCircle2Icon,
  MessageCircleQuestionIcon,
  ShieldCheckIcon,
  XCircleIcon,
  SkipForwardIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { InteractionState } from "@/lib/types";

export function InteractionCard({
  interaction,
  onRespond,
}: Readonly<{
  interaction: InteractionState;
  onRespond: (interactionId: string, response: unknown) => void;
}>) {
  if (interaction.status === "responded") {
    return <RespondedView interaction={interaction} />;
  }
  return <PendingView interaction={interaction} onRespond={onRespond} />;
}

function PendingView({
  interaction,
  onRespond,
}: Readonly<{
  interaction: InteractionState;
  onRespond: (interactionId: string, response: unknown) => void;
}>) {
  return (
    <div className="rounded-[1.15rem] border border-primary/20 bg-primary/[0.03] px-5 py-4">
      <div className="flex items-start gap-3">
        <MessageCircleQuestionIcon className="mt-0.5 size-[1.1rem] shrink-0 text-primary/70" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-medium leading-6 text-foreground">{interaction.prompt}</p>
          {interaction.interaction_type === "approval" && (
            <ApprovalInput
              interactionId={interaction.interaction_id}
              onRespond={onRespond}
            />
          )}
          {interaction.interaction_type === "info" && (
            <InfoInput
              interactionId={interaction.interaction_id}
              onRespond={onRespond}
            />
          )}
          {interaction.interaction_type === "choice" && (
            <ChoiceInput
              interactionId={interaction.interaction_id}
              options={interaction.schema.options ?? []}
              onRespond={onRespond}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalInput({
  interactionId,
  onRespond,
}: Readonly<{
  interactionId: string;
  onRespond: (interactionId: string, response: unknown) => void;
}>) {
  const [submitting, setSubmitting] = useState(false);
  const handle = (value: string) => {
    setSubmitting(true);
    onRespond(interactionId, value);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        className="min-h-8 rounded-full px-4 text-xs"
        disabled={submitting}
        onClick={() => handle("approve")}
      >
        <ShieldCheckIcon className="size-3.5" />
        Approve
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="min-h-8 rounded-full px-4 text-xs"
        disabled={submitting}
        onClick={() => handle("deny")}
      >
        <XCircleIcon className="size-3.5" />
        Deny
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="min-h-8 rounded-full px-4 text-xs text-muted-foreground"
        disabled={submitting}
        onClick={() => handle("skip")}
      >
        <SkipForwardIcon className="size-3.5" />
        Skip
      </Button>
    </div>
  );
}

function InfoInput({
  interactionId,
  onRespond,
}: Readonly<{
  interactionId: string;
  onRespond: (interactionId: string, response: unknown) => void;
}>) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = () => {
    if (!value.trim()) return;
    setSubmitting(true);
    onRespond(interactionId, value.trim());
  };
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your response..."
        className="min-h-[4.5rem] resize-none rounded-xl text-sm"
        disabled={submitting}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Cmd+Enter to submit</span>
        <Button
          size="sm"
          className="min-h-8 rounded-full px-4 text-xs"
          disabled={!value.trim() || submitting}
          onClick={submit}
        >
          Submit
        </Button>
      </div>
    </div>
  );
}

function ChoiceInput({
  interactionId,
  options,
  onRespond,
}: Readonly<{
  interactionId: string;
  options: string[];
  onRespond: (interactionId: string, response: unknown) => void;
}>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const toggle = (option: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };
  const submit = () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    onRespond(interactionId, Array.from(selected));
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={submitting}
            onClick={() => toggle(option)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              selected.has(option)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/70 bg-white/70 text-foreground/80 hover:border-border hover:bg-white"
            }`}
          >
            {selected.has(option) && (
              <CheckCircle2Icon className="-ml-0.5 mr-1.5 inline size-3.5" />
            )}
            {option}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        className="min-h-8 rounded-full px-4 text-xs"
        disabled={selected.size === 0 || submitting}
        onClick={submit}
      >
        Submit ({selected.size} selected)
      </Button>
    </div>
  );
}

function RespondedView({ interaction }: Readonly<{ interaction: InteractionState }>) {
  return (
    <div className="rounded-[1.15rem] border border-border/50 bg-muted/30 px-5 py-3">
      <div className="flex items-start gap-3">
        <CheckCircle2Icon className="mt-0.5 size-[1.1rem] shrink-0 text-muted-foreground/70" />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 text-muted-foreground">{interaction.prompt}</p>
          <div className="mt-1.5">
            {interaction.interaction_type === "approval" && (
              <Badge variant="secondary" className="text-xs">
                {interaction.response === "approve"
                  ? "Approved"
                  : interaction.response === "deny"
                    ? "Denied"
                    : "Skipped"}
              </Badge>
            )}
            {interaction.interaction_type === "info" && (
              <p className="border-l-2 border-border/60 pl-3 text-sm text-foreground/70">
                {String(interaction.response ?? "")}
              </p>
            )}
            {interaction.interaction_type === "choice" && (
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(interaction.response) ? interaction.response : []).map(
                  (item: string) => (
                    <Badge key={item} variant="secondary" className="text-xs">
                      {item}
                    </Badge>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
