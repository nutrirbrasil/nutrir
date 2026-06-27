import { About } from "@/components/About";
import { Approach } from "@/components/Approach";
import { Attendance } from "@/components/Attendance";
import { Contact } from "@/components/Contact";
import { Faq } from "@/components/Faq";
import { Hero } from "@/components/Hero";
import { IdentificationBadges } from "@/components/IdentificationBadges";
import { Plans } from "@/components/Plans";
import { Testimonials } from "@/components/Testimonials";
import { site } from "@/lib/site";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.fullName,
  alternateName: ["Paula Pastorino Nutricionista", "pauli.nutrirpicarras.com.br"],
  url: site.siteUrl,
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Hero />
      <IdentificationBadges />
      <About />
      <Attendance />
      <Approach />
      <Plans />
      <Testimonials />
      <Contact />
      <Faq />
    </>
  );
}
