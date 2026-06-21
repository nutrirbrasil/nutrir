import { FiMapPin, FiMonitor, FiUsers } from "react-icons/fi";
import { site } from "@/lib/site";

export function Attendance() {
  return (
    <section id="atendimento" className="scroll-mt-20 bg-transparent px-4 py-20 dark:bg-[#0f1412]">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="surface-card p-8">
            <p className="dark-accent-label text-xs font-semibold uppercase tracking-[0.3em]">
              Atendimento
            </p>
            <h2 className="dark-accent-heading mt-2 font-display text-2xl font-bold md:text-3xl">
              Como funciona
            </h2>

            <dl className="mt-8 space-y-6">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pauli-emerald/10 text-pauli-emerald dark:bg-pauli-sand/10 dark:text-pauli-sand">
                  <FiUsers className="text-lg" />
                </div>
                <div>
                  <dt className="dark-accent-title">Presencial</dt>
                  <dd className="dark-accent-body mt-1 text-sm leading-relaxed">
                    {site.attendance.inPerson}
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pauli-emerald/10 text-pauli-emerald dark:bg-pauli-sand/10 dark:text-pauli-sand">
                  <FiMonitor className="text-lg" />
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

          <div className="surface-card p-8">
            <p className="dark-accent-label text-xs font-semibold uppercase tracking-[0.3em]">
              Localização
            </p>
            <h2 className="dark-accent-heading mt-2 font-display text-2xl font-bold md:text-3xl">
              Academia Thom
            </h2>

            <div className="mt-8 flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pauli-burgundy/10 text-pauli-burgundy dark:bg-pauli-sand/10 dark:text-pauli-sand">
                <FiMapPin className="text-lg" />
              </div>
              <address className="dark-accent-body not-italic text-sm leading-relaxed">
                <a
                  href={site.address.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-pauli-burgundy hover:underline dark:hover:text-pauli-cream"
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
              className="mt-6 inline-block text-sm font-semibold text-pauli-burgundy hover:underline dark:text-pauli-sand dark:hover:text-pauli-cream"
            >
              Ver no Google Maps →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
