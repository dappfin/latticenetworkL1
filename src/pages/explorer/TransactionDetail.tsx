import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/explorer/StatusBadge";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";

export const TransactionDetail = () => {
  const { txHash } = useParams();
  const navigate = useNavigate();

  // Mock data
  const txData = {
    hash: txHash,
    status: "success" as const,
    block: 1847293,
    timestamp: "2024-01-15 14:32:18 UTC",
    from: "0x742d35cc6634c0532925a3b844bc454e4438f44e",
    to: "0x8ba1f109551bd432803012645ac136ddd64dba72",
    value: "0.5 LATT",
    gasUsed: 21000,
    gasPrice: "0.0001 LATT",
    gasLimit: 50000,
    nonce: 42,
    inputData: "0x",
  };

  const logs = [
    { index: 0, address: "0x742d...f44e", topic: "Transfer(address,address,uint256)", data: "0x..." },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/explorer/transactions")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transaction Details</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">{txData.hash}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <StatusBadge status={txData.status} />
      </div>

      {/* Transaction Info */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transaction Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Block</span>
                  <span className="text-sm font-mono text-primary cursor-pointer hover:underline"
                    onClick={() => navigate(`/explorer/blocks/${txData.block}`)}
                  >
                    {txData.block.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Timestamp</span>
                  <span className="text-sm text-foreground">{txData.timestamp}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">From</span>
                  <span className="text-sm font-mono text-foreground break-all">{txData.from}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">To</span>
                  <span className="text-sm font-mono text-foreground break-all">{txData.to}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Value</span>
                  <span className="text-sm font-mono text-foreground">{txData.value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Gas Used</span>
                  <span className="text-sm font-mono text-foreground">{txData.gasUsed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Gas Price</span>
                  <span className="text-sm font-mono text-foreground">{txData.gasPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Nonce</span>
                  <span className="text-sm font-mono text-foreground">{txData.nonce}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input Data */}
      <ExpandableCard
        title="Input Data"
        icon={<FileText className="h-5 w-5 text-primary" />}
        expandLabel="View input data"
        expandedContent={
          <pre className="text-xs font-mono text-muted-foreground bg-secondary/30 p-4 rounded-lg overflow-x-auto">
            {txData.inputData}
          </pre>
        }
      >
        <p className="text-sm text-muted-foreground">
          {txData.inputData === "0x" ? "No input data" : "Contract interaction data"}
        </p>
      </ExpandableCard>

      {/* Logs */}
      <ExpandableCard
        title="Event Logs"
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        expandLabel="View logs"
        expandedContent={
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={i} className="bg-secondary/30 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Log Index</span>
                  <span className="text-xs font-mono text-foreground">{log.index}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Address</span>
                  <span className="text-xs font-mono text-foreground">{log.address}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Topic</span>
                  <span className="text-xs font-mono text-primary">{log.topic}</span>
                </div>
              </div>
            ))}
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {logs.length} event log{logs.length !== 1 ? "s" : ""} emitted
        </p>
      </ExpandableCard>
    </div>
  );
};
