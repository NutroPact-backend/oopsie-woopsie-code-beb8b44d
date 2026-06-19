// @ts-nocheck
import { createFileRoute, Link, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User2, MessageSquare } from 'lucide-react';

interface Msg { role: 'bot' | 'user'; text: string; cta?: { label: string; href: string }[]; }

const INTENTS: Array<{ key: string; label: string; reply: (order: string) => Msg }> = [
  {
    key: 'cancel',
    label: 'Cancel my order',
    reply: (order) => ({
      role: 'bot',
      text: order
        ? `To cancel order ${order}, our team needs to verify shipment status. Most orders can be cancelled within 12 hours of placement if not yet shipped. We'll WhatsApp you a confirmation within 30 minutes.`
        : `Please share your order number (e.g. NP-12345). If your order has not been shipped yet, we cancel and refund immediately.`,
      cta: [
        { label: 'WhatsApp us', href: 'https://wa.me/918955590350?text=I want to cancel my order' },
        { label: 'Email support', href: 'mailto:info@nutropact.com?subject=Cancel order' },
      ],
    }),
  },
  {
    key: 'return',
    label: 'Return or refund',
    reply: () => ({
      role: 'bot',
      text: `Returns are accepted within 7 days of delivery for unopened, sealed products. Refunds go to your NutroPay within 2 business days, or to your original payment method within 5–7 business days.`,
      cta: [{ label: 'WhatsApp us', href: 'https://wa.me/918955590350?text=I want to return my order' }],
    }),
  },
  {
    key: 'track',
    label: 'Track my order',
    reply: () => ({
      role: 'bot',
      text: `You can track any order from the Track Order page with your order number and registered phone/email.`,
      cta: [{ label: 'Open tracking', href: '/track-order' }],
    }),
  },
  {
    key: 'delivery',
    label: 'Delivery time',
    reply: () => ({
      role: 'bot',
      text: `Metro cities: 1–2 business days. Tier-2: 2–4 days. Remote pincodes: 4–7 days. Free delivery above ₹999.`,
    }),
  },
  {
    key: 'human',
    label: 'Talk to a human',
    reply: () => ({
      role: 'bot',
      text: `Our team is online 10 AM – 8 PM (Mon–Sat). Tap below to chat on WhatsApp — fastest response.`,
      cta: [
        { label: 'WhatsApp', href: 'https://wa.me/918955590350' },
        { label: 'Call us', href: 'tel:+918955590350' },
      ],
    }),
  },
];

function Support() {
  const search = (useSearch({ from: '/support' }) as any) || {};
  const orderParam = String(search.order || '');
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'bot',
      text: `Hi! I'm NutroPact's support assistant. ${orderParam ? `I can see you're asking about order ${orderParam}. ` : ''}How can I help today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const trigger = (intentKey: string) => {
    const intent = INTENTS.find(i => i.key === intentKey);
    if (!intent) return;
    setMessages(prev => [...prev, { role: 'user', text: intent.label }, intent.reply(orderParam)]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    const lower = q.toLowerCase();
    let matched = INTENTS.find(i => lower.includes(i.key));
    if (!matched) {
      if (/refund|return/.test(lower)) matched = INTENTS.find(i => i.key === 'return');
      else if (/cancel/.test(lower)) matched = INTENTS.find(i => i.key === 'cancel');
      else if (/track|where|status/.test(lower)) matched = INTENTS.find(i => i.key === 'track');
      else if (/delivery|shipping|when/.test(lower)) matched = INTENTS.find(i => i.key === 'delivery');
    }
    setTimeout(() => {
      setMessages(prev => [...prev, matched ? matched!.reply(orderParam) : {
        role: 'bot',
        text: `I'll connect you with a human teammate — please tap WhatsApp below for the fastest reply.`,
        cta: [{ label: 'WhatsApp us', href: 'https://wa.me/918955590350' }],
      }]);
    }, 250);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] max-w-2xl flex-col px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
          <MessageSquare size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">NutroPact Support</h1>
          <p className="text-xs text-muted-foreground">We typically reply in under 30 minutes</p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-card/50 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
              {m.role === 'user' ? <User2 size={14} /> : <Bot size={14} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
              {m.cta && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.cta.map((c, j) => (
                    c.href.startsWith('/') ? (
                      <Link key={j} to={c.href as any} className="rounded-md bg-background px-2.5 py-1 text-xs font-medium text-foreground border border-border hover:bg-accent">
                        {c.label}
                      </Link>
                    ) : (
                      <a key={j} href={c.href} target="_blank" rel="noreferrer" className="rounded-md bg-background px-2.5 py-1 text-xs font-medium text-foreground border border-border hover:bg-accent">
                        {c.label}
                      </a>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {INTENTS.map(i => (
          <button
            key={i.key}
            onClick={() => trigger(i.key)}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-accent"
          >
            {i.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your question…"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button type="submit" className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90" aria-label="Send">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export const Route = createFileRoute('/support')({
  validateSearch: (s: Record<string, unknown>) => ({ order: typeof s.order === 'string' ? s.order : undefined }),
  head: () => ({
    meta: [
      { title: 'Support — NutroPact' },
      { name: 'description', content: 'Get help with your NutroPact order — cancellations, returns, tracking, and more.' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Support,
});
