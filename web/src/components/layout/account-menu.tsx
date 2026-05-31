"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function AccountMenu({
  className,
  collapsed = false,
}: Readonly<{
  className?: string;
  collapsed?: boolean;
}>) {
  const router = useRouter();
  const { auth, logout } = useAuth();

  if (collapsed) {
    return (
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Log out"
        onClick={() => {
          logout();
          router.replace("/login");
        }}
      >
        <LogOutIcon className="size-3.5" />
      </button>
    );
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="truncate text-xs text-muted-foreground">
        @{auth?.user.username}
      </span>
      <button
        type="button"
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Log out"
        onClick={() => {
          logout();
          router.replace("/login");
        }}
      >
        <LogOutIcon className="size-3.5" />
      </button>
    </div>
  );
}
