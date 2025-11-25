import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const TechnicalDiagram = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="mb-6 glow-text text-foreground">Technical Architecture</h2>
          <p className="text-xl text-foreground/90 font-medium">
            Deep dive into the core technologies powering Lattice Network
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="dag" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-card/60 border-2 border-primary/30 mb-8">
              <TabsTrigger 
                value="dag"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-bold"
              >
                BlockDAG
              </TabsTrigger>
              <TabsTrigger 
                value="pqc"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-bold"
              >
                Post-Quantum
              </TabsTrigger>
              <TabsTrigger 
                value="evm"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-bold"
              >
                EVM Layer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dag">
              <Card className="bg-card/60 backdrop-blur-sm border-2 border-primary/30">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-foreground font-bold mb-4">BlockDAG Consensus Architecture</h3>
                      <div className="bg-background/50 rounded-xl p-8 border-2 border-primary/20">
                        <div className="grid grid-cols-3 gap-4 mb-8">
                          <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                            <div className="text-sm font-bold text-primary mb-2">Block A</div>
                            <div className="text-xs text-foreground/60 font-medium">Height: 100</div>
                          </div>
                          <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                            <div className="text-sm font-bold text-primary mb-2">Block B</div>
                            <div className="text-xs text-foreground/60 font-medium">Height: 100</div>
                          </div>
                          <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                            <div className="text-sm font-bold text-primary mb-2">Block C</div>
                            <div className="text-xs text-foreground/60 font-medium">Height: 101</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="inline-block p-4 bg-primary/20 rounded-lg border-2 border-primary/40 glow-border">
                            <div className="text-sm font-bold text-primary">Block D (references A, B, C)</div>
                            <div className="text-xs text-foreground/80 mt-2 font-medium">Parallel consensus + DAG ordering</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-6 bg-background/30 rounded-lg border border-primary/20">
                        <h4 className="font-bold text-foreground mb-3">Key Benefits</h4>
                        <ul className="space-y-2 text-sm text-foreground/80 font-medium">
                          <li>• Parallel block creation</li>
                          <li>• 1M+ TPS capacity</li>
                          <li>• Sub-second finality</li>
                          <li>• No chain bottleneck</li>
                        </ul>
                      </div>
                      <div className="p-6 bg-background/30 rounded-lg border border-primary/20">
                        <h4 className="font-bold text-foreground mb-3">How It Works</h4>
                        <ul className="space-y-2 text-sm text-foreground/80 font-medium">
                          <li>• Blocks reference multiple parents</li>
                          <li>• Topological ordering via DAG</li>
                          <li>• Conflict resolution via timestamps</li>
                          <li>• Byzantine fault tolerance</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pqc">
              <Card className="bg-card/60 backdrop-blur-sm border-2 border-primary/30">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-foreground font-bold mb-4">Post-Quantum Cryptography</h3>
                      <div className="bg-background/50 rounded-xl p-8 border-2 border-primary/20">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="text-center p-6 bg-primary/10 rounded-lg border-2 border-primary/30">
                            <div className="text-lg font-bold text-primary mb-2">Dilithium</div>
                            <div className="text-xs text-foreground/60 mb-4 font-medium">NIST Selected Algorithm</div>
                            <div className="text-sm text-foreground/80 font-medium">
                              Lattice-based digital signatures resistant to quantum attacks
                            </div>
                          </div>
                          <div className="text-center p-6 bg-accent/10 rounded-lg border-2 border-accent/30">
                            <div className="text-lg font-bold text-accent mb-2">Falcon</div>
                            <div className="text-xs text-foreground/60 mb-4 font-medium">NIST Finalist</div>
                            <div className="text-sm text-foreground/80 font-medium">
                              Compact signatures for efficient verification
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-6 bg-background/30 rounded-lg border border-primary/20">
                        <h4 className="font-bold text-foreground mb-3">Quantum Threat</h4>
                        <p className="text-sm text-foreground/80 font-medium">
                          Current ECDSA/RSA vulnerable to quantum computers. Shor's algorithm can break in polynomial time.
                        </p>
                      </div>
                      <div className="p-6 bg-background/30 rounded-lg border border-primary/20">
                        <h4 className="font-bold text-foreground mb-3">PQ Solution</h4>
                        <p className="text-sm text-foreground/80 font-medium">
                          Lattice-based cryptography remains secure even against quantum adversaries. NIST standardized.
                        </p>
                      </div>
                      <div className="p-6 bg-background/30 rounded-lg border border-primary/20">
                        <h4 className="font-bold text-foreground mb-3">Implementation</h4>
                        <p className="text-sm text-foreground/80 font-medium">
                          Native PQ signatures at protocol level. All validators use Dilithium or Falcon.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evm">
              <Card className="bg-card/60 backdrop-blur-sm border-2 border-primary/30">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-foreground font-bold mb-4">EVM Compatibility Layer</h3>
                      <div className="bg-background/50 rounded-xl p-8 border-2 border-primary/20">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between gap-8">
                            <div className="flex-1 text-center p-4 bg-muted/20 rounded-lg border border-primary/20">
                              <div className="text-sm font-bold text-foreground mb-2">Solidity Contracts</div>
                              <div className="text-xs text-foreground/60 font-medium">Existing dApps</div>
                            </div>
                            <div className="text-primary font-bold">→</div>
                            <div className="flex-1 text-center p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                              <div className="text-sm font-bold text-primary mb-2">Lattice EVM</div>
                              <div className="text-xs text-foreground/60 font-medium">PQ Translation</div>
                            </div>
                            <div className="text-primary font-bold">→</div>
                            <div className="flex-1 text-center p-4 bg-primary/20 rounded-lg border-2 border-primary/40 glow-border">
                              <div className="text-sm font-bold text-primary mb-2">BlockDAG Execution</div>
                              <div className="text-xs text-foreground/60 font-medium">Quantum-Secure</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-6 bg-background/30 rounded-lg border border-primary/20">
                        <h4 className="font-bold text-foreground mb-3">Backwards Compatible</h4>
                        <ul className="space-y-2 text-sm text-foreground/80 font-medium">
                          <li>• Deploy existing Solidity code</li>
                          <li>• MetaMask & wallet support</li>
                          <li>• Ethereum tooling works</li>
                          <li>• Standard RPC interface</li>
                        </ul>
                      </div>
                      <div className="p-6 bg-background/30 rounded-lg border border-primary/20">
                        <h4 className="font-bold text-foreground mb-3">Enhanced Security</h4>
                        <ul className="space-y-2 text-sm text-foreground/80 font-medium">
                          <li>• PQ signatures under the hood</li>
                          <li>• Merkle state witnesses</li>
                          <li>• DAG parallel execution</li>
                          <li>• Future-proof cryptography</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};
