"use client";

import { create } from "zustand";
import type { ThreadMessageLike } from "@assistant-ui/react";

type SubmitMeta = {
  kind: "agent" | "command";
  text: string;
};

type CrewThreadState = {
  messages: ThreadMessageLike[];
  isRunning: boolean;
  hydrated: boolean;
  statusLabel: string | null;
  lastSubmitted: SubmitMeta | null;
  abortController: AbortController | null;
};

type ChatStore = {
  threads: Record<string, CrewThreadState>;
  ensureThread: (threadKey: string) => void;
  hydrateThread: (threadKey: string, messages: readonly ThreadMessageLike[]) => void;
  replaceMessages: (threadKey: string, messages: readonly ThreadMessageLike[]) => void;
  appendMessage: (threadKey: string, message: ThreadMessageLike) => void;
  updateMessage: (
    threadKey: string,
    messageId: string,
    updater: (message: ThreadMessageLike) => ThreadMessageLike,
  ) => void;
  setRunning: (threadKey: string, isRunning: boolean) => void;
  setStatusLabel: (threadKey: string, statusLabel: string | null) => void;
  setAbortController: (
    threadKey: string,
    abortController: AbortController | null,
  ) => void;
  setLastSubmitted: (threadKey: string, value: SubmitMeta | null) => void;
  moveThread: (fromKey: string, toKey: string) => void;
  resetThread: (threadKey: string) => void;
};

const createThreadState = (): CrewThreadState => ({
  messages: [],
  isRunning: false,
  hydrated: false,
  statusLabel: null,
  lastSubmitted: null,
  abortController: null,
});

export const useChatStore = create<ChatStore>((set, get) => ({
  threads: {},
  ensureThread: (threadKey) =>
    set((state) => {
      if (state.threads[threadKey]) return state;
      return {
        threads: {
          ...state.threads,
          [threadKey]: createThreadState(),
        },
      };
    }),
  hydrateThread: (threadKey, messages) =>
    set((state) => {
      const existing = state.threads[threadKey] ?? createThreadState();
      if (existing.messages.length > 0) {
        return {
          threads: {
            ...state.threads,
            [threadKey]: {
              ...existing,
              hydrated: true,
            },
          },
        };
      }

      return {
        threads: {
          ...state.threads,
          [threadKey]: {
            ...existing,
            messages: [...messages],
            hydrated: true,
          },
        },
      };
    }),
  replaceMessages: (threadKey, messages) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadKey]: {
          ...(state.threads[threadKey] ?? createThreadState()),
          messages: [...messages],
        },
      },
    })),
  appendMessage: (threadKey, message) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadKey]: {
          ...(state.threads[threadKey] ?? createThreadState()),
          messages: [...(state.threads[threadKey]?.messages ?? []), message],
        },
      },
    })),
  updateMessage: (threadKey, messageId, updater) =>
    set((state) => {
      const current = state.threads[threadKey] ?? createThreadState();
      return {
        threads: {
          ...state.threads,
          [threadKey]: {
            ...current,
            messages: current.messages.map((message) =>
              message.id === messageId ? updater(message) : message,
            ),
          },
        },
      };
    }),
  setRunning: (threadKey, isRunning) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadKey]: {
          ...(state.threads[threadKey] ?? createThreadState()),
          isRunning,
        },
      },
    })),
  setStatusLabel: (threadKey, statusLabel) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadKey]: {
          ...(state.threads[threadKey] ?? createThreadState()),
          statusLabel,
        },
      },
    })),
  setAbortController: (threadKey, abortController) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadKey]: {
          ...(state.threads[threadKey] ?? createThreadState()),
          abortController,
        },
      },
    })),
  setLastSubmitted: (threadKey, value) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadKey]: {
          ...(state.threads[threadKey] ?? createThreadState()),
          lastSubmitted: value,
        },
      },
    })),
  moveThread: (fromKey, toKey) =>
    set((state) => {
      const fromThread = state.threads[fromKey];
      if (!fromThread) return state;

      return {
        threads: {
          ...state.threads,
          [toKey]: {
            ...fromThread,
          },
          [fromKey]: createThreadState(),
        },
      };
    }),
  resetThread: (threadKey) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadKey]: createThreadState(),
      },
    })),
}));

export function getThreadState(threadKey: string) {
  return getOrCreateThread(threadKey);
}

function getOrCreateThread(threadKey: string) {
  const store = useChatStore.getState();
  if (!store.threads[threadKey]) {
    store.ensureThread(threadKey);
  }
  return useChatStore.getState().threads[threadKey] ?? createThreadState();
}

export const DRAFT_THREAD_KEY = "draft";
