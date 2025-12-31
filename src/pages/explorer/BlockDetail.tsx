import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Box, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/explorer/StatusBadge";
import { DataTable } from "@/components/explorer/DataTable";

interface Transaction {
  hash: string;
  from: string;
  to: string;
  gasUsed: number;
  status: "success" | "failed";
}

// Mock data
const mockTransactions: Transaction[] = Array.from({ length: 8 }, (_, i) => ({
  hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
  from: `0x${Math.random().toString(16).slice(2, 10)}...`,
  to: `0x${Math.random().toString(16).slice(2, 10)}...`,
  gasUsed: Math.floor(Math.random() * 100000) + 21000,
  status: Math.random() > 0.1 ? "success" : "failed",
}));

const txColumns = [
  {
    key: "hash",
    header: "TX Hash",
    render: (tx: Transaction) => (
      <span className="font-mono text-primary">{tx.hash}</span>
    ),
  },
  {
    key: "from",
    header: "From",
    render: (tx: Transaction) => (
      <span className="font-mono text-muted-foreground">{tx.from}</span>
    ),
  },
  {
    key: "to",
    header: "To",
    render: (tx: Transaction) => (
      <span className="font-mono text-muted-foreground">{tx.to}</span>
    ),
  },
  {
    key: "gasUsed",
    header: "Gas Used",
    render: (tx: Transaction) => (
      <span className="text-foreground">{tx.gasUsed.toLocaleString()}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (tx: Transaction) => <StatusBadge status={tx.status} />,
  },
];

export const BlockDetail = () => {
  const { blockNumber } = useParams();
  const navigate = useNavigate();

  const blockData = {
    number: Number(blockNumber),
    hash: "0x8a2f7b9c...e4b1d3a2",
    parentHash: "0x7c1e8d4f...b2a9c7e1",
    timestamp: "2024-01-15 14:32:18 UTC",
    validator: "Validator-23",
    txCount: mockTransactions.length,
    gasUsed: 847293,
    gasLimit: 15000000,
    finality: "hard" as const,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/explorer/blocks")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Block #{blockData.number.toLocaleString()}</h1>
          <p className="text-muted-foreground mt-1">Block details and transactions</p>
        </div>
      </div>

      {/* Block Info */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            Block Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Block Hash</span>
                <span className="text-sm font-mono text-foreground">{blockData.hash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Parent Hash</span>
                <span className="text-sm font-mono text-foreground">{blockData.parentHash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Timestamp</span>
                <span className="text-sm text-foreground">{blockData.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Validator</span>
                <span className="text-sm text-foreground">{blockData.validator}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Transactions</span>
                <span className="text-sm text-foreground">{blockData.txCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gas Used</span>
                <span className="text-sm font-mono text-foreground">
                  {blockData.gasUsed.toLocaleString()} ({((blockData.gasUsed / blockData.gasLimit) * 100).toFixed(2)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gas Limit</span>
                <span className="text-sm font-mono text-foreground">{blockData.gasLimit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Finality</span>
                <StatusBadge status={blockData.finality} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transactions ({blockData.txCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={txColumns}
            data={mockTransactions}
            onRowClick={(tx) => navigate(`/explorer/transactions/${tx.hash}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
};
