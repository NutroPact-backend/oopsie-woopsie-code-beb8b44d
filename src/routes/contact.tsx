// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import ContactPage from "@/pages/ContactPage";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — NutroPact" },
      { name: "description", content: "Get in touch with the NutroPact support team for orders, product questions, returns, or bulk enquiries — we reply within one business day." },
      { property: "og:title", content: "Contact Us — NutroPact" },
      { property: "og:description", content: "Talk to NutroPact support about orders, products, returns, or bulk enquiries." },
      { property: "og:url", content: "https://www.nutropact.com/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});
