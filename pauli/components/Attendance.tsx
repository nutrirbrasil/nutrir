import { FiMapPin, FiMonitor, FiUsers } from "react-icons/fi";
import { ScrollReveal } from "@/components/ScrollReveal";
import { site } from "@/lib/site";

export function Attendance() {
  return (
    <section id="atendimento" className="scroll-mt-20 bg-transparent px-4 py-20 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 md:grid-cols-2">
          <ScrollReveal animation="fade-left" duration={750}>
            <div className="surface-card h-full p-8">
              <p className="dark-accent-label text-xs font-semibold uppercase tracking-[0.3em]">
                Atendimento
              </p>
              <h2 className="dark-accent-heading mt-2 font-display text-2xl font-bold md:text-3xl">
                Como funciona
              </h2>

              <dl className="mt-8 space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pauli-gold/10 dark:bg-white/10">
                    <FiUsers className="detail-text text-lg" />
                  </div>
                  <div>
                    <dt className="dark-accent-title">Presencial</dt>
                    <dd className="dark-accent-body mt-1 text-sm leading-relaxed">
                      {site.attendance.inPerson}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pauli-gold/10 dark:bg-white/10">
                    <FiMonitor className="detail-text text-lg" />
                  </div>
                  <div>
                    <dt className="dark-accent-title">Online</dt>
                    <dd className="dark-accent-body mt-1 text-sm leading-relaxed">
                      {site.attendance.online}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-right" delay={140} duration={750}>
            <div className="surface-card h-full p-8">
              <p className="dark-accent-label text-xs font-semibold uppercase tracking-[0.3em]">
                Localização
              </p>
              <h2 className="dark-accent-heading mt-2 font-display text-2xl font-bold md:text-3xl">
                Academia Thom
              </h2>

              <div className="mt-8 flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pauli-gold/10 dark:bg-white/10">
                  <FiMapPin className="detail-text text-lg" />
                </div>
                <address className="dark-accent-body not-italic text-sm leading-relaxed">
                  <a
                    href={site.address.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-text transition hover:opacity-80"
                  >
                    {site.address.line}
                    <br />
                    {site.address.cityState}
                    <br />
                    CEP {site.address.zip}
                  </a>
                </address>
              </div>

              <a
                href={site.address.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-text mt-6 inline-block text-sm font-semibold hover:opacity-80"
              >
                Ver no Google Maps →
              </a>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
