import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Stats } from "@/components/Stats";
import { Waitlist } from "@/components/Waitlist";
import { TestnetExplorer } from "@/components/TestnetExplorer";
import { Roadmap } from "@/components/Roadmap";
import { TechnicalDiagram } from "@/components/TechnicalDiagram";
import { DeepSpaceBackground } from "@/components/DeepSpaceBackground";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background relative">
      <DeepSpaceBackground />
      <div className="relative z-10">
        <Hero />
        <Stats />
        <Features />
        <Waitlist />
        <TestnetExplorer />
        <Roadmap />
        <TechnicalDiagram />
        <Footer />
      </div>
    </main>
  );
};

export default Index;
