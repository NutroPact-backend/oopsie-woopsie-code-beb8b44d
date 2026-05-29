// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import TrackOrderPage from "@/pages/TrackOrderPage";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Track Your Order — NutroPact" },
      { name: "description", content: "Track the status of your NutroPact order in real time — enter your order ID or email to see delivery progress, courier, and ETA." },
      { property: "og:title", content: "Track Your Order — NutroPact" },
      { property: "og:description", content: "Real-time tracking for your NutroPact supplements order across India — courier, status, and delivery ETA." },
      { property: "og:url", content: "/track-order" },
    ],
    links: [{ rel: "canonical", href: "/track-order" }],
  }),
  component: TrackOrderPage,
});
