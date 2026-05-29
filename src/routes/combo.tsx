import { createFileRoute } from "@tanstack/react-router";
import ComboPage from "@/pages/ComboPage";

export const Route = createFileRoute("/combo")({
  head: () => ({
    meta: [
      { title: "Build Your Combo — Extra Discount | NutroPact" },
      { name: "description", content: "Pick any 2 or more NutroPact products and unlock extra combo discount automatically. No codes needed — save more when you stack." },
      { property: "og:title", content: "Build Your Combo — Extra Discount | NutroPact" },
      { property: "og:description", content: "Combo builder with automatic extra discount on multiple products." },
      { property: "og:url", content: "/combo" },
    ],
    links: [{ rel: "canonical", href: "/combo" }],
  }),
  component: ComboPage,
});
