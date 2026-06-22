import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "@/pages/AboutPage";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story — NutroPact" },
      { name: "description", content: "Learn about NutroPact's mission to deliver lab-tested, authentic premium nutrition and supplements to athletes across India." },
      { property: "og:title", content: "Our Story — NutroPact" },
      { property: "og:description", content: "How NutroPact is building India's most trusted premium supplements brand." },
      { property: "og:url", content: "https://www.nutropact.com/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});
