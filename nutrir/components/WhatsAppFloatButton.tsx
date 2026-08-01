import { FaWhatsapp } from "react-icons/fa";
import { whatsappContactUrl } from "@/lib/legal";

export function WhatsAppFloatButton() {
  return (
    <a
      href={whatsappContactUrl("Olá! Tenho uma dúvida.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:shadow-xl md:bottom-6 md:right-6"
    >
      <FaWhatsapp className="text-2xl" aria-hidden />
    </a>
  );
}
