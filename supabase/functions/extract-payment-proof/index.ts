import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_mobile_money_receipt", "provider", "amount", "currency", "transaction_reference", "transaction_date", "sender_name", "sender_phone", "recipient_name", "recipient_phone", "fees", "confidence"],
  properties: {
    is_mobile_money_receipt: { type: "boolean" },
    provider: { type: "string", enum: ["MTN", "ORANGE", "UNKNOWN"] },
    amount: { type: ["number", "null"] },
    currency: { type: ["string", "null"] },
    transaction_reference: { type: ["string", "null"] },
    transaction_date: { type: ["string", "null"], description: "ISO 8601 datetime" },
    sender_name: { type: ["string", "null"] },
    sender_phone: { type: ["string", "null"] },
    recipient_name: { type: ["string", "null"] },
    recipient_phone: { type: ["string", "null"] },
    fees: { type: ["number", "null"] },
    confidence: { type: "number", description: "0 to 1" },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let proofId: string;
  try {
    const b = await req.json();
    proofId = String(b?.proof_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(proofId)) return json({ error: "proof_id is required" }, 400);
  } catch {
    return json({ error: "Invalid body" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: proof } = await admin.from("payment_proofs").select("*").eq("id", proofId).maybeSingle();
  if (!proof) return json({ error: "Not found" }, 404);
  const { data: canReview } = await admin.rpc("is_finance_reviewer", { _user_id: auth.userId, _family_id: proof.family_id });
  if (proof.submitted_by !== auth.userId && !canReview) return json({ error: "Forbidden" }, 403);

  const { data: file, error: dlErr } = await admin.storage.from("payment-proofs").download(proof.image_path);
  if (dlErr || !file) return json({ error: "Image not found" }, 404);
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const dataUrl = `data:${file.type || "image/jpeg"};base64,${btoa(bin)}`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY") ?? "",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions:
        "You read Cameroon MTN Mobile Money and Orange Money payment receipts/screenshots/SMS. Extract exactly what is visible; never guess. Use null for missing fields. Amounts as plain numbers (XAF/FCFA). Dates as ISO 8601.",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Extract the payment details from this receipt as json." },
          { type: "input_image", image_url: dataUrl },
        ],
      }],
      text: { format: { type: "json_schema", name: "momo_receipt", strict: true, schema: SCHEMA } },
    }),
  });

  if (!r.ok || !r.body) {
    const t = await r.text().catch(() => "");
    console.error("AI error", r.status, t);
    await admin.from("payment_proofs").update({ ai_status: "failed" }).eq("id", proofId);
    const msg = r.status === 429 ? "AI is busy, try again shortly" : r.status === 402 ? "AI credits exhausted" : "AI extraction failed";
    return json({ error: msg }, r.status === 429 || r.status === 402 ? r.status : 502);
  }

  // Consume SSE stream
  let out = "";
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d);
        if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
      } catch { /* ignore */ }
    }
  }

  let extracted: Record<string, unknown>;
  try {
    extracted = JSON.parse(out);
  } catch {
    await admin.from("payment_proofs").update({ ai_status: "failed" }).eq("id", proofId);
    return json({ error: "Could not read receipt" }, 422);
  }

  const amt = typeof extracted.amount === "number" ? extracted.amount : null;
  const mismatch = amt === null || Math.abs(amt - Number(proof.claimed_amount)) > 0.5;

  let duplicateOf: string | null = null;
  const ref = typeof extracted.transaction_reference === "string" ? extracted.transaction_reference.trim() : "";
  if (ref) {
    const { data: dups } = await admin.from("payment_proofs").select("id, ai_extracted, claimed_reference")
      .eq("family_id", proof.family_id).neq("id", proofId).neq("status", "rejected");
    const hit = (dups ?? []).find((d) =>
      String(d.claimed_reference ?? "").toLowerCase() === ref.toLowerCase() ||
      String((d.ai_extracted as Record<string, unknown> | null)?.transaction_reference ?? "").toLowerCase() === ref.toLowerCase());
    duplicateOf = hit?.id ?? null;
  }

  await admin.from("payment_proofs").update({
    ai_extracted: extracted, ai_status: "done", amount_mismatch: mismatch, duplicate_of: duplicateOf,
  }).eq("id", proofId);

  return json({ extracted, amount_mismatch: mismatch, duplicate_of: duplicateOf });
});
