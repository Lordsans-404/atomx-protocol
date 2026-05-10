import Hero from "@/components/landing-page/Hero";
import PageShellWidth from "@/components/PageShellWidth";
import Quote from "@/components/landing-page/Quote";

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between w-full">
        <Hero />
        <Quote />
      </main>
    </>
  );
}
