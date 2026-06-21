import { FiInstagram, FiMail } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { site, whatsappLink } from "@/lib/site";

export function Contact() {
  return (
    <section id="contato" className="scroll-mt-20 px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="section-title">Agende sua consulta</h2>
        <p className="mt-3 text-pauli-emerald/70">
          Entre em contato pelo WhatsApp ou e-mail. Respondo o mais breve possível.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href={whatsappLink("Olá Pauli! Quero agendar uma consulta.")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-2"
          >
            <FaWhatsapp className="text-lg" />
            WhatsApp
          </a>
          <a href={`mailto:${site.email}`} className="btn-secondary flex items-center gap-2">
            <FiMail />
            E-mail
          </a>
        </div>

        <p className="mt-8 text-sm text-pauli-emerald/60">
          <FiInstagram className="mr-1 inline" />
          {site.instagram}
        </p>
      </div>
    </section>
  );
}
