
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hsn_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gst_rate numeric NOT NULL DEFAULT 5;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_order_number_unique ON public.invoices(order_number);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz;
