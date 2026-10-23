import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
import { supportWhatsAppLink } from "@/lib/whatsapp";

export function WhatsAppSupportLink({ className = "", label }: { className?: string; label?: string }) {
  const { t } = useTranslation();
  return (
    <a
      href={supportWhatsAppLink(t("whatsapp.supportMessage"))}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      {label ?? t("whatsapp.supportLabel")}
    </a>
  );
}
