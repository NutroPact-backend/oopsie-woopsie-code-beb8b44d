import { createFileRoute } from "@tanstack/react-router";
import RefundPage from "@/pages/RefundPage";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund & Return Policy — NutroPact" },
      { name: "description", content: "Easy 7-day returns and refunds on NutroPact orders. Learn how to request a return, eligibility, and refund timelines." },
      { property: "og:title", content: "Refund & Return Policy — NutroPact" },
      { property: "og:description", content: "Easy 7-day returns and refunds on NutroPact orders across India." },
      { property: "og:url", content: "/refund" },
    ],
    links: [{ rel: "canonical", href: "/refund" }],
  }),
  component: RefundPage,
});
