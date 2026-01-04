import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const roadmapItems = [
  {
    quarter: "Q4 2024",
    title: "Foundation & Research",
    status: "completed",
    items: [
      "PQ cryptography research complete",
      "BlockDAG consensus design finalized",
      "EVM compatibility architecture",
      "Initial testnet deployed",
    ],
  },
  {
    quarter: "Q1 2025",
    title: "Protocol Development",
    status: "completed",
    items: [
      "Dilithium & Falcon signature implementation",
      "PQ transaction format finalized",
      "Lattice node software v1.0",
      "Internal security audit",
    ],
  },
  {
    quarter: "Q2 2025",
    title: "Public Testnet",
    status: "current",
    items: [
      "Public testnet launch",
      "Developer SDK & documentation",
      "Community validator program",
      "Bug bounty program initiated",
    ],
  },
  {
    quarter: "Q3 2025",
    title: "Ecosystem Growth",
    status: "upcoming",
    items: [
      "Third-party security audits",
      "Strategic partnerships announced",
      "Testnet stress testing",
      "Developer grant program",
    ],
  },
  {
    quarter: "Q4 2025",
    title: "Mainnet Preparation",
    status: "upcoming",
    items: [
      "Mainnet release candidate",
      "Economic model finalization",
      "Genesis validator onboarding",
      "Final security reviews",
    ],
  },
  {
    quarter: "Q1 2026",
    title: "Mainnet Launch 🚀",
    status: "upcoming",
    items: [
      "Official mainnet deployment",
      "Token generation event",
      "Exchange listings",
      "Full ecosystem activation",
    ],
  },
];

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: "text-primary",
    bg: "bg-primary/20",
    border: "border-primary/40",
  },
  current: {
    icon: Clock,
    color: "text-accent",
    bg: "bg-accent/20",
    border: "border-accent/40",
  },
  upcoming: {
    icon: Circle,
    color: "text-foreground/40",
    bg: "bg-card/40",
    border: "border-primary/20",
  },
};

export const Roadmap = () => {
  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto px-6 relative">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="mb-6 glow-text text-foreground">Road to Mainnet</h2>
          <p className="text-xl text-foreground/90 font-medium">
            Our journey to becoming the world's first quantum-secure BlockDAG network
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmapItems.map((item, idx) => {
              const config = statusConfig[item.status as keyof typeof statusConfig];
              const Icon = config.icon;
              
              return (
                <Card
                  key={idx}
                  className={`group relative ${config.bg} backdrop-blur-sm border-2 ${config.border} hover:border-primary/60 transition-all duration-300`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-primary">
                        {item.quarter}
                      </span>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    <h3 className="mb-4 text-foreground font-bold">
                      {item.title}
                    </h3>

                    <ul className="space-y-2">
                      {item.items.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full mt-2 ${item.status === 'completed' ? 'bg-primary' : 'bg-foreground/40'}`} />
                          <span className="text-sm text-foreground/80 font-medium">
                            {detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
