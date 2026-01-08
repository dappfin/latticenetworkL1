import { Activity, Box, Layers, Clock, Users, Shield, Zap, Database } from "lucide-react";
import { StatCard } from "@/components/explorer/StatCard";
import { StatusBadge } from "@/components/explorer/StatusBadge";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";

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
          value="88401"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Block Height"
          value="—"
          icon={<Box className="h-5 w-5" />}
        />
        <StatCard
          label="DAG Layer"
          value="—"
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Block Time"
          value="—"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Validators"
          value="— / —"
          icon={<Users className="h-5 w-5" />}
          subValue="active"
        />
        <StatCard
          label="Finality"
          value="—"
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
              <p className="text-sm font-medium text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending TX</p>
              <p className="text-sm font-medium text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gas Price</p>
              <p className="text-sm font-medium text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Epoch</p>
              <p className="text-sm font-medium text-foreground">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Stake</p>
              <p className="text-sm font-medium text-foreground">—</p>
            </div>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Live network data
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
                <span className="text-sm font-medium text-foreground">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Genesis Hash:</span>
                <span className="text-sm font-mono text-foreground">—</span>
              </div>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Node information
          </p>
        </ExpandableCard>

        <ExpandableCard
          title="RPC Endpoints"
          icon={<Zap className="h-5 w-5 text-primary" />}
          expandLabel="View RPC endpoints"
          expandedContent={
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No endpoints configured</p>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            RPC endpoints
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
              <StatusBadge status="inactive" />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Execution Engine:</span>
              <StatusBadge status="inactive" />
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
