// Send a Firebase Cloud Messaging push to a list of FCM tokens.
// Uses the FIREBASE_SERVICE_ACCOUNT secret (full JSON) to mint an OAuth2
// access token, then calls the FCM HTTP v1 API.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

interface SendBody {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  url?: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  project_id: string;
}): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  // Import RSA private key (PEM PKCS#8) for RS256 signing
  const pem = serviceAccount.private_key.replace(/\\n/g, "\n");
  const pemBody = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const keyBuf = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const now = getNumericDate(0);
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: getNumericDate(3600),
    },
    cryptoKey
  );

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!resp.ok) {
    throw new Error(`oauth2 token failed: ${resp.status} ${await resp.text()}`);
  }
  const json = await resp.json();
  cachedAccessToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedAccessToken.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { requireCronSecret } = await import("../_shared/auth.ts");
  const cronCheck = await requireCronSecret(req, corsHeaders);
  if (cronCheck instanceof Response) return cronCheck;

  try {

    const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!raw) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const serviceAccount = JSON.parse(raw);
    const projectId = serviceAccount.project_id;

    const body = (await req.json()) as SendBody;
    if (!body.tokens?.length || !body.title || !body.body) {
      return new Response(
        JSON.stringify({ error: "tokens, title, body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getAccessToken(serviceAccount);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const results = await Promise.all(
      body.tokens.map(async (token) => {
        const message = {
          message: {
            token,
            notification: { title: body.title, body: body.body },
            data: {
              ...(body.data ?? {}),
              ...(body.url ? { url: body.url } : {}),
            },
            webpush: body.url
              ? { fcm_options: { link: body.url } }
              : undefined,
          },
        };
        const r = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });
        return { token: token.slice(0, 12) + "…", status: r.status, ok: r.ok };
      })
    );

    const sent = results.filter((r) => r.ok).length;
    return new Response(
      JSON.stringify({ sent, total: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[send-fcm-push] error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
