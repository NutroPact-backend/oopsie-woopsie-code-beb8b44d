import { createFileRoute } from '@tanstack/react-router';
import CustomPageView from '@/pages/CustomPage';

export const Route = createFileRoute('/p/$slug')({
  component: CustomPageView,
});
