import Hero from "@/components/landing-page/Hero";
import Ticker from "@/components/landing-page/Ticker";
import HowItWorks from "@/components/landing-page/HowItWorks";
import Science from "@/components/landing-page/Science";
import MoneyEngine from "@/components/landing-page/MoneyEngine";
import SocialImpact from "@/components/landing-page/SocialImpact";
import TechStack from "@/components/landing-page/TechStack";
import RotatingQuotes from "@/components/landing-page/RotatingQuotes";
import InvestorCTA from "@/components/landing-page/InvestorCTA";
import Footer from "@/components/landing-page/Footer";

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center w-full bg-background overflow-x-hidden">
        <Hero />
        <Ticker />
        <div className="w-full max-w-[100vw]">
          <HowItWorks />
          <Science />
          <MoneyEngine />
          <SocialImpact />
          <TechStack />
          <RotatingQuotes />
          <InvestorCTA />
        </div>
        <Footer />
      </main>
    </>
  );
}
