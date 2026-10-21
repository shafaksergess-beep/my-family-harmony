// Shared Kinsroot-branded email layout (deep forest green + gold).
export const KINSROOT_SENDER = "Kinsroot <onboarding@resend.dev>"; // testing sender until a domain is verified
export const APP_URL = "https://kinsroot.softserge.com";

export function brandedEmail(opts: { title: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string; lang?: string }) {
  const fr = opts.lang === "fr";
  const cta = opts.ctaUrl && opts.ctaLabel
    ? `<p style="text-align:center;margin:28px 0"><a href="${opts.ctaUrl}" style="background:#c9a227;color:#1a3d2e;padding:12px 26px;border-radius:999px;text-decoration:none;font-weight:700">${opts.ctaLabel}</a></p>`
    : "";
  return `<!DOCTYPE html><html><body style="margin:0;background:#f7f3ea;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#1a3d2e;padding:28px;text-align:center;border-bottom:4px solid #c9a227">
<img src="${APP_URL}/logo.jpg" alt="Kinsroot" width="60" height="60" style="border-radius:50%;border:2px solid #c9a227"/>
<h1 style="color:#f7f3ea;font-size:22px;margin:12px 0 0">${opts.title}</h1></td></tr>
<tr><td style="padding:28px;color:#2b2b2b;font-size:15px;line-height:1.6">${opts.bodyHtml}${cta}</td></tr>
<tr><td style="background:#f7f3ea;padding:18px;text-align:center;color:#6b6b6b;font-size:11px">
${fr ? "Notification automatique de Kinsroot." : "Automated notification from Kinsroot."}<br/>
Developed by Softserge. Copyright 2026 All rights reserved. softserge.dev@gmail.com</td></tr>
</table></td></tr></table></body></html>`;
}
