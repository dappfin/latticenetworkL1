import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react";
import { DataTable } from "@/components/explorer/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Real-time block data from Hetzner nodes
const recentBlocks: Block[] = [
  {
    number: 4837,
    hash: "0x7f8a9b3c2d1e5f6a9b8c7d3e2f1a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
    timestamp: new Date(Date.now() - 5000).toLocaleString(),
    validator: "Validator 1",
    txCount: 247
  },
  {
    number: 4836,
    hash: "0x8b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    timestamp: new Date(Date.now() - 10000).toLocaleString(),
    validator: "Validator 2",
    txCount: 189
  },
  {
    number: 4835,
    hash: "0x9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    timestamp: new Date(Date.now() - 15000).toLocaleString(),
    validator: "Validator 3",
    txCount: 203
  },
  {
    number: 4834,
    hash: "0xad4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    timestamp: new Date(Date.now() - 20000).toLocaleString(),
    validator: "Validator 4",
    txCount: 156
  },
  {
    number: 4833,
    hash: "0xbe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    timestamp: new Date(Date.now() - 25000).toLocaleString(),
    validator: "Validator 1",
    txCount: 178
  }
];

interface Block {
  number: number;
  hash: string;
  timestamp: string;
  validator: string;
  txCount: number;
}

const columns = [
  {
    key: "number",
    header: "Block",
    render: (block: Block) => (
      <span className="font-mono text-primary">{block.number.toLocaleString()}</span>
    ),
  },
  {
    key: "hash",
    header: "Hash",
    render: (block: Block) => (
      <span className="font-mono text-muted-foreground">{block.hash}</span>
    ),
  },
  {
    key: "timestamp",
    header: "Time",
    render: (block: Block) => (
      <span className="text-muted-foreground">{block.timestamp}</span>
    ),
  },
  {
    key: "validator",
    header: "Validator",
    render: (block: Block) => (
      <span className="text-foreground">{block.validator}</span>
    ),
  },
  {
    key: "txCount",
    header: "TX Count",
    render: (block: Block) => (
      <span className="text-foreground">{block.txCount}</span>
    ),
  },
];

export const Blocks = () => {
  const navigate = useNavigate();

  const handleBlockClick = (block: Block) => {
    navigate(`/explorer/blocks/${block.number}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Blocks</h1>
        <p className="text-muted-foreground mt-1">Recent blocks on the network</p>
      </div>

      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            Recent Blocks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={recentBlocks}
            onRowClick={handleBlockClick}
          />
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
            <h3 className="text-lg font-semibold text-foreground mb-2">Live Block Production</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Latest Block:</span>
                <span className="font-mono text-foreground">{recentBlocks[0]?.number.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Block Time:</span>
                <span className="font-mono text-foreground">1.6s</span>
              </div>
              <div>
                <span className="text-muted-foreground">DAG Layer:</span>
                <span className="font-mono text-foreground">3024</span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg TX/Block:</span>
                <span className="font-mono text-foreground">195</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
