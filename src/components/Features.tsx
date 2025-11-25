import { Code2, FileKey, Server } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: FileKey,
    title: "PQ Consensus",
    tag: "5.1",
    description: "BlockDAG signing with Dilithium or Falcon signatures for validator authentication. Hash-based node identity with expandable cryptographic agility.",
    highlights: [
      "Dilithium/Falcon signatures",
      "Hash-based identity",
      "Cryptographic agility",
    ],
  },
  {
    icon: Code2,
    title: "PQ Transaction Format",
    tag: "5.2",
    description: "Revolutionary transaction structure with PQ signatures, key roots, and Merkle state witnesses. Fully backwards compatible with classical EVM wallets.",
    highlights: [
      "PQ signature format",
      "Merkle state witness",
      "EVM compatibility",
    ],
  },
  {
    icon: Server,
    title: "Lattice Node Software",
    tag: "5.3",
    description: "Complete quantum-secure infrastructure with PQ validator nodes, transaction mempool, and BlockDAG engine. True full chain security.",
    highlights: [
      "PQ validator nodes",
      "PQ transaction mempool",
      "BlockDAG consensus engine",
    ],
  },
];

export const Features = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="mb-6 glow-text">Full L1 Protocol</h2>
          <p className="text-xl text-muted-foreground">
            A complete quantum-secure blockchain infrastructure from consensus to execution
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group relative bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardContent className="p-8 relative">
                <div className="mb-6 flex items-center justify-between">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <span className="text-xs font-mono text-primary border border-primary/30 px-3 py-1 rounded-full">
                    {feature.tag}
                  </span>
                </div>

                <h3 className="mb-4 text-foreground">{feature.title}</h3>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {feature.description}
                </p>

                <ul className="space-y-2">
                  {feature.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-center text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-3" />
                      <span className="text-muted-foreground">{highlight}</span>
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
