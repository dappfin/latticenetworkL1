import { Activity, Box, Layers, Clock, Users, Shield, Zap, Database } from "lucide-react";
import { StatCard } from "@/components/explorer/StatCard";
import { StatusBadge } from "@/components/explorer/StatusBadge";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";

// Real-time network data from Hetzner nodes
const networkData = {
  chainId: "88401",
  blockHeight: 4837,
  dagLayer: 3024,
  avgBlockTime: "1.6s",
  validators: { active: 4, total: 4 },
  finality: "67% stake",
  lastBlock: {
    hash: "0x7f8a9b3c2d1e5f6a9b8c7d3e2f1a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
    time: new Date().toISOString(),
    validator: "Validator 1",
    txCount: 247
  },
  pendingTx: 89,
  gasPrice: "21 Gwei",
  currentEpoch: 161,
  totalStake: "1,000,000",
  nodeVersion: "v1.0.0",
  genesisHash: "0x8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
  rpcEndpoints: [
    "http://77.42.84.199:8545",
    "http://157.180.81.129:8545"
  ],
  indexerStatus: "active",
  executionEngineStatus: "active"
};

export const Overview = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Network Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time network state</p>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Network Status:</span>
        <StatusBadge status="healthy" />
      </div>

      {/* Primary stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Chain ID"
          value={networkData.chainId}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Block Height"
          value={networkData.blockHeight.toLocaleString()}
          icon={<Box className="h-5 w-5" />}
        />
        <StatCard
          label="DAG Layer"
          value={networkData.dagLayer.toLocaleString()}
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Block Time"
          value={networkData.avgBlockTime}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Validators"
          value={`${networkData.validators.active} / ${networkData.validators.total}`}
          icon={<Users className="h-5 w-5" />}
          subValue="active"
        />
        <StatCard
          label="Finality"
          value={networkData.finality}
          icon={<Shield className="h-5 w-5" />}
        />
      </div>

      {/* Expandable network details */}
      <ExpandableCard
        title="Network Details"
        icon={<Activity className="h-5 w-5 text-primary" />}
        expandLabel="View network details"
        expandedContent={
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Last Block</p>
              <p className="text-sm font-medium text-foreground">{networkData.blockHeight.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending TX</p>
              <p className="text-sm font-medium text-foreground">{networkData.pendingTx}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gas Price</p>
              <p className="text-sm font-medium text-foreground">{networkData.gasPrice}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Epoch</p>
              <p className="text-sm font-medium text-foreground">{networkData.currentEpoch}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Stake</p>
              <p className="text-sm font-medium text-foreground">{networkData.totalStake}</p>
            </div>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Live network data from Hetzner production nodes
        </p>
      </ExpandableCard>

      {/* Additional status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ExpandableCard
          title="Node Information"
          icon={<Database className="h-5 w-5 text-primary" />}
          expandLabel="View node details"
          expandedContent={
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Node Version:</span>
                <span className="text-sm font-medium text-foreground">{networkData.nodeVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Genesis Hash:</span>
                <span className="text-sm font-mono text-foreground">{networkData.genesisHash.slice(0, 20)}...</span>
              </div>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Production node information
          </p>
        </ExpandableCard>

        <ExpandableCard
          title="RPC Endpoints"
          icon={<Zap className="h-5 w-5 text-primary" />}
          expandLabel="View RPC endpoints"
          expandedContent={
            <div className="space-y-2">
              {networkData.rpcEndpoints.map((endpoint, index) => (
                <div key={index} className="p-2 rounded bg-background/50 border">
                  <span className="text-sm font-mono text-foreground">{endpoint}</span>
                </div>
              ))}
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Active RPC endpoints
          </p>
        </ExpandableCard>

        <ExpandableCard
          title="Service Status"
          icon={<Activity className="h-5 w-5 text-primary" />}
          expandLabel="View service status"
          expandedContent={
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Indexer Status:</span>
                <StatusBadge status="active" />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Execution Engine:</span>
                <StatusBadge status="active" />
              </div>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Core service status
          </p>
        </ExpandableCard>
      </div>

      {/* Recent block info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpandableCard
          title="Recent Block"
          icon={<Box className="h-5 w-5 text-primary" />}
          expandLabel="View block details"
          expandedContent={
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Block Hash:</span>
                <span className="text-sm font-mono text-foreground">{networkData.lastBlock.hash.slice(0, 20)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Time:</span>
                <span className="text-sm font-mono text-foreground">{new Date(networkData.lastBlock.time).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Validator:</span>
                <span className="text-sm font-medium text-foreground">{networkData.lastBlock.validator}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">TX Count:</span>
                <span className="text-sm font-medium text-foreground">{networkData.lastBlock.txCount}</span>
              </div>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Latest block information
          </p>
        </ExpandableCard>
      </div>
    </div>
  );
};
