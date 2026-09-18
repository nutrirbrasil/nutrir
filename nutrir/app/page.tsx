import { HomePage } from "@/components/HomePage";
import { legal } from "@/lib/legal";

const foodEstablishmentJsonLd = {
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  name: legal.brand,
  url: legal.siteUrl,
  telephone: `+${legal.contactWhatsApp}`,
  priceRange: "$",
  servesCuisine: "Saudável",
  image: `${legal.siteUrl}/logo.png`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua Nossa Senhora da Paz, 209, Casa 2, Centro",
    addressLocality: "Balneário Piçarras",
    addressRegion: "SC",
    postalCode: "88380-000",
    addressCountry: "BR",
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: "09:00",
    closes: "19:30",
  },
  sameAs: [`https://www.instagram.com/${legal.instagram.replace("@", "")}`],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(foodEstablishmentJsonLd) }}
      />
      <HomePage />
    </>
  );
}
