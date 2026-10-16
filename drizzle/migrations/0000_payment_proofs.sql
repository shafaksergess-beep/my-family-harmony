CREATE TABLE public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('mtn','orange')),
  category text NOT NULL CHECK (category IN ('contribution','fine','levy','loan_repayment','savings','savings_withdrawal','other')),
  reason text NOT NULL,
  claimed_amount numeric NOT NULL CHECK (claimed_amount > 0),
  claimed_reference text,
  image_path text NOT NULL,
  ai_extracted jsonb,
  ai_status text NOT NULL DEFAULT 'pending' CHECK (ai_status IN ('pending','done','failed')),
  amount_mismatch boolean NOT NULL DEFAULT false,
  duplicate_of uuid,
  requires_dual_review boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partially_approved','approved','rejected')),
  first_reviewer uuid, first_reviewed_at timestamptz, first_notes text,
  second_reviewer uuid, second_reviewed_at timestamptz, second_notes text,
  rejection_reason text,
  payment_transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payment_proofs TO authenticated;
GRANT ALL ON public.payment_proofs TO service_role;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_payment_proofs_family_status ON public.payment_proofs(family_id, status);
CREATE UNIQUE INDEX uq_payment_proofs_ref ON public.payment_proofs(family_id, provider, lower(claimed_reference)) WHERE claimed_reference IS NOT NULL AND status <> 'rejected';

-- High-value threshold per family (FCFA)
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS payment_dual_review_threshold numeric NOT NULL DEFAULT 100000;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS momo_mtn_number text;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS momo_mtn_name text;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS momo_orange_number text;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS momo_orange_name text;

CREATE OR REPLACE FUNCTION public.is_finance_reviewer(_user_id uuid, _family_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM family_members WHERE user_id=_user_id AND family_id=_family_id
                 AND role IN ('family_head','family_admin','treasurer'))
      OR public.has_any_role(_user_id, _family_id, ARRAY['family_head','family_admin','treasurer']::user_role[]);
