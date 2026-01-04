import { Activity, Box, Layers, Clock, Users, Shield } from "lucide-react";
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
          value="—"
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
          Connect to RPC to view live network data.
        </p>
      </ExpandableCard>
    </div>
  );
};
