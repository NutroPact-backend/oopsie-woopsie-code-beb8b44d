// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import PrivacyPage from "@/pages/PrivacyPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — NutroPact" },
      { name: "description", content: "How NutroPact collects, uses, and safeguards your personal information when you shop premium supplements with us in India." },
      { property: "og:title", content: "Privacy Policy — NutroPact" },
      { property: "og:description", content: "How NutroPact collects, uses, and safeguards your personal information." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});
