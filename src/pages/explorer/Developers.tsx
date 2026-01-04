import { Code, Globe, Terminal, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";

const exampleCurl = `curl -X POST <RPC_ENDPOINT> \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
  }'`;

export const Developers = () => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Developers</h1>
        <p className="text-muted-foreground mt-1">RPC endpoints and developer resources</p>
      </div>

      {/* RPC Endpoints */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            RPC Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No endpoints configured
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Rate Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Requests/Second</p>
              <p className="text-lg font-mono text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Requests/Day</p>
              <p className="text-lg font-mono text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Batch Limit</p>
              <p className="text-lg font-mono text-foreground">—</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported Methods */}
      <ExpandableCard
        title="Supported JSON-RPC Methods"
        icon={<Code className="h-5 w-5 text-primary" />}
        expandLabel="View all methods"
        expandedContent={
          <div className="text-sm text-muted-foreground">
            No methods configured
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Standard Ethereum JSON-RPC methods
        </p>
      </ExpandableCard>

      {/* Example Request */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Example Request
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(exampleCurl)}
            >
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono text-muted-foreground bg-secondary/30 p-4 rounded-lg overflow-x-auto">
            {exampleCurl}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};
