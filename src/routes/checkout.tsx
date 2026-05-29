// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import CheckoutPage from "@/pages/CheckoutPage";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Secure Checkout — NutroPact" },
      { name: "description", content: "Complete your NutroPact order securely — enter shipping details, choose a payment method, and place your order with tracked delivery across India." },
      { property: "og:title", content: "Secure Checkout — NutroPact" },
      { property: "og:description", content: "Complete your NutroPact order with secure payment and tracked delivery across India." },
      { property: "og:url", content: "/checkout" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckoutPage,
});
