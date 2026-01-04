import { Globe, Server, Database, Cpu } from "lucide-react";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";
import { StatusBadge } from "@/components/explorer/StatusBadge";

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
              <span className="text-sm font-mono text-foreground">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Genesis Hash</span>
              <span className="text-sm font-mono text-foreground">—</span>
            </div>
          </div>
        </ExpandableCard>

        {/* RPC Endpoints */}
        <ExpandableCard
          title="RPC Endpoints"
          icon={<Globe className="h-5 w-5 text-primary" />}
        >
          <div className="text-sm text-muted-foreground">
            No endpoints configured
          </div>
        </ExpandableCard>

        {/* Indexer Status */}
        <ExpandableCard
          title="Indexer Status"
          icon={<Database className="h-5 w-5 text-primary" />}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status="inactive" />
          </div>
        </ExpandableCard>

        {/* EVM Status */}
        <ExpandableCard
          title="Execution Engine (EVM)"
          icon={<Cpu className="h-5 w-5 text-primary" />}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status="inactive" />
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
              <p className="text-sm font-mono text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">RPC Port</p>
              <p className="text-sm font-mono text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WebSocket Port</p>
              <p className="text-sm font-mono text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Peers</p>
              <p className="text-sm font-mono text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Peers</p>
              <p className="text-sm font-mono text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sync Mode</p>
              <p className="text-sm font-mono text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DB Backend</p>
              <p className="text-sm font-mono text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Network Protocol</p>
              <p className="text-sm font-mono text-foreground">—</p>
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
