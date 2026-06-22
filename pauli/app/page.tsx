import { About } from "@/components/About";
import { Approach } from "@/components/Approach";
import { Attendance } from "@/components/Attendance";
import { Contact } from "@/components/Contact";
import { Hero } from "@/components/Hero";
import { Plans } from "@/components/Plans";
import { Testimonials } from "@/components/Testimonials";

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Attendance />
      <Approach />
      <Plans />
      <Testimonials />
      <Contact />
    </>
  );
}
