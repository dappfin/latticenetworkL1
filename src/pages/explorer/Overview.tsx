import { Activity, Box, Layers, Clock, Users, Shield, Zap, Database, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/explorer/StatCard";
import { StatusBadge } from "@/components/explorer/StatusBadge";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";
import { useBlockchainData } from "@/hooks/useBlockchainData";
import { RPC_CONFIG } from "@/config/rpc";
import { Button } from "@/components/ui/button";

export const Overview = () => {
  const { 
    blockHeight, 
    chainId, 
    gasPrice, 
    peerCount, 
    syncing, 
    isLoading, 
    lastUpdated,
    refetch 
  } = useBlockchainData();

  const getNetworkStatus = () => {
    if (isLoading) return "syncing";
    if (syncing) return "syncing";
    if (blockHeight !== null) return "healthy";
    return "degraded";
  };

  const formatValue = (value: unknown) => {
    if (isLoading) return "...";
    if (value === null || value === undefined) return "—";
    return String(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Network Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time network state</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refetch}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Network Status:</span>
        <StatusBadge status={getNetworkStatus()} />
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Primary stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Chain ID"
          value={formatValue(chainId || RPC_CONFIG.chainId)}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Block Height"
          value={formatValue(blockHeight?.toLocaleString())}
          icon={<Box className="h-5 w-5" />}
        />
        <StatCard
          label="Peers"
          value={formatValue(peerCount)}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Gas Price"
          value={formatValue(gasPrice)}
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          label="Syncing"
          value={isLoading ? "..." : syncing ? "Yes" : "No"}
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          label="Finality"
          value={blockHeight ? "Confirmed" : "—"}
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
              <p className="text-xs text-muted-foreground">Latest Block</p>
              <p className="text-sm font-medium text-foreground font-mono">
                {formatValue(blockHeight?.toLocaleString())}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chain ID</p>
              <p className="text-sm font-medium text-foreground">{formatValue(chainId)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gas Price</p>
              <p className="text-sm font-medium text-foreground">{formatValue(gasPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Connected Peers</p>
              <p className="text-sm font-medium text-foreground">{formatValue(peerCount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Network Status</p>
              <p className="text-sm font-medium text-foreground">
                {isLoading ? "Loading..." : syncing ? "Syncing" : "Synchronized"}
              </p>
            </div>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Live network data from RPC
        </p>
      </ExpandableCard>

      {/* Additional status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ExpandableCard
          title="RPC Connection"
          icon={<Database className="h-5 w-5 text-primary" />}
          expandLabel="View RPC details"
          expandedContent={
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Primary RPC:</span>
                <span className="text-sm font-mono text-foreground">{RPC_CONFIG.primary}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <StatusBadge status={blockHeight !== null ? "healthy" : "degraded"} />
              </div>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Connected to Lattice Network
          </p>
        </ExpandableCard>

        <ExpandableCard
          title="RPC Endpoints"
          icon={<Zap className="h-5 w-5 text-primary" />}
          expandLabel="View RPC endpoints"
          expandedContent={
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Available endpoints:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">{RPC_CONFIG.primary}</code>
              {RPC_CONFIG.fallbacks.map((fb, i) => (
                <code key={i} className="text-xs bg-muted px-2 py-1 rounded block">{fb}</code>
              ))}
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            {RPC_CONFIG.fallbacks.length + 1} endpoints configured
          </p>
        </ExpandableCard>

        <ExpandableCard
          title="Service Status"
          icon={<Activity className="h-5 w-5 text-primary" />}
          expandLabel="View service status"
          expandedContent={
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">RPC Status:</span>
                <StatusBadge status={blockHeight !== null ? "healthy" : "inactive"} />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Execution Engine:</span>
                <StatusBadge status={blockHeight !== null ? "healthy" : "inactive"} />
              </div>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Core service status
          </p>
        </ExpandableCard>
      </div>
    </div>
  );
};
