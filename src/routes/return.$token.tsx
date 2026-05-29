import { createFileRoute } from '@tanstack/react-router';
import ReturnPage from '@/pages/ReturnPage';

export const Route = createFileRoute('/return/$token')({
  head: () => ({
    meta: [
      { title: 'Return Request — NutroPact' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ReturnPage,
});
