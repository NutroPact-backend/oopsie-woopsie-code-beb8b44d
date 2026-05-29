// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutroPact — Premium Nutrition & Supplements" },
      { name: "description", content: "Shop premium nutrition, protein, creatine, pre-workout, and wellness supplements crafted for results. Lab-tested, authentic, free delivery above ₹999." },
      { property: "og:title", content: "NutroPact — Premium Nutrition & Supplements" },
      { property: "og:description", content: "Lab-tested protein, creatine, pre-workout, and mass gainers. Premium supplements for serious athletes across India." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    // Organization, WebSite, and Store JSON-LD live in __root.tsx — no duplicates here.
  }),
  component: Home,
});

