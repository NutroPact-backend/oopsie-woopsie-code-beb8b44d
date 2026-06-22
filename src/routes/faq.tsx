import { createFileRoute } from "@tanstack/react-router";
import FAQPage from "@/pages/FAQPage";

const FAQS = [
  { q: "Are NutroPact supplements lab tested?", a: "Yes. Every batch of NutroPact protein, creatine, pre-workout, and other supplements is third-party lab tested for purity, potency, and label accuracy before it ships." },
  { q: "How fast is delivery in India?", a: "Most NutroPact orders are delivered within 2–5 business days across India with full tracking. Free shipping is included on orders above ₹999." },
  { q: "What is your return policy?", a: "We offer a hassle-free 7-day return window on eligible NutroPact products. Reach out to info@nutropact.com and our team will guide you through the return." },
  { q: "Are the products 100% authentic?", a: "Yes — NutroPact products are manufactured and shipped directly. We do not sell through unauthorised resellers, so every order is guaranteed authentic." },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — NutroPact" },
      { name: "description", content: "Answers to common questions about NutroPact supplements, shipping, returns, payments, and authenticity for customers across India." },
      { property: "og:title", content: "FAQ — NutroPact" },
      { property: "og:description", content: "Answers to common questions about NutroPact supplements, shipping, and returns." },
      { property: "og:url", content: "https://www.nutropact.com/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map(f => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    }],
  }),
  component: FAQPage,
});
