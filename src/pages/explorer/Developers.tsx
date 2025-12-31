import { Code, Globe, Terminal, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";

const rpcEndpoints = [
  { name: "Primary RPC", url: "https://rpc.lattice.network" },
  { name: "WebSocket", url: "wss://ws.lattice.network" },
  { name: "Archive Node", url: "https://archive.lattice.network" },
];

const supportedMethods = [
  "eth_blockNumber",
  "eth_getBalance",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_call",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_chainId",
  "eth_getLogs",
  "eth_getCode",
  "net_version",
  "web3_clientVersion",
];

const rateLimits = {
  requestsPerSecond: 100,
  requestsPerDay: 100000,
  batchLimit: 50,
};

const exampleCurl = `curl -X POST https://rpc.lattice.network \\
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
          <div className="space-y-3">
            {rpcEndpoints.map((endpoint, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{endpoint.name}</p>
                  <p className="text-sm font-mono text-muted-foreground">{endpoint.url}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(endpoint.url)}
                >
                  Copy
                </Button>
              </div>
            ))}
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
              <p className="text-lg font-mono text-foreground">{rateLimits.requestsPerSecond}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Requests/Day</p>
              <p className="text-lg font-mono text-foreground">{rateLimits.requestsPerDay.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Batch Limit</p>
              <p className="text-lg font-mono text-foreground">{rateLimits.batchLimit}</p>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {supportedMethods.map((method, i) => (
              <span
                key={i}
                className="px-2 py-1.5 bg-secondary/50 rounded text-xs font-mono text-foreground"
              >
                {method}
              </span>
            ))}
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {supportedMethods.length} standard Ethereum JSON-RPC methods supported
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
