import { About } from "@/components/About";
import { Approach } from "@/components/Approach";
import { Attendance } from "@/components/Attendance";
import { Contact } from "@/components/Contact";
import { Faq } from "@/components/Faq";
import { Hero } from "@/components/Hero";
import { IdentificationBadges } from "@/components/IdentificationBadges";
import { Plans } from "@/components/Plans";
import { Testimonials } from "@/components/Testimonials";

export default function HomePage() {
  return (
    <>
      <Hero />
      <IdentificationBadges />
      <About />
      <Attendance />
      <Approach />
      <Plans />
      <Testimonials />
      <Faq />
      <Contact />
    </>
  );
}
