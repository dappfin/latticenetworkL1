import { Shield, Network, Database, Cpu, Blocks, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const architectureCategories = [
  {
    icon: Blocks,
    title: "Consensus Layer",
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/40",
    features: [
      {
        name: "BlockDAG Consensus",
        description: "Modified BlockDAG consensus optimized for post-quantum signature verification",
        status: "core"
      },
      {
        name: "PQ Validator Identities",
        description: "Native post-quantum cryptographic keys for all validator nodes",
        status: "core"
      },
      {
        name: "Native PQ Verifier",
        description: "Built-in verification engine for lattice-based signatures in consensus rules",
        status: "core"
      },
    ],
  },
  {
    icon: Shield,
    title: "Security & Cryptography",
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/40",
    features: [
      {
        name: "PQ Transaction Pool",
        description: "Mempool designed to handle quantum-resistant transaction signatures efficiently",
        status: "core"
      },
      {
        name: "State Transition Function",
        description: "State machine using post-quantum authentication for all transitions",
        status: "core"
      },
      {
        name: "PQ Gossip Protocol",
        description: "Network protocol optimized for propagating large PQ signatures",
        status: "core"
      },
    ],
  },
  {
    icon: Database,
    title: "Storage & State",
    color: "from-green-500/20 to-emerald-500/20",
    borderColor: "border-green-500/40",
    features: [
      {
        name: "Ledger Format",
        description: "Updated blockchain ledger structure supporting extended PQ key lengths",
        status: "core"
      },
      {
        name: "Genesis Block",
        description: "Genesis block initialized with post-quantum validator set",
        status: "core"
      },
      {
        name: "State Merkle Trees",
        description: "Optimized state trees for efficient verification with PQ signatures",
        status: "enhanced"
      },
    ],
  },
  {
    icon: Network,
    title: "Network Layer",
    color: "from-orange-500/20 to-amber-500/20",
    borderColor: "border-orange-500/40",
    features: [
      {
        name: "Network Optimizations",
        description: "Bandwidth and latency optimizations for large post-quantum signatures",
        status: "core"
      },
      {
        name: "P2P Communication",
        description: "Peer-to-peer protocol supporting efficient PQ message propagation",
        status: "core"
      },
      {
        name: "Block Propagation",
        description: "Optimized block relay minimizing overhead from PQ signatures",
        status: "enhanced"
      },
    ],
  },
  {
    icon: Cpu,
    title: "Node Infrastructure",
    color: "from-red-500/20 to-rose-500/20",
    borderColor: "border-red-500/40",
    features: [
      {
        name: "Full Node Support",
        description: "Complete implementation for full validation nodes with PQ capabilities",
        status: "core"
      },
      {
        name: "Light Client Support",
        description: "Lightweight client supporting secure SPV with quantum-resistant proofs",
        status: "core"
      },
      {
        name: "Validator Node",
        description: "Production-ready validator software with PQ key management",
        status: "core"
      },
    ],
  },
  {
    icon: Code,
    title: "Developer Tooling",
    color: "from-indigo-500/20 to-violet-500/20",
    borderColor: "border-indigo-500/40",
    features: [
      {
        name: "CLI Tools",
        description: "Command-line interface for node management and PQ key operations",
        status: "enhanced"
      },
      {
        name: "RPC Interface",
        description: "JSON-RPC API supporting quantum-resistant transaction submission",
        status: "core"
      },
      {
        name: "SDK Libraries",
        description: "Developer SDKs for multiple languages with PQ signature support",
        status: "enhanced"
      },
    ],
  },
];

const statusConfig = {
  core: { label: "Core", className: "bg-primary/20 text-primary border-primary/40" },
  enhanced: { label: "Enhanced", className: "bg-secondary/20 text-secondary-foreground border-secondary/40" },
};

export const Architecture = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="mb-6 glow-text text-foreground">Technical Architecture</h2>
          <p className="text-xl text-foreground/80 font-medium">
            Comprehensive quantum-resistant blockchain infrastructure from keys to consensus
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {architectureCategories.map((category, index) => (
            <Card 
              key={index}
              className="group relative bg-card/60 backdrop-blur-sm border-2 hover:border-primary/60 transition-all duration-500 overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <CardHeader className="relative pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border-2 ${category.borderColor}`}>
                    <category.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg text-foreground">{category.title}</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="relative space-y-4">
                {category.features.map((feature, i) => (
                  <div 
                    key={i}
                    className="p-3 rounded-lg bg-background/40 border border-border/40 hover:border-primary/40 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-foreground">{feature.name}</h4>
                      <Badge variant="outline" className={`text-xs ${statusConfig[feature.status as keyof typeof statusConfig].className}`}>
                        {statusConfig[feature.status as keyof typeof statusConfig].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30 backdrop-blur-sm">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-4 text-center">Complete L1 Chain Security</h3>
              <p className="text-center text-foreground/80 text-lg font-medium leading-relaxed">
                Every layer is quantum-safe: from validator keys and account addresses to transactions, 
                consensus rules, and state transitions. A truly post-quantum blockchain from genesis to execution.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
