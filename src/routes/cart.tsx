import { createFileRoute } from "@tanstack/react-router";
import CartPage from "@/pages/CartPage";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Shopping Cart — NutroPact" },
      { name: "description", content: "Review the NutroPact supplements in your cart, update quantities, apply coupons, and head to secure checkout for fast delivery across India." },
      { property: "og:title", content: "Your Shopping Cart — NutroPact" },
      { property: "og:description", content: "Review NutroPact supplements in your cart and proceed to secure checkout." },
      { property: "og:url", content: "/cart" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: CartPage,
});
