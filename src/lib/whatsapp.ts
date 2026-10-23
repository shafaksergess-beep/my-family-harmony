// Click-to-chat WhatsApp helpers (no API, no provider fees).
export const KINSROOT_SUPPORT_WHATSAPP = "4571861759"; // +45 71861759

/** Normalise a phone number into the digits-only form wa.me expects. */
export function normalizeWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  digits = digits.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** Build a wa.me link. Without a phone, WhatsApp lets the user pick a chat or group. */
export function whatsAppLink(message: string, phone?: string | null): string {
  const number = phone ? normalizeWhatsAppNumber(phone) : null;
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function supportWhatsAppLink(message: string): string {
  return whatsAppLink(message, KINSROOT_SUPPORT_WHATSAPP);
}
