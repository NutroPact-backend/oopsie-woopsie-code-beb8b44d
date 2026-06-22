import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/products")({
  component: () => <Outlet />,
  errorComponent: ProductsError,
  notFoundComponent: () => (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <p className="text-5xl mb-3">📦</p>
      <h1 className="text-2xl font-black mb-2">Product not found</h1>
      <p className="text-gray-500">The product you're looking for may have moved or sold out.</p>
      <a href="/products" className="inline-block mt-6 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold">
        Browse all products
      </a>
    </div>
  ),
});

function ProductsError({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <p className="text-5xl mb-3">⚠️</p>
      <h1 className="text-2xl font-black mb-2">Couldn't load products</h1>
      <p className="text-gray-500 mb-6">
        Something went wrong on our side. Check your connection and try again.
      </p>
      <button
        onClick={() => { router.invalidate(); reset(); }}
        className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600"
      >
        Retry
      </button>
    </div>
  );
}
