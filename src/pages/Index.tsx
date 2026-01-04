import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Architecture } from "@/components/Architecture";
import { Authentication } from "@/components/Authentication";
import { Stats } from "@/components/Stats";
import { Waitlist } from "@/components/Waitlist";
import { TestnetExplorer } from "@/components/TestnetExplorer";
import { Roadmap } from "@/components/Roadmap";
import { TechnicalDiagram } from "@/components/TechnicalDiagram";
import { DeepSpaceBackground } from "@/components/DeepSpaceBackground";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";

const Index = () => {
  return (
    <main className="min-h-screen bg-background relative">
      <DeepSpaceBackground />
      <Navigation />
      <div className="relative z-10">
        <Hero />
        <Stats />
        <div id="features">
          <Features />
        </div>
        <div id="architecture">
          <Architecture />
        </div>
        <div id="authentication">
          <Authentication />
        </div>
        <div id="waitlist">
          <Waitlist />
        </div>
        <div id="testnet">
          <TestnetExplorer />
        </div>
        <div id="roadmap">
          <Roadmap />
        </div>
        <div id="docs">
          <TechnicalDiagram />
        </div>
        <Footer />
      </div>
    </main>
  );
};

export default Index;
