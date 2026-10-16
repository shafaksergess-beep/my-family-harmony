CREATE POLICY "Members upload own payment proofs" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.user_belongs_to_family(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "Owner or finance reviewers read payment proofs" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND (
  (storage.foldername(name))[2] = auth.uid()::text
  OR public.is_finance_reviewer(auth.uid(), ((storage.foldername(name))[1])::uuid)
  OR public.is_super_admin(auth.uid())));