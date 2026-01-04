import { Code2, FileKey, Server } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: FileKey,
    title: "Quantum-Resistant Consensus",
    tag: "Core",
    description: "Native BlockDAG consensus powered by post-quantum signatures. Every validator, block, and transaction is secured with lattice-based cryptography from genesis.",
    highlights: [
      "BlockDAG with PQ signatures",
      "Native PQ verifier in consensus",
      "Quantum-safe validator identities",
    ],
  },
  {
    icon: Code2,
    title: "PQ Transaction Layer",
    tag: "Protocol",
    description: "Complete transaction lifecycle designed for post-quantum security. Optimized network protocol handles large PQ signatures efficiently while maintaining high throughput.",
    highlights: [
      "PQ transaction pool + gossip",
      "Optimized for large signatures",
      "Ledger format for PQ key lengths",
    ],
  },
  {
    icon: Server,
    title: "Full Node Infrastructure",
    tag: "Network",
    description: "Production-ready node software with full and light client support. Complete developer tooling including CLI, RPC, and SDK for seamless integration.",
    highlights: [
      "Full node + light client support",
      "Genesis with PQ validator set",
      "Developer CLI, RPC, SDK",
    ],
  },
];

export const Features = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="mb-6 glow-text text-foreground">Full L1 Protocol</h2>
          <p className="text-xl text-foreground/80 font-medium">
            Complete quantum-secure blockchain infrastructure from consensus to execution
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group relative bg-card/60 backdrop-blur-sm border-2 border-primary/30 hover:border-primary/60 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardContent className="p-8 relative">
                <div className="mb-6 flex items-center justify-between">
                  <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border-2 border-primary/40">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary border-2 border-primary/40 px-3 py-1 rounded-full">
                    {feature.tag}
                  </span>
                </div>

                <h3 className="mb-4 text-foreground font-bold">{feature.title}</h3>
                
                <p className="text-foreground/80 mb-6 leading-relaxed font-medium">
                  {feature.description}
                </p>

                <ul className="space-y-2">
                  {feature.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-center text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mr-3 glow-border" />
                      <span className="text-foreground/80 font-medium">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
