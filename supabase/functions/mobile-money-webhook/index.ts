import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MobileMoneyPayload {
  provider: "mtn" | "orange";
  transaction_id: string;
  amount: number;
  phone: string;
  status: string;
  reference?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const secret = Deno.env.get("MOBILE_MONEY_SECRET");
    const signature = req.headers.get("x-provider-signature");

    const bodyText = await req.text();
    
    // Signature verification (only if secret is configured)
    if (secret) {
      if (!signature) {
        console.error("Missing signature header");
        return new Response(JSON.stringify({ error: "Missing identity verification" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );

      const signatureBytes = new Uint8Array(
        signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );

      const isValid = await crypto.subtle.verify(
        "HMAC",
        key,
        signatureBytes,
        encoder.encode(bodyText)
      );

      if (!isValid) {
        console.error("Invalid signature");
        return new Response(JSON.stringify({ error: "Invalid identity verification" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else {
      console.warn("MOBILE_MONEY_SECRET not set, signature verification skipped in dev mode");
    }

    const payload: MobileMoneyPayload = JSON.parse(bodyText);
    console.log("Received mobile money webhook:", payload);

    // Validate payload
    if (!payload.transaction_id || !payload.amount || !payload.status) {
      throw new Error("Invalid payload");
    }

    // Find matching payment transaction by reference
    const { data: transaction, error: findError } = await supabaseClient
      .from("payment_transactions")
      .select("*")
      .eq("payment_reference", payload.reference || payload.transaction_id)
      .eq("status", "pending")
      .maybeSingle();

    if (findError) {
      console.error("Error finding transaction:", findError);
      throw findError;
    }

    if (!transaction) {
      console.warn("No matching transaction found for reference:", payload.reference || payload.transaction_id);
      return new Response(
        JSON.stringify({ message: "Transaction not found or already processed" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update transaction status based on webhook status
    let newStatus = "pending";
    if (payload.status === "success" || payload.status === "completed" || payload.status === "successful") {
      newStatus = "completed";
    } else if (payload.status === "failed" || payload.status === "rejected") {
      newStatus = "failed";
    }

    const { error: updateError } = await supabaseClient
      .from("payment_transactions")
      .update({
        status: newStatus,
        verified_at: newStatus === "completed" ? new Date().toISOString() : null,
        notes: `${transaction.notes || ""}\nMobile Money ${payload.provider.toUpperCase()} verification: ${payload.status}`.trim(),
      })
      .eq("id", transaction.id);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
      throw updateError;
    }

    // If completed, update related contribution if exists
    if (newStatus === "completed" && transaction.contribution_id) {
      const { error: contributionError } = await supabaseClient
        .from("contributions")
        .update({
          status: "paid",
          payment_date: new Date().toISOString(),
        })
        .eq("id", transaction.contribution_id);

      if (contributionError) {
        console.error("Error updating contribution:", contributionError);
      }
    }

    console.log(`Transaction ${transaction.id} updated to ${newStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        status: newStatus,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in mobile-money-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
