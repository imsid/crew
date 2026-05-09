"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { AccountMenu } from "@/components/layout/account-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SessionList } from "@/components/layout/session-list";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden shadow-sm">
          <MenuIcon className="size-4" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto bg-background/98">
        <SheetHeader className="pr-10">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle>Crew</SheetTitle>
            <AccountMenu />
          </div>
          <SheetDescription>
            Collaborative workspace for analysis, commands, and shared artifacts.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-5">
          <SidebarNav onNavigate={() => setOpen(false)} />
          <Separator />
          <SessionList onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
