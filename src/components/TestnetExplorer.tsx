import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Blocks, Clock } from "lucide-react";

const mockBlocks = [
  { height: 1284567, hash: "0xd4f3...a8c2", txs: 47, validator: "Dilithium-Node-01", time: "12s ago" },
  { height: 1284566, hash: "0x8b2e...f1d9", txs: 38, validator: "Falcon-Node-07", time: "24s ago" },
  { height: 1284565, hash: "0x3c7a...e4b6", txs: 52, validator: "Dilithium-Node-03", time: "36s ago" },
  { height: 1284564, hash: "0x9f1b...c3d8", txs: 41, validator: "Falcon-Node-12", time: "48s ago" },
];

const mockTxs = [
  { hash: "0xa7c4...2b9f", type: "PQ Transfer", status: "Confirmed", dag_refs: 3 },
  { hash: "0x5e8d...f3a1", type: "Smart Contract", status: "Confirmed", dag_refs: 2 },
  { hash: "0xb3f9...6c8e", type: "PQ Transfer", status: "Pending", dag_refs: 4 },
];

export const TestnetExplorer = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <div className="mb-8">
            <Badge className="text-sm font-bold bg-primary/20 text-primary border-2 border-primary/40 px-4 py-2">
              <Network className="w-4 h-4 mr-2 inline" />
              Testnet Explorer
            </Badge>
          </div>
          <h2 className="mb-6 glow-text text-foreground">Live Network Activity</h2>
          <p className="text-xl text-foreground/90 font-medium">
            Real-time view of Lattice Testnet with PQ signatures and BlockDAG consensus
          </p>
        </div>

        <div className="max-w-7xl mx-auto space-y-8">
          {/* Recent Blocks */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Blocks className="w-6 h-6 text-primary" />
              <h3 className="text-foreground font-bold">Recent Blocks</h3>
            </div>
            <div className="space-y-4">
              {mockBlocks.map((block, idx) => (
                <Card key={idx} className="bg-card/60 backdrop-blur-sm border-2 border-primary/30 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div>
                        <div className="text-sm text-foreground/60 font-medium mb-1">Height</div>
                        <div className="text-lg font-black text-primary glow-text">
                          #{block.height}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-sm text-foreground/60 font-medium mb-1">Block Hash</div>
                        <div className="text-foreground/90 font-mono text-sm font-bold">{block.hash}</div>
                      </div>
                      <div>
                        <div className="text-sm text-foreground/60 font-medium mb-1">Validator</div>
                        <div className="text-foreground/90 text-sm font-bold">{block.validator}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-foreground/60 font-medium mb-1">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {block.time}
                        </div>
                        <Badge className="bg-primary/20 text-primary border border-primary/40 font-bold">
                          {block.txs} txs
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-6 h-6 text-primary" />
              <h3 className="text-foreground font-bold">Recent Transactions</h3>
            </div>
            <div className="space-y-4">
              {mockTxs.map((tx, idx) => (
                <Card key={idx} className="bg-card/60 backdrop-blur-sm border-2 border-primary/30 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div className="md:col-span-2">
                        <div className="text-sm text-foreground/60 font-medium mb-1">Transaction Hash</div>
                        <div className="text-foreground/90 font-mono text-sm font-bold">{tx.hash}</div>
                      </div>
                      <div>
                        <div className="text-sm text-foreground/60 font-medium mb-1">Type</div>
                        <Badge className="bg-accent/20 text-accent border border-accent/40 font-bold">
                          {tx.type}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-foreground/60 font-medium mb-1">Status</div>
                        <Badge className={tx.status === "Confirmed" ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted/50 text-muted-foreground border border-muted"}>
                          {tx.status}
                        </Badge>
                        <div className="text-xs text-foreground/60 mt-1 font-medium">
                          {tx.dag_refs} DAG refs
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
