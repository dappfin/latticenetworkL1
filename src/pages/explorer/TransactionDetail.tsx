import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";

export const TransactionDetail = () => {
  const { txHash } = useParams();
  const navigate = useNavigate();

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
          <p className="text-muted-foreground mt-1 font-mono text-sm">{txHash}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <span className="text-sm text-foreground">—</span>
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
                  <span className="text-sm font-mono text-foreground">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Timestamp</span>
                  <span className="text-sm text-foreground">—</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">From</span>
                  <span className="text-sm font-mono text-foreground">—</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">To</span>
                  <span className="text-sm font-mono text-foreground">—</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Value</span>
                  <span className="text-sm font-mono text-foreground">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Gas Used</span>
                  <span className="text-sm font-mono text-foreground">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Gas Price</span>
                  <span className="text-sm font-mono text-foreground">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Nonce</span>
                  <span className="text-sm font-mono text-foreground">—</span>
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
            No data available
          </pre>
        }
      >
        <p className="text-sm text-muted-foreground">
          No input data
        </p>
      </ExpandableCard>

      {/* Logs */}
      <ExpandableCard
        title="Event Logs"
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        expandLabel="View logs"
        expandedContent={
          <div className="text-sm text-muted-foreground">
            No logs available
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          0 event logs emitted
        </p>
      </ExpandableCard>
    </div>
  );
};
