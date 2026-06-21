import { FiMapPin, FiMonitor, FiUsers } from "react-icons/fi";
import { site } from "@/lib/site";

export function Attendance() {
  return (
    <section id="atendimento" className="scroll-mt-20 bg-transparent px-4 py-20 dark:bg-[#0f1412]">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="surface-card p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pauli-emerald/60 dark:text-pauli-sage/50">
              Atendimento
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-pauli-charcoal dark:text-pauli-sage md:text-3xl">
              Como funciona
            </h2>

            <dl className="mt-8 space-y-6">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pauli-emerald/10 text-pauli-emerald">
                  <FiUsers className="text-lg" />
                </div>
                <div>
                  <dt className="font-semibold text-pauli-emerald">Presencial</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-pauli-charcoal/80 dark:text-pauli-sage/75">
                    {site.attendance.inPerson}
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pauli-emerald/10 text-pauli-emerald">
                  <FiMonitor className="text-lg" />
                </div>
                <div>
                  <dt className="font-semibold text-pauli-emerald">Online</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-pauli-charcoal/80 dark:text-pauli-sage/75">
                    {site.attendance.online}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="surface-card p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pauli-emerald/60 dark:text-pauli-sage/50">
              Localização
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-pauli-charcoal dark:text-pauli-sage md:text-3xl">
              Consultório
            </h2>

            <div className="mt-8 flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pauli-burgundy/10 text-pauli-burgundy">
                <FiMapPin className="text-lg" />
              </div>
              <address className="not-italic text-sm leading-relaxed text-pauli-charcoal/80 dark:text-pauli-sage/75">
                <a
                  href={site.address.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-pauli-burgundy hover:underline"
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
              className="mt-6 inline-block text-sm font-semibold text-pauli-burgundy hover:underline"
            >
              Ver no Google Maps →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
