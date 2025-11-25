import { Button } from "@/components/ui/button";
import { Network } from "lucide-react";
import { QuantumParticles } from "./QuantumParticles";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <QuantumParticles />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border-2 border-primary/50 bg-card/60 backdrop-blur-sm mb-6 glow-border">
            <span className="text-base font-bold text-primary">DAG + PQC + EVM</span>
          </div>
          
          <h1 className="glow-text leading-tight text-foreground">
            Lattice Network
          </h1>
          
          <p className="text-xl md:text-2xl text-foreground/90 max-w-3xl mx-auto leading-relaxed font-medium">
            The only blockchain combining <span className="text-primary font-bold">BlockDAG</span> architecture with <span className="text-primary font-bold">Post-Quantum Cryptography</span> and <span className="text-primary font-bold">EVM compatibility</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button size="lg" className="glow-border group relative overflow-hidden bg-primary hover:bg-primary/90">
              <span className="relative z-10 font-bold">Explore Protocol</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </Button>
            <Button size="lg" variant="secondary" className="border-2 border-primary/30 font-bold text-foreground">
              <Network className="w-5 h-5 mr-2" />
              Network Stats
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-4xl mx-auto">
            <div className="p-8 rounded-xl bg-card/60 backdrop-blur-sm border-2 border-primary/30 glow-card hover:scale-105 transition-transform duration-300">
              <div className="text-6xl font-black text-primary mb-4 glow-text">DAG</div>
              <h3 className="text-primary font-bold text-xl mb-2">BlockDAG</h3>
              <p className="text-base text-foreground/80 font-medium">Parallel block processing for maximum throughput</p>
            </div>

            <div className="p-8 rounded-xl bg-card/60 backdrop-blur-sm border-2 border-primary/30 glow-card hover:scale-105 transition-transform duration-300">
              <div className="text-6xl font-black text-primary mb-4 glow-text">PQC</div>
              <h3 className="text-primary font-bold text-xl mb-2">Post-Quantum</h3>
              <p className="text-base text-foreground/80 font-medium">Quantum-resistant cryptography at every layer</p>
            </div>

            <div className="p-8 rounded-xl bg-card/60 backdrop-blur-sm border-2 border-primary/30 glow-card hover:scale-105 transition-transform duration-300">
              <div className="text-6xl font-black text-primary mb-4 glow-text">EVM</div>
              <h3 className="text-primary font-bold text-xl mb-2">EVM Compatible</h3>
              <p className="text-base text-foreground/80 font-medium">Deploy Ethereum dApps without modification</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
