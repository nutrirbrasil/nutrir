import { FiInstagram } from "react-icons/fi";
import { FaTiktok, FaWhatsapp } from "react-icons/fa";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { ScrollReveal } from "@/components/ScrollReveal";
import { site, whatsappLink } from "@/lib/site";

export function Contact() {
  return (
    <section id="contato" className="scroll-mt-20 bg-pauli-charcoal px-4 py-20 text-white dark:bg-black">
      <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[auto_1fr] md:gap-12">
        <ScrollReveal animation="scale-up" duration={800} className="flex justify-center md:justify-start">
          <ProfilePhoto size="contact" variant="profile" className="ring-4 ring-white/20" />
        </ScrollReveal>

        <ScrollReveal animation="fade-left" delay={150} duration={750} className="text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Contato</p>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Agende sua consulta</h2>
          <p className="mt-3 text-white/70">
            Me chame no WhatsApp e me acompanhe no Instagram e TikTok, conteúdos diários sobre alimentação
            e rotina saudável.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap md:justify-start">
            <a
              href={whatsappLink("Olá Paula! Quero agendar uma consulta.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2 bg-white text-pauli-charcoal hover:bg-pauli-sand"
            >
              <FaWhatsapp className="text-lg" />
              WhatsApp
            </a>
            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-2 border-white/35 text-white hover:border-white hover:bg-white/10"
            >
              <FiInstagram />
              {site.instagram}
            </a>
            <a
              href={site.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-2 border-white/20 text-white/90 hover:border-white/40"
            >
              <FaTiktok />
              {site.tiktok}
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
