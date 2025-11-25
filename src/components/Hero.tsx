import { Button } from "@/components/ui/button";
import { Shield, Network, Lock } from "lucide-react";
import { QuantumParticles } from "./QuantumParticles";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <QuantumParticles />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-card/50 backdrop-blur-sm mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">World's First Quantum-Secure BlockDAG</span>
          </div>
          
          <h1 className="glow-text leading-tight">
            Lattice Network
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The future of blockchain is quantum-resistant. Built on post-quantum cryptography and BlockDAG consensus for unparalleled security and scalability.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button size="lg" className="glow-border group relative overflow-hidden">
              <span className="relative z-10">Explore Protocol</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </Button>
            <Button size="lg" variant="secondary" className="border border-primary/20">
              <Network className="w-5 h-5 mr-2" />
              View Network Stats
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-4xl mx-auto">
            <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-primary/20 glow-card hover:scale-105 transition-transform duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-primary mb-2">Post-Quantum</h3>
              <p className="text-sm text-muted-foreground">Dilithium & Falcon signatures ensure quantum resistance</p>
            </div>

            <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-primary/20 glow-card hover:scale-105 transition-transform duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Network className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-primary mb-2">BlockDAG</h3>
              <p className="text-sm text-muted-foreground">Parallel block processing for maximum throughput</p>
            </div>

            <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-primary/20 glow-card hover:scale-105 transition-transform duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-primary mb-2">Full Stack Security</h3>
              <p className="text-sm text-muted-foreground">Quantum-safe from consensus to transactions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
