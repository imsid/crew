"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AuiIf, ComposerPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { ArrowUpIcon, CornerDownLeftIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SLASH_COMMANDS } from "@/lib/commands";
import type { CommandOperation, CommandSurface } from "@/lib/types";
import { cn } from "@/lib/utils";

const SlashCommandPalette = dynamic(
  () => import("@/components/chat/slash-command-palette").then((mod) => mod.SlashCommandPalette),
);

export function MessageComposer() {
  const aui = useAui();
  const text = useAuiState((state) => state.composer.text);
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [workflowInputText, setWorkflowInputText] = useState("");
  const [workflowInputError, setWorkflowInputError] = useState<string | null>(null);

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
    setWorkflowInputError(null);
    setWorkflowInputText("");
    if (!template.endsWith(" ")) {
      queueMicrotask(() => {
        aui.composer().send();
      });
    }
  };

  const commandDraft = useMemo(() => getCommandDraft(text), [text]);
  const showCommandBuilder = Boolean(commandDraft && commandDraft.operation !== "list");

  const updateCommandTail = (tail: string) => {
    if (!commandDraft) return;
    aui.composer().setText(`${commandDraft.prefix}${tail}`);
  };

  const sendCommandBuilder = () => {
    if (!commandDraft) return;
    setWorkflowInputError(null);

    if (commandDraft.surface === "workflows" && commandDraft.operation === "run") {
      const workflowId = commandDraft.args[0] ?? "";
      const dedupKey = commandDraft.args[1] ?? "";
      if (!workflowId.trim()) return;

      let parsed: unknown = {};
      if (workflowInputText.trim()) {
        try {
          parsed = JSON.parse(workflowInputText);
        } catch {
          setWorkflowInputError("workflow_input must be valid JSON.");
          return;
        }
      }
      if (!isJsonObject(parsed)) {
        setWorkflowInputError("workflow_input must be a JSON object.");
        return;
      }

      const inputSuffix =
        Object.keys(parsed).length > 0 ? ` --input ${JSON.stringify(parsed)}` : "";
      aui
        .composer()
        .setText(`${commandDraft.prefix}${workflowId.trim()}${dedupKey.trim() ? ` ${dedupKey.trim()}` : ""}${inputSuffix}`);
      queueMicrotask(() => {
        aui.composer().send();
      });
      return;
    }

    if (!isCommandDraftReady(commandDraft)) return;
    aui.composer().send();
  };

  return (
    <div className="relative isolate">
      <SlashCommandPalette
        query={showCommandBuilder ? "" : text}
        highlightedIndex={highlightedIndex}
        onSelect={() => setHighlightedIndex(0)}
        className="absolute bottom-[calc(100%+0.75rem)] left-0 right-0 z-50"
      />
      <ComposerPrimitive.Root className="rounded-[1.35rem] border border-border/80 bg-white/98 shadow-[0_10px_28px_rgba(36,29,20,0.06)] backdrop-blur-sm transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/20 focus-within:ring-offset-0">
        {showCommandBuilder && commandDraft ? (
          <CommandInputBuilder
            draft={commandDraft}
            workflowInputText={workflowInputText}
            workflowInputError={workflowInputError}
            onWorkflowInputChange={(value) => {
              setWorkflowInputText(value);
              if (workflowInputError) setWorkflowInputError(null);
            }}
            onUpdateTail={updateCommandTail}
            onSubmit={sendCommandBuilder}
          />
        ) : null}
        <ComposerPrimitive.Input
          rows={1}
          placeholder="Ask Crew or type / for commands"
          className={cn(
            "min-h-[52px] w-full resize-none bg-transparent px-4 pb-1 pt-3 text-[15px] leading-6 placeholder:text-muted-foreground/75 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            showCommandBuilder && "sr-only",
          )}
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
            {showCommandBuilder
              ? "Complete the command fields, then run."
              : isRunning
                ? "Streaming execution trace and final answer."
                : "Enter sends. Shift + Enter keeps drafting."}
          </div>
          <div className="ml-auto">
            <AuiIf condition={(state) => !state.thread.isRunning}>
              {showCommandBuilder ? (
                <Button
                  type="button"
                  size="icon"
                  className="size-9 shadow-sm"
                  onClick={sendCommandBuilder}
                >
                  <ArrowUpIcon className="size-4" />
                  <span className="sr-only">Run command</span>
                </Button>
              ) : (
                <ComposerPrimitive.Send asChild>
                  <Button size="icon" className="size-9 shadow-sm">
                    <ArrowUpIcon className="size-4" />
                    <span className="sr-only">Send message</span>
                  </Button>
                </ComposerPrimitive.Send>
              )}
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

type CommandDraft = {
  surface: CommandSurface;
  operation: CommandOperation;
  prefix: string;
  args: string[];
  tail: string;
};

function CommandInputBuilder({
  draft,
  workflowInputText,
  workflowInputError,
  onWorkflowInputChange,
  onUpdateTail,
  onSubmit,
}: Readonly<{
  draft: CommandDraft;
  workflowInputText: string;
  workflowInputError: string | null;
  onWorkflowInputChange: (value: string) => void;
  onUpdateTail: (tail: string) => void;
  onSubmit: () => void;
}>) {
  return (
    <div className="space-y-3 px-3.5 pb-3 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground">
          /{draft.surface === "workflows" ? "workflow" : draft.surface} {draft.operation}
        </span>
        <span className="text-xs text-muted-foreground">
          {getCommandBuilderHint(draft)}
        </span>
      </div>

      <div className="rounded-[1rem] border border-border/70 bg-secondary/25 p-3">
        <CommandFields
          draft={draft}
          workflowInputText={workflowInputText}
          workflowInputError={workflowInputError}
          onWorkflowInputChange={onWorkflowInputChange}
          onUpdateTail={onUpdateTail}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

function CommandFields({
  draft,
  workflowInputText,
  workflowInputError,
  onWorkflowInputChange,
  onUpdateTail,
  onSubmit,
}: Readonly<{
  draft: CommandDraft;
  workflowInputText: string;
  workflowInputError: string | null;
  onWorkflowInputChange: (value: string) => void;
  onUpdateTail: (tail: string) => void;
  onSubmit: () => void;
}>) {
  if (draft.surface === "workflows" && draft.operation === "run") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <CommandTextField
            label="workflow"
            required
            value={draft.args[0] ?? ""}
            placeholder="Workflow id"
            onChange={(value) => onUpdateTail(joinCommandArgs(value, draft.args[1]))}
            onSubmit={onSubmit}
          />
          <CommandTextField
            label="dedup key"
            value={draft.args[1] ?? ""}
            placeholder="optional"
            onChange={(value) => onUpdateTail(joinCommandArgs(draft.args[0], value))}
            onSubmit={onSubmit}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-muted-foreground">workflow_input</label>
            <span className="text-[11px] text-muted-foreground">JSON object</span>
          </div>
          <Textarea
            value={workflowInputText}
            onChange={(event) => onWorkflowInputChange(event.target.value)}
            placeholder="{}"
            className="mt-2 min-h-[124px] rounded-md bg-white/85 font-mono text-xs leading-relaxed shadow-none"
            spellCheck={false}
          />
          {workflowInputError ? (
            <p className="mt-2 text-xs text-destructive">{workflowInputError}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (draft.surface === "workflows" && draft.operation === "status") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <CommandTextField
          label="workflow"
          value={draft.args[0] ?? ""}
          placeholder="workflow id"
          onChange={(value) => onUpdateTail(joinCommandArgs(value, draft.args[1]))}
          onSubmit={onSubmit}
        />
        <CommandTextField
          label="run"
          value={draft.args[1] ?? ""}
          placeholder="run id"
          onChange={(value) => onUpdateTail(joinCommandArgs(draft.args[0], value))}
          onSubmit={onSubmit}
        />
      </div>
    );
  }

  const label = draft.operation === "search" ? "query" : getTargetLabel(draft);
  return (
    <CommandTextField
      label={label}
      value={draft.tail}
      placeholder={getTargetPlaceholder(draft)}
      onChange={onUpdateTail}
      onSubmit={onSubmit}
    />
  );
}

function CommandTextField({
  label,
  required = false,
  value,
  placeholder,
  onChange,
  onSubmit,
}: Readonly<{
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}>) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        className="mt-2 h-10 bg-white/85"
      />
    </div>
  );
}

function getCommandDraft(text: string): CommandDraft | null {
  if (!text.startsWith("/")) return null;
  const match = text.match(/^\/(\S+)(?:\s+(\S+))?(?:\s+([\s\S]*))?$/);
  if (!match) return null;

  const rawSurface = match[1];
  const operation = match[2] as CommandOperation | undefined;
  if (!operation) return null;

  const surface = normalizeCommandSurface(rawSurface);
  if (!surface) return null;

  const command = SLASH_COMMANDS.find(
    (item) => item.surface === surface && item.operation === operation,
  );
  if (!command) return null;

  const tail = match[3] ?? "";
  return {
    surface,
    operation,
    prefix: `/${rawSurface} ${operation} `,
    tail,
    args: tail.split(/\s+/).filter(Boolean),
  };
}

function normalizeCommandSurface(surface: string): CommandSurface | null {
  if (surface === "workflow") return "workflows";
  if (
    surface === "metrics" ||
    surface === "experiments" ||
    surface === "artifacts" ||
    surface === "skills" ||
    surface === "workflows"
  ) {
    return surface;
  }
  return null;
}

function isCommandDraftReady(draft: CommandDraft) {
  if (draft.operation === "list") return true;
  if (draft.surface === "workflows" && draft.operation === "status") {
    return Boolean(draft.args[0]?.trim() && draft.args[1]?.trim());
  }
  if (draft.surface === "workflows" && draft.operation === "run") {
    return Boolean(draft.args[0]?.trim());
  }
  return Boolean(draft.tail.trim());
}

function getCommandBuilderHint(draft: CommandDraft) {
  if (draft.surface === "workflows" && draft.operation === "run") {
    return "Start a workflow with structured input";
  }
  if (draft.surface === "workflows" && draft.operation === "status") {
    return "Inspect a workflow run";
  }
  if (draft.operation === "search") return "Search by name or keyword";
  return "Provide the required command target";
}

function getTargetLabel(draft: CommandDraft) {
  if (draft.surface === "metrics") return "metric";
  if (draft.surface === "experiments") return "experiment";
  if (draft.surface === "artifacts") return "artifact";
  return "target";
}

function getTargetPlaceholder(draft: CommandDraft) {
  if (draft.operation === "search") return "Search term";
  if (draft.surface === "metrics") return "conversions_total";
  if (draft.surface === "experiments") return "signup_checkout";
  if (draft.surface === "artifacts") return "artifact id";
  return "Identifier";
}

function joinCommandArgs(...args: Array<string | undefined>) {
  return args.map((arg) => arg?.trim() ?? "").filter(Boolean).join(" ");
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
