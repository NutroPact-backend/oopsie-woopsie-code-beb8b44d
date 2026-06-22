import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing you in…" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { next?: string };
  const rawNext = search.next ?? "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\") ? rawNext : "/account";
  const { refresh } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Supabase client (detectSessionInUrl: true) auto-handles ?code=... and hash tokens.
      // Wait briefly for the session to be persisted, then continue.
      for (let i = 0; i < 15; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) break;
        await new Promise((r) => setTimeout(r, 150));
      }
      if (cancelled) return;
      await refresh();
      navigate({ to: next, replace: true });
    })();
    return () => { cancelled = true; };
  }, [navigate, next, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Signing you in…
    </div>
  );
}
