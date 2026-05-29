// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import ShippingPage from "@/pages/ShippingPage";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping & Delivery — NutroPact" },
      { name: "description", content: "Fast, tracked delivery across India on every NutroPact order. Free shipping above ₹999, typical 2–5 day delivery, and full tracking." },
      { property: "og:title", content: "Shipping & Delivery — NutroPact" },
      { property: "og:description", content: "Fast, tracked delivery across India. Free shipping above ₹999." },
      { property: "og:url", content: "/shipping" },
    ],
    links: [{ rel: "canonical", href: "/shipping" }],
  }),
  component: ShippingPage,
});
