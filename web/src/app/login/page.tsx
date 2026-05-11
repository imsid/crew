"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { auth, isReady, login } = useAuth();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isReady && auth) {
      router.replace("/app");
    }
  }, [auth, isReady, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await login(handle);
      router.replace("/app");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to log in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="surface-panel w-full max-w-[920px] overflow-hidden">
        <div className="grid min-h-[640px] md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-between bg-[linear-gradient(140deg,rgba(79,60,40,0.95),rgba(110,86,61,0.88))] p-8 text-stone-50 sm:p-10">
            <div className="space-y-5">
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/12 backdrop-blur">
                <SparklesIcon className="size-5" />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-200/80">
                  Crew
                </p>
                <h1 className="max-w-md text-4xl font-semibold leading-tight sm:text-5xl">
                  Collaborative analysis, not another dashboard.
                </h1>
                <p className="max-w-md text-sm leading-6 text-stone-200/80 sm:text-base">
                  Ask grounded business questions, inspect metrics and experiments directly,
                  and keep the useful outputs as shared artifact documents.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Agent Mode for conversational analysis",
                "Command Mode for read-only exploration",
                "Shared Markdown and HTML artifacts for the team",
                "Mobile-ready workspace with inline commands",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/12 bg-white/8 p-4 text-sm leading-6 backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center bg-white/70 p-6 sm:p-10">
            <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-6">
              <div className="space-y-2">
                
                <h2 className="text-3xl font-semibold">Enter Crew</h2>
                <p className="text-sm text-muted-foreground">
                  Sign in with your handle.
                </p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium" htmlFor="handle">
                </label>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  placeholder="@alice"
                  autoComplete="username"
                />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>

              <Button type="submit" className="w-full" disabled={!handle.trim() || isSubmitting}>
                {isSubmitting ? "Connecting…" : "Continue to workspace"}
                <ArrowRightIcon className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
