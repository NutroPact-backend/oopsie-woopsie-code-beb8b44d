// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const InvoicePage = lazy(() => import('@/pages/InvoicePage'));

export const Route = createFileRoute('/invoice/$orderNumber')({
  head: () => ({
    meta: [
      { title: 'Invoice — NutroPact' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: () => (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading invoice…</div>}>
      <InvoicePage />
    </Suspense>
  ),
});
