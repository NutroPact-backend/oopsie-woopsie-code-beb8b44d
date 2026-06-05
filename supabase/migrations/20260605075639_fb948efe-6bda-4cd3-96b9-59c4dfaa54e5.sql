
CREATE POLICY "page-backgrounds admin write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'page-backgrounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "page-backgrounds admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'page-backgrounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "page-backgrounds admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'page-backgrounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "page-backgrounds read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'page-backgrounds');
