import { Globe, Server, Database, Cpu } from "lucide-react";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";
import { StatusBadge } from "@/components/explorer/StatusBadge";

const networkInfo = {
  nodeVersion: "v1.2.4-stable",
  genesisHash: "0x8a2f...e4b1",
  rpcEndpoints: [
    { url: "https://rpc.lattice.network", status: "healthy" as const },
    { url: "https://rpc-backup.lattice.network", status: "healthy" as const },
  ],
  indexerStatus: "healthy" as const,
  evmStatus: "healthy" as const,
};

const technicalParams = {
  p2pPort: 30303,
  rpcPort: 8545,
  wsPort: 8546,
  maxPeers: 50,
  currentPeers: 42,
  syncMode: "Full",
  dbBackend: "LevelDB",
  networkProtocol: "devp2p",
};

export const Network = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Network</h1>
        <p className="text-muted-foreground mt-1">Network inspection and status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Node Info */}
        <ExpandableCard
          title="Node Information"
          icon={<Server className="h-5 w-5 text-primary" />}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Node Version</span>
              <span className="text-sm font-mono text-foreground">{networkInfo.nodeVersion}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Genesis Hash</span>
              <span className="text-sm font-mono text-foreground">{networkInfo.genesisHash}</span>
            </div>
          </div>
        </ExpandableCard>

        {/* RPC Endpoints */}
        <ExpandableCard
          title="RPC Endpoints"
          icon={<Globe className="h-5 w-5 text-primary" />}
        >
          <div className="space-y-3">
            {networkInfo.rpcEndpoints.map((endpoint, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm font-mono text-foreground">{endpoint.url}</span>
                <StatusBadge status={endpoint.status} />
              </div>
            ))}
          </div>
        </ExpandableCard>

        {/* Indexer Status */}
        <ExpandableCard
          title="Indexer Status"
          icon={<Database className="h-5 w-5 text-primary" />}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={networkInfo.indexerStatus} />
          </div>
        </ExpandableCard>

        {/* EVM Status */}
        <ExpandableCard
          title="Execution Engine (EVM)"
          icon={<Cpu className="h-5 w-5 text-primary" />}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={networkInfo.evmStatus} />
          </div>
        </ExpandableCard>
      </div>

      {/* Technical Parameters */}
      <ExpandableCard
        title="Technical Parameters"
        icon={<Server className="h-5 w-5 text-primary" />}
        expandLabel="Show technical parameters"
        expandedContent={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">P2P Port</p>
              <p className="text-sm font-mono text-foreground">{technicalParams.p2pPort}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">RPC Port</p>
              <p className="text-sm font-mono text-foreground">{technicalParams.rpcPort}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WebSocket Port</p>
              <p className="text-sm font-mono text-foreground">{technicalParams.wsPort}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Peers</p>
              <p className="text-sm font-mono text-foreground">{technicalParams.maxPeers}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Peers</p>
              <p className="text-sm font-mono text-foreground">{technicalParams.currentPeers}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sync Mode</p>
              <p className="text-sm font-mono text-foreground">{technicalParams.syncMode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DB Backend</p>
              <p className="text-sm font-mono text-foreground">{technicalParams.dbBackend}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Network Protocol</p>
              <p className="text-sm font-mono text-foreground">{technicalParams.networkProtocol}</p>
            </div>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          View detailed technical network parameters and configuration.
        </p>
      </ExpandableCard>
    </div>
  );
};
