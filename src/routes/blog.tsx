import { createFileRoute } from "@tanstack/react-router";
import BlogPage from "@/pages/BlogPage";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — NutroPact" },
      { name: "description", content: "Expert nutrition, training, supplement science, and wellness insights from the NutroPact team — practical guides for serious athletes in India." },
      { property: "og:title", content: "Blog — NutroPact" },
      { property: "og:description", content: "Nutrition, training, and supplement science from the NutroPact team." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogPage,
});
