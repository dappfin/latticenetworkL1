import { useState } from "react";
import { FileCode, Search, Hash, Box, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";
import { DataTable } from "@/components/explorer/DataTable";

interface ContractEvent {
  txHash: string;
  event: string;
  timestamp: string;
}

const mockContract = {
  address: "0x8ba1f109551bd432803012645ac136ddd64dba72",
  bytecodeHash: "0x4f3c...8a2d",
  creationBlock: 1234567,
  creationTx: "0x9e8f...7b2c",
  events: [
    { txHash: "0x8a2f...e4b1", event: "Transfer", timestamp: "5m ago" },
    { txHash: "0x7c1e...b2a9", event: "Approval", timestamp: "1h ago" },
    { txHash: "0x6b3d...a1c8", event: "Transfer", timestamp: "2h ago" },
  ] as ContractEvent[],
  bytecode: "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe...",
  abi: [
    { type: "function", name: "transfer", inputs: ["address", "uint256"] },
    { type: "function", name: "approve", inputs: ["address", "uint256"] },
    { type: "event", name: "Transfer", inputs: ["address", "address", "uint256"] },
  ],
};

const eventColumns = [
  {
    key: "txHash",
    header: "TX Hash",
    render: (item: ContractEvent) => (
      <span className="font-mono text-primary">{item.txHash}</span>
    ),
  },
  {
    key: "event",
    header: "Event",
    render: (item: ContractEvent) => (
      <span className="text-foreground">{item.event}</span>
    ),
  },
  {
    key: "timestamp",
    header: "Time",
    render: (item: ContractEvent) => (
      <span className="text-muted-foreground">{item.timestamp}</span>
    ),
  },
];

export const Contracts = () => {
  const [searchAddress, setSearchAddress] = useState("");
  const [contract, setContract] = useState<typeof mockContract | null>(null);

  const handleSearch = () => {
    if (searchAddress) {
      setContract(mockContract);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Contracts</h1>
        <p className="text-muted-foreground mt-1">Inspect smart contract state</p>
      </div>

      {/* Search */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Lookup Contract
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter contract address (0x...)"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              className="font-mono bg-secondary/30 border-border/50"
            />
            <Button onClick={handleSearch}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contract Details */}
      {contract && (
        <>
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <FileCode className="h-5 w-5 text-primary" />
                Contract Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Contract Address</span>
                  <span className="text-sm font-mono text-foreground break-all">{contract.address}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground">Bytecode Hash</span>
                      <p className="text-sm font-mono text-foreground">{contract.bytecodeHash}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Box className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground">Creation Block</span>
                      <p className="text-sm font-mono text-foreground">{contract.creationBlock.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground">Creation TX</span>
                      <p className="text-sm font-mono text-primary">{contract.creationTx}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events */}
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Events Emitted</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={eventColumns} data={contract.events} />
            </CardContent>
          </Card>

          {/* Contract Internals */}
          <ExpandableCard
            title="Contract Internals"
            icon={<FileCode className="h-5 w-5 text-primary" />}
            expandLabel="View contract internals"
            expandedContent={
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">ABI Functions</p>
                  <div className="space-y-2">
                    {contract.abi.map((item, i) => (
                      <div key={i} className="bg-secondary/30 p-2 rounded text-xs font-mono">
                        <span className="text-primary">{item.type}</span>{" "}
                        <span className="text-foreground">{item.name}</span>
                        {item.inputs && (
                          <span className="text-muted-foreground">({item.inputs.join(", ")})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Bytecode (truncated)</p>
                  <pre className="text-xs font-mono text-muted-foreground bg-secondary/30 p-4 rounded-lg overflow-x-auto">
                    {contract.bytecode}
                  </pre>
                </div>
              </div>
            }
          >
            <p className="text-sm text-muted-foreground">
              View ABI and bytecode details
            </p>
          </ExpandableCard>
        </>
      )}

      {!contract && (
        <div className="text-center py-12 text-muted-foreground">
          <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Enter a contract address to view details</p>
        </div>
      )}
    </div>
  );
};
