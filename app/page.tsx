import Hero from "../components/home/Hero";
import Features from "../components/home/Features";
import HowItWorks from "../components/home/HowItWorks";
import Mission from "../components/home/Mission";
import WhyChooseUs from "../components/home/WhyChooseUs";
import CallToAction from "../components/home/CallToAction";
import Footer from "../components/home/Footer";
import Navbar from "../components/layout/Navbar";

export default function Home() {
  return (
    <>
  <Navbar />

  <Hero />

  <Features />

  <HowItWorks />

  <Mission />

  <WhyChooseUs />

  <CallToAction />

  <Footer />
</>
  );
}