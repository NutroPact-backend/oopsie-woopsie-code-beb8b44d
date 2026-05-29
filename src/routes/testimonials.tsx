import { createFileRoute } from "@tanstack/react-router";
import TestimonialsPage from "@/pages/TestimonialsPage";

export const Route = createFileRoute("/testimonials")({
  head: () => ({
    meta: [
      { title: "Customer Testimonials — NutroPact" },
      { name: "description", content: "Real reviews from NutroPact customers across India — see how our lab-tested protein, creatine, and supplements deliver results." },
      { property: "og:title", content: "Customer Testimonials — NutroPact" },
      { property: "og:description", content: "Real reviews from NutroPact customers across India." },
      { property: "og:url", content: "/testimonials" },
    ],
    links: [{ rel: "canonical", href: "/testimonials" }],
  }),
  component: TestimonialsPage,
});
