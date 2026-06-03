// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/answers")({
  loader: async () => {
    const { data } = await supabase
      .from("faqs")
      .select("question,answer,category,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(200);
    return { faqs: data || [] };
  },
  head: ({ loaderData }) => {
    const faqs = loaderData?.faqs || [];
    const title = "Answers — Nutrition, Protein & Supplement Questions | NutroPact";
    const description =
      "Direct, expert answers to the most-asked questions about whey protein, creatine, pre-workout, mass gainers, dosage, timing, and safety — built for AI search and voice assistants.";
    const url = "/answers";
    const scripts: any[] = [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: "en-IN",
          mainEntity: faqs.map((f: any) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
          speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", ".answer"] },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "/" },
            { "@type": "ListItem", position: 2, name: "Answers", item: url },
          ],
        }),
      },
    ];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
  component: AnswersPage,
});

function AnswersPage() {
  const { faqs } = Route.useLoaderData();
  const groups = faqs.reduce((acc: Record<string, any[]>, f: any) => {
    const k = f.category || "General";
    (acc[k] = acc[k] || []).push(f);
    return acc;
  }, {});
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Answers</h1>
        <p className="mt-3 text-gray-500">
          Direct answers to the questions athletes ask about protein, creatine, pre-workout,
          dosage, timing and safety — optimized for AI assistants like ChatGPT, Perplexity,
          Gemini and Google AI Overviews.
        </p>
      </header>
      {Object.entries(groups).map(([cat, items]: any) => (
        <section key={cat} className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">{cat}</h2>
          <div className="space-y-6">
            {items.map((f: any, i: number) => (
              <article key={i} className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-lg font-semibold text-foreground">{f.question}</h3>
                <p className="answer mt-2 text-gray-600">{f.answer}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}