// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import ProductsPage from "@/pages/ProductsPage";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "All Products — NutroPact" },
      { name: "description", content: "Browse the full NutroPact catalog — whey protein, creatine, pre-workout, mass gainer, BCAA, and vitamins. Lab tested with free delivery above ₹999." },
      { property: "og:title", content: "All Products — NutroPact" },
      { property: "og:description", content: "Protein, creatine, pre-workout, mass gainer, BCAA and vitamins — lab tested premium supplements." },
      { property: "og:url", content: "/products" },
    ],
    links: [{ rel: "canonical", href: "/products" }],
  }),
  component: ProductsPage,
});
