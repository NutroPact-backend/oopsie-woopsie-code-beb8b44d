import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/pages/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In or Create Account — NutroPact" },
      { name: "description", content: "Sign in to your NutroPact account to view orders, track shipments, manage addresses, and check out faster on your next supplement order." },
      { property: "og:title", content: "Sign In or Create Account — NutroPact" },
      { property: "og:description", content: "Access your NutroPact account to track orders, save addresses, and check out faster." },
      { property: "og:url", content: "/login" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: LoginPage,
});
