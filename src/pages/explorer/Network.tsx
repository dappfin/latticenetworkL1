import { Globe, Server, Database, Cpu, Zap, Shield } from "lucide-react";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";
import { StatusBadge } from "@/components/explorer/StatusBadge";

// Real-time network configuration
const networkConfig = {
  nodeVersion: "v1.0.0",
  genesisHash: "0x8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
  rpcEndpoints: [
    "http://77.42.84.199:8545",
    "http://157.180.81.129:8545"
  ],
  indexerStatus: "active",
  evmStatus: "active",
  p2pPort: "26656",
  rpcPort: "8545",
  wsPort: "8546",
  maxPeers: "50",
  currentPeers: "8",
  syncMode: "full",
  dbBackend: "LevelDB",
  networkProtocol: "Lattice L1 v1.0"
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
              <span className="text-sm font-mono text-foreground">{networkConfig.nodeVersion}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Genesis Hash</span>
              <span className="text-sm font-mono text-foreground">{networkConfig.genesisHash.slice(0, 20)}...</span>
            </div>
          </div>
        </ExpandableCard>

        {/* RPC Endpoints */}
        <ExpandableCard
          title="RPC Endpoints"
          icon={<Globe className="h-5 w-5 text-primary" />}
        >
          <div className="space-y-2">
            {networkConfig.rpcEndpoints.map((endpoint, index) => (
              <div key={index} className="p-2 rounded bg-background/50 border">
                <span className="text-sm font-mono text-foreground">{endpoint}</span>
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
            <StatusBadge status="active" />
          </div>
        </ExpandableCard>

        {/* EVM Status */}
        <ExpandableCard
          title="Execution Engine (EVM)"
          icon={<Cpu className="h-5 w-5 text-primary" />}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status="active" />
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
              <p className="text-sm font-mono text-foreground">{networkConfig.p2pPort}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">RPC Port</p>
              <p className="text-sm font-mono text-foreground">{networkConfig.rpcPort}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WebSocket Port</p>
              <p className="text-sm font-mono text-foreground">{networkConfig.wsPort}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Peers</p>
              <p className="text-sm font-mono text-foreground">{networkConfig.maxPeers}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Peers</p>
              <p className="text-sm font-mono text-foreground">{networkConfig.currentPeers}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sync Mode</p>
              <p className="text-sm font-mono text-foreground">{networkConfig.syncMode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DB Backend</p>
              <p className="text-sm font-mono text-foreground">{networkConfig.dbBackend}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Network Protocol</p>
              <p className="text-sm font-mono text-foreground">{networkConfig.networkProtocol}</p>
            </div>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          View detailed technical network parameters and configuration.
        </p>
      </ExpandableCard>

      {/* Network Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpandableCard
          title="Post-Quantum Security"
          icon={<Shield className="h-5 w-5 text-primary" />}
          expandLabel="View PQ security details"
          expandedContent={
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Algorithm:</span>
                <span className="text-sm font-mono text-purple-400">CRYSTALS-Dilithium</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Security Level:</span>
                <span className="text-sm font-mono text-foreground">Level 2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Key Size:</span>
                <span className="text-sm font-mono text-foreground">1312 bytes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Signature Size:</span>
                <span className="text-sm font-mono text-foreground">2420 bytes</span>
              </div>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Post-quantum cryptographic security
          </p>
        </ExpandableCard>

        <ExpandableCard
          title="Network Performance"
          icon={<Zap className="h-5 w-5 text-primary" />}
          expandLabel="View performance metrics"
          expandedContent={
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Block Time:</span>
                <span className="text-sm font-mono text-foreground">1.6 seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">TPS:</span>
                <span className="text-sm font-mono text-foreground">~300</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Finality:</span>
                <span className="text-sm font-mono text-foreground">67% stake</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">DAG Layers:</span>
                <span className="text-sm font-mono text-foreground">3024</span>
              </div>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Network performance metrics
          </p>
        </ExpandableCard>
      </div>
    </div>
  );
};
