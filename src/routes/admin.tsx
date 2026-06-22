import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminPage from "@/pages/admin/AdminPage";
import { Admin2FAGate } from "@/pages/admin/Admin2FAGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — NutroPact" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminGate,
});

function AdminGate() {
  const { ready, user, isAdmin, logout } = useAuthStore();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
    );
  }
  if (!user) return <AdminLogin />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Access denied</h1>
          <p className="text-gray-500">You need an admin account to view this page.</p>
          <button
            type="button"
            onClick={logout}
            className="mt-5 rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
          >
            Login with admin account
          </button>
        </div>
      </div>
    );
  }
  return <Admin2FAGate><AdminPage /></Admin2FAGate>;
}

function AdminLogin() {
  const { refresh } = useAuthStore();
  const [email, setEmail] = useState("info@nutropact.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message || "Admin login failed");
      setLoading(false);
      return;
    }
    await refresh();
    const isAdmin = useAuthStore.getState().isAdmin;
    if (!isAdmin) {
      await supabase.auth.signOut();
      useAuthStore.setState({ user: null, token: null, isAdmin: false, ready: true });
      setError("This account is not an admin account.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black mb-2">ADMIN LOGIN</h1>
        <p className="text-gray-500 mb-8">Sign in with your NutroPact admin account.</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Admin email"
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-orange-500 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin password"
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-orange-500 focus:outline-none"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-orange-500 py-4 text-lg font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "Please wait..." : "Login to Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
