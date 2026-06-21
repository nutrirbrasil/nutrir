import { About } from "@/components/About";
import { Attendance } from "@/components/Attendance";
import { Contact } from "@/components/Contact";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Attendance />
      <Services />
      <Contact />
    </>
  );
}
