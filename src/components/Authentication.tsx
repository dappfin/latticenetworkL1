import { Shield, Key, CheckCircle, Lock, Workflow, Fingerprint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const authFlow = [
  {
    step: "1",
    icon: Key,
    title: "PQ Master Key Generation",
    description: "Wallet generates quantum-resistant master key using lattice-based cryptography",
    highlight: "Pure PQ keys, no classical fallback"
  },
  {
    step: "2",
    icon: Fingerprint,
    title: "Sign Login Challenge",
    description: "User signs authentication challenge with PQ private key",
    highlight: "Dilithium/Falcon signatures"
  },
  {
    step: "3",
    icon: Workflow,
    title: "Native DAG Verification",
    description: "PQ-DAG consensus nodes verify signature at the base layer",
    highlight: "On-chain verification, no bridges"
  },
  {
    step: "4",
    icon: CheckCircle,
    title: "Authenticated On-Chain",
    description: "User identity verified across entire network natively",
    highlight: "Universal chain-wide authentication"
  },
];

const securityFeatures = [
  {
    icon: Shield,
    label: "No ECDSA",
    description: "Zero classical cryptography"
  },
  {
    icon: Lock,
    label: "No Hybrid",
    description: "Pure quantum resistance"
  },
  {
    icon: CheckCircle,
    label: "PQ-Only Login",
    description: "100% post-quantum authentication"
  },
  {
    icon: Workflow,
    label: "Native DAG Auth",
    description: "Base-layer verification"
  },
];

export const Authentication = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <Badge className="mb-4 text-sm px-4 py-1 bg-primary/20 text-primary border-2 border-primary/40">
            Revolutionary Authentication
          </Badge>
          <h2 className="mb-6 glow-text text-foreground">Pure PQ Authentication</h2>
          <p className="text-xl text-foreground/80 font-medium">
            Native post-quantum identity verified at the consensus layer. No classical keys, no hybrid schemes.
          </p>
        </div>

        {/* Authentication Flow */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {authFlow.map((step, index) => (
              <div key={index} className="relative">
                <Card className="group h-full bg-card/60 backdrop-blur-sm border-2 border-primary/30 hover:border-primary/60 transition-all duration-500 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardContent className="p-6 relative h-full flex flex-col">
                    {/* Step Number Badge */}
                    <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/40">
                      <span className="text-lg font-bold text-primary">{step.step}</span>
                    </div>

                    {/* Icon */}
                    <div className="w-14 h-14 mb-4 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border-2 border-primary/40">
                      <step.icon className="w-7 h-7 text-primary" />
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-foreground mb-3">{step.title}</h3>
                    <p className="text-sm text-foreground/70 mb-4 flex-grow leading-relaxed">
                      {step.description}
                    </p>

                    {/* Highlight */}
                    <div className="mt-auto pt-4 border-t border-primary/20">
                      <p className="text-xs font-semibold text-primary">{step.highlight}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Connector Arrow */}
                {index < authFlow.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <div className="w-6 h-6 rotate-45 border-t-2 border-r-2 border-primary/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Security Guarantees */}
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-bold text-center text-foreground mb-8">Security Guarantees</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {securityFeatures.map((feature, index) => (
              <Card 
                key={index}
                className="bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/30 hover:border-primary/50 transition-all duration-300 backdrop-blur-sm"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-primary/20 flex items-center justify-center border-2 border-primary/40">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-bold text-foreground mb-2">{feature.label}</h4>
                  <p className="text-xs text-foreground/70">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Final Statement */}
          <Card className="bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10 border-2 border-primary/40 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Shield className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-bold text-foreground">Native DAG-Level Authentication</h3>
              </div>
              <p className="text-center text-foreground/80 text-lg font-medium leading-relaxed max-w-3xl mx-auto">
                Users are authenticated everywhere on-chain through the PQ-DAG consensus layer. 
                Every transaction, every interaction, every state transition verified with pure post-quantum signatures. 
                This is the future of blockchain identity.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
