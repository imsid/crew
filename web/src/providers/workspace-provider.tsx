"use client";

import { getCurrentWorkspace, listWorkspaces } from "@/lib/api";
import type { WorkspaceRecord } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WorkspaceContextValue = {
  workspaceId: string;
  workspaces: WorkspaceRecord[];
  isReady: boolean;
  setWorkspaceId: (workspaceId: string) => void;
};

const STORAGE_KEY = "crew-beta-workspace";
const FALLBACK_WORKSPACE_ID = "marketing_db";
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { auth } = useAuth();
  const [workspaceId, setWorkspaceIdState] = useState(FALLBACK_WORKSPACE_ID);
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setWorkspaces([]);
      setIsReady(true);
      return;
    }

    setIsReady(false);
    Promise.all([
      listWorkspaces(auth.token),
      getCurrentWorkspace(auth.token).catch(() => ({ workspace_id: FALLBACK_WORKSPACE_ID })),
    ])
      .then(([{ workspaces: nextWorkspaces }, { workspace_id: serverDefault }]) => {
        setWorkspaces(nextWorkspaces);
        const saved = window.localStorage.getItem(STORAGE_KEY) || "";
        const candidate =
          nextWorkspaces.find((item) => item.workspace_id === saved) ??
          nextWorkspaces.find((item) => item.workspace_id === serverDefault) ??
          nextWorkspaces[0];
        if (candidate) {
          setWorkspaceIdState(candidate.workspace_id);
          window.localStorage.setItem(STORAGE_KEY, candidate.workspace_id);
        }
      })
      .finally(() => setIsReady(true));
  }, [auth]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaceId,
      workspaces,
      isReady,
      setWorkspaceId: (nextWorkspaceId) => {
        setWorkspaceIdState(nextWorkspaceId);
        window.localStorage.setItem(STORAGE_KEY, nextWorkspaceId);
      },
    }),
    [workspaceId, workspaces, isReady],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