$$;
REVOKE EXECUTE ON FUNCTION public.is_finance_reviewer(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_finance_reviewer(uuid,uuid) TO authenticated;

CREATE POLICY "Submitter or reviewers can view proofs" ON public.payment_proofs FOR SELECT TO authenticated
USING (submitted_by = auth.uid() OR public.is_finance_reviewer(auth.uid(), family_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members submit own proofs" ON public.payment_proofs FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid() AND status = 'pending'
  AND EXISTS (SELECT 1 FROM family_members fm WHERE fm.id = member_id AND fm.user_id = auth.uid() AND fm.family_id = payment_proofs.family_id)
);

-- Server-side defaults: never trust client for review fields
CREATE OR REPLACE FUNCTION public.trg_payment_proof_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_threshold numeric;
BEGIN
  SELECT payment_dual_review_threshold INTO v_threshold FROM families WHERE id = NEW.family_id;
  NEW.status := 'pending';
  NEW.ai_status := 'pending'; NEW.ai_extracted := NULL; NEW.amount_mismatch := false;
  NEW.first_reviewer := NULL; NEW.second_reviewer := NULL; NEW.payment_transaction_id := NULL;
  NEW.requires_dual_review := NEW.category IN ('loan_repayment','savings','savings_withdrawal')
                              OR NEW.claimed_amount >= COALESCE(v_threshold, 100000);
  IF NEW.image_path NOT LIKE NEW.family_id::text || '/' || auth.uid()::text || '/%' THEN
    RAISE EXCEPTION 'Invalid proof image path';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payment_proof_before_insert BEFORE INSERT ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.trg_payment_proof_before_insert();

CREATE TRIGGER update_payment_proofs_updated_at BEFORE UPDATE ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.trg_payment_proof_dispatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event text;
BEGIN
  IF TG_OP = 'INSERT' THEN v_event := 'payment_proof_submitted';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN v_event := 'payment_proof_' || NEW.status;
  ELSE RETURN NEW; END IF;
  PERFORM private.call_dispatch_push(jsonb_build_object(
    'event', v_event, 'table', 'payment_proofs', 'record_id', NEW.id,
    'family_id', NEW.family_id, 'member_id', NEW.member_id,
    'amount', NEW.claimed_amount, 'provider', NEW.provider, 'category', NEW.category,
    'reason', COALESCE(NEW.rejection_reason, NEW.reason)));
  RETURN NEW;
END $$;
CREATE TRIGGER payment_proof_dispatch AFTER INSERT OR UPDATE ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.trg_payment_proof_dispatch();

-- Review RPC: enforces single/dual review rules
CREATE OR REPLACE FUNCTION public.review_payment_proof(p_proof_id uuid, p_decision text, p_notes text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payment_proofs; v_uid uuid := auth.uid(); v_tx uuid;
BEGIN
  SELECT * INTO p FROM payment_proofs WHERE id = p_proof_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proof not found'; END IF;
  IF NOT public.is_finance_reviewer(v_uid, p.family_id) THEN RAISE EXCEPTION 'Not authorized to review payments'; END IF;
  IF p.submitted_by = v_uid THEN RAISE EXCEPTION 'You cannot review your own payment'; END IF;
  IF p.status IN ('approved','rejected') THEN RAISE EXCEPTION 'Proof already finalized'; END IF;

  IF p_decision = 'reject' THEN
    IF COALESCE(trim(p_notes),'') = '' THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;
    UPDATE payment_proofs SET status='rejected', rejection_reason=p_notes,
      first_reviewer=COALESCE(first_reviewer, v_uid), first_reviewed_at=COALESCE(first_reviewed_at, now()),
      second_reviewer=CASE WHEN first_reviewer IS NOT NULL THEN v_uid ELSE second_reviewer END,
      second_reviewed_at=CASE WHEN first_reviewer IS NOT NULL THEN now() ELSE second_reviewed_at END
    WHERE id=p.id;
    RETURN 'rejected';
  ELSIF p_decision <> 'approve' THEN RAISE EXCEPTION 'Invalid decision'; END IF;

  IF p.status = 'pending' AND p.requires_dual_review THEN
    UPDATE payment_proofs SET status='partially_approved', first_reviewer=v_uid, first_reviewed_at=now(), first_notes=p_notes WHERE id=p.id;
    RETURN 'partially_approved';
  END IF;
  IF p.status = 'partially_approved' AND p.first_reviewer = v_uid THEN
    RAISE EXCEPTION 'A different reviewer must give the second approval';
  END IF;

  INSERT INTO payment_transactions (family_id, member_id, amount, payment_method, payment_reference, status, transaction_date, verified_by, verified_at, notes)
  VALUES (p.family_id, p.member_id, p.claimed_amount, p.provider || '_momo',
          COALESCE(p.claimed_reference, p.ai_extracted->>'transaction_reference'), 'verified',
          COALESCE((p.ai_extracted->>'transaction_date')::timestamptz, p.created_at), v_uid, now(),
          p.category || ': ' || p.reason)
  RETURNING id INTO v_tx;

  IF p.status = 'partially_approved' THEN
    UPDATE payment_proofs SET status='approved', second_reviewer=v_uid, second_reviewed_at=now(), second_notes=p_notes, payment_transaction_id=v_tx WHERE id=p.id;
  ELSE
    UPDATE payment_proofs SET status='approved', first_reviewer=v_uid, first_reviewed_at=now(), first_notes=p_notes, payment_transaction_id=v_tx WHERE id=p.id;
  END IF;
  RETURN 'approved';
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
  RAISE EXCEPTION 'Invalid extracted date; edit reference/date and retry';
END $$;
REVOKE EXECUTE ON FUNCTION public.review_payment_proof(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_payment_proof(uuid,text,text) TO authenticated;