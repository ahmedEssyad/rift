import FloatingNav from "@/components/FloatingNav";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import ProblemSolution from "@/components/ProblemSolution";
import Features from "@/components/Features";
import Frameworks from "@/components/Frameworks";
import TerminalDemo from "@/components/TerminalDemo";
import Install from "@/components/Install";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <FloatingNav />
      <Hero />
      <Stats />
      <ProblemSolution />
      <Features />
      <Frameworks />
      <TerminalDemo />
      <Install />
      <Footer />
    </main>
  );
}
