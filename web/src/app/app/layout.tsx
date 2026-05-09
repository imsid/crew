import { AppShell } from "@/components/layout/app-shell";
import { RequireAuth } from "@/providers/auth-provider";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
