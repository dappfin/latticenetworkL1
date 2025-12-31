import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react";
import { DataTable } from "@/components/explorer/DataTable";
import { StatusBadge } from "@/components/explorer/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Block {
  number: number;
  hash: string;
  timestamp: string;
  validator: string;
  txCount: number;
  finality: "soft" | "hard";
}

// Mock data
const mockBlocks: Block[] = Array.from({ length: 20 }, (_, i) => ({
  number: 1847293 - i,
  hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
  timestamp: `${i * 2 + 2}s ago`,
  validator: `Validator-${Math.floor(Math.random() * 52) + 1}`,
  txCount: Math.floor(Math.random() * 50) + 1,
  finality: i > 5 ? "hard" : "soft",
}));

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
  {
    key: "finality",
    header: "Finality",
    render: (block: Block) => <StatusBadge status={block.finality} />,
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
            data={mockBlocks}
            onRowClick={handleBlockClick}
          />
        </CardContent>
      </Card>
    </div>
  );
};
