import { getImageProps } from "next/image";
import Link from "next/link";

const ALT =
  "Combos a partir de R$15,99 por unidade, marmitas avulsas e sucos naturais sem açúcar.";

/**
 * Áreas clicáveis por cima da arte, em % da imagem. Ficam dentro de um
 * wrapper com a proporção exata da arte, então seguem alinhadas mesmo quando
 * as bordas são cortadas pra preencher a tela. Ao trocar uma arte, revisar
 * os retângulos dela.
 */
interface Hotspot {
  href: string;
  label: string;
  /** left, top, width, height em % da imagem. */
  area: [number, number, number, number];
}

interface HeroArt {
  src: string;
  hotspots: Hotspot[];
}

/** Celular (tela em pé): 1080x1920, proporção aspect-[1080/1920] no wrapper. */
const PORTRAIT_ART: HeroArt = {
  src: "/home/pagina-inicial-v3.jpg",
  hotspots: [
    { href: "/combos", label: "Ver combos", area: [33, 26, 37, 6] },
    { href: "/combos", label: "Ver combos", area: [17, 32, 67, 25] },
    { href: "/combos", label: "Ver combos", area: [43, 57, 17, 5] },
    { href: "/marmitas", label: "Ver cardápio de marmitas", area: [7, 59, 36, 22] },
    { href: "/sucos", label: "Ver sucos naturais", area: [60, 57, 33, 24] },
  ],
};

/** Desktop e tablet deitado: 1920x900, proporção landscape:aspect-[1920/900] no wrapper. */
const LANDSCAPE_ART: HeroArt = {
  src: "/home/pagina-inicial-desktop-v2.jpg",
  hotspots: [
    { href: "/combos", label: "Ver combos", area: [39, 23, 22, 13] },
    { href: "/combos", label: "Ver combos", area: [33, 37, 33, 52] },
    { href: "/marmitas", label: "Ver cardápio de marmitas", area: [8, 44, 21, 44] },
    { href: "/sucos", label: "Ver sucos naturais", area: [73, 43, 19, 45] },
  ],
};

function HotspotLinks({ hotspots }: { hotspots: Hotspot[] }) {
  return (
    <>
      {hotspots.map(({ href, label, area: [left, top, width, height] }) => (
        <Link
          key={`${href}-${top}-${left}`}
          href={href}
          aria-label={label}
          style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
          className="absolute rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nutrir-burgundy"
        >
          <span className="sr-only">{label}</span>
        </Link>
      ))}
    </>
  );
}

export function HomePage() {
  // getImageProps em vez de <Image> pra montar um <picture>: o navegador baixa
  // só a arte da orientação atual, em vez das duas.
  const { props: portrait } = getImageProps({ alt: ALT, src: PORTRAIT_ART.src, fill: true, sizes: "100vw", priority: true });
  const { props: landscape } = getImageProps({ alt: ALT, src: LANDSCAPE_ART.src, fill: true, sizes: "100vw", priority: true });

  return (
    // Altura exata do vão visível (variáveis --bar-h/--nav-h/--bottom-h no
    // layout). A margem negativa anula o padding-bottom do main no celular,
    // senão ele aparece como faixa entre a arte e o rodapé ao rolar.
    <section className="relative isolate -mb-[4.75rem] h-[calc(100dvh-var(--bar-h)-var(--nav-h)-var(--bottom-h))] w-full overflow-hidden bg-[#e4dacd] md:mb-0">
      <h1 className="sr-only">
        Bem-vindo(a) ao Nutrir. Selecione a opção que você deseja: combos, marmitas ou sucos.
      </h1>

      {/*
        Wrapper com a proporção da arte que cresce até cobrir os dois eixos
        (igual object-cover, a sobra é cortada pelo overflow do pai). Os
        hotspots ficam em % dele, por isso nunca desalinham.
      */}
      <div className="absolute left-1/2 top-1/2 aspect-[1080/1920] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 landscape:aspect-[1920/900]">
        <picture>
          <source media="(orientation: landscape)" srcSet={landscape.srcSet} sizes={landscape.sizes} />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- alt vem de portrait.alt */}
          <img {...portrait} className="object-cover" />
        </picture>

        <div className="contents landscape:hidden">
          <HotspotLinks hotspots={PORTRAIT_ART.hotspots} />
        </div>
        <div className="contents portrait:hidden">
          <HotspotLinks hotspots={LANDSCAPE_ART.hotspots} />
        </div>
      </div>
    </section>
  );
}
