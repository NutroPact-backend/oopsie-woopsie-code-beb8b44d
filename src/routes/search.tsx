import { createFileRoute } from "@tanstack/react-router";
import SearchPage from "@/pages/SearchPage";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Products — NutroPact" },
      { name: "description", content: "Search the NutroPact catalog — find whey protein, creatine, pre-workout, mass gainer, BCAA, vitamins, and more by name or category." },
      { property: "og:title", content: "Search Products — NutroPact" },
      { property: "og:description", content: "Find NutroPact supplements fast — search protein, creatine, pre-workout, BCAA and more by name or category." },
      { property: "og:url", content: "/search" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: SearchPage,
});
