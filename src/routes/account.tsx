import { createFileRoute } from "@tanstack/react-router";
import AccountPage from "@/pages/AccountPage";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — NutroPact" },
      { name: "description", content: "Manage your NutroPact account — view past orders, track current shipments, update saved addresses, and edit your profile in one place." },
      { property: "og:title", content: "My Account — NutroPact" },
      { property: "og:description", content: "Manage NutroPact orders, addresses, and your profile in one place." },
      { property: "og:url", content: "/account" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});
