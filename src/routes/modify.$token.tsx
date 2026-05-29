// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import OrderModifyPage from '@/pages/OrderModifyPage';

export const Route = createFileRoute('/modify/$token')({
  head: () => ({
    meta: [
      { title: 'Modify Order — NutroPact' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: OrderModifyPage,
});
