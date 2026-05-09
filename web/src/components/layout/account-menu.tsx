"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function AccountMenu({
  className,
}: Readonly<{
  className?: string;
}>) {
  const router = useRouter();
  const { auth, logout } = useAuth();

  return (
    <details className={cn("relative", className)}>
      <summary className="flex min-h-10 list-none cursor-pointer items-center rounded-full border border-border/80 bg-white/78 px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-white [&::-webkit-details-marker]:hidden">
        @{auth?.user.username}
      </summary>
      <div className="absolute left-0 top-full z-30 mt-2 min-w-[152px] rounded-[1rem] border border-border/80 bg-white/98 p-1.5 shadow-[0_18px_40px_rgba(36,29,20,0.12)]">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-[0.8rem] px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          <LogOutIcon className="size-4" />
          Log out
        </button>
      </div>
    </details>
  );
}
