// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import TermsPage from "@/pages/TermsPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — NutroPact" },
      { name: "description", content: "Read the terms and conditions for shopping NutroPact supplements, including orders, payments, shipping, and account use." },
      { property: "og:title", content: "Terms of Service — NutroPact" },
      { property: "og:description", content: "Terms and conditions for shopping NutroPact supplements online." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});
