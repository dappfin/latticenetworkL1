import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Box, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/explorer/DataTable";

interface Transaction {
  hash: string;
  from: string;
  to: string;
  gasUsed: number;
}

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
];

export const BlockDetail = () => {
  const { blockNumber } = useParams();
  const navigate = useNavigate();

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
          <h1 className="text-2xl font-semibold text-foreground">Block #{blockNumber}</h1>
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
                <span className="text-sm font-mono text-foreground">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Parent Hash</span>
                <span className="text-sm font-mono text-foreground">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Timestamp</span>
                <span className="text-sm text-foreground">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Validator</span>
                <span className="text-sm text-foreground">—</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Transactions</span>
                <span className="text-sm text-foreground">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gas Used</span>
                <span className="text-sm font-mono text-foreground">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gas Limit</span>
                <span className="text-sm font-mono text-foreground">—</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Finality</span>
                <span className="text-sm text-foreground">—</span>
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
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={txColumns}
            data={[]}
            onRowClick={(tx) => navigate(`/explorer/transactions/${tx.hash}`)}
          />
          <div className="text-center py-8 text-muted-foreground">
            <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions in this block</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
