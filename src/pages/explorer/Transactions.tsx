import { useNavigate } from "react-router-dom";
import { ArrowRightLeft } from "lucide-react";
import { DataTable } from "@/components/explorer/DataTable";
import { StatusBadge } from "@/components/explorer/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Transaction {
  hash: string;
  block: number;
  from: string;
  to: string;
  gasUsed: number;
  status: "success" | "failed";
  timestamp: string;
}

const columns = [
  {
    key: "hash",
    header: "TX Hash",
    render: (tx: Transaction) => (
      <span className="font-mono text-primary">{tx.hash}</span>
    ),
  },
  {
    key: "block",
    header: "Block",
    render: (tx: Transaction) => (
      <span className="font-mono text-muted-foreground">{tx.block.toLocaleString()}</span>
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

export const Transactions = () => {
  const navigate = useNavigate();

  const handleTxClick = (tx: Transaction) => {
    navigate(`/explorer/transactions/${tx.hash}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
        <p className="text-muted-foreground mt-1">Recent transactions on the network</p>
      </div>

      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={[]}
            onRowClick={handleTxClick}
          />
          <div className="text-center py-8 text-muted-foreground">
            <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions available</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
