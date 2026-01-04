import { Cpu, Zap, Database, Settings } from "lucide-react";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";
import { StatCard } from "@/components/explorer/StatCard";
import { StatusBadge } from "@/components/explorer/StatusBadge";

export const EVM = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">EVM</h1>
        <p className="text-muted-foreground mt-1">Execution environment information</p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Execution Status:</span>
        <StatusBadge status="inactive" />
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Chain ID"
          value="—"
          icon={<Cpu className="h-5 w-5" />}
        />
        <StatCard
          label="Block Gas Limit"
          value="—"
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Gas Usage"
          value="—"
          icon={<Database className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Gas Price"
          value="—"
          icon={<Settings className="h-5 w-5" />}
        />
      </div>

      {/* Advanced Execution Info */}
      <ExpandableCard
        title="Advanced Execution Info"
        icon={<Cpu className="h-5 w-5 text-primary" />}
        expandLabel="View advanced execution info"
        expandedContent={
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">EVM Version</p>
                <p className="text-sm font-medium text-foreground">—</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Opcode Set</p>
                <p className="text-sm font-medium text-foreground">—</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Code Size</p>
                <p className="text-sm font-mono text-foreground">—</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Init Code Size</p>
                <p className="text-sm font-mono text-foreground">—</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Gas Per Byte</p>
                <p className="text-sm font-mono text-foreground">—</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Base Fee Enabled</p>
                <p className="text-sm font-mono text-foreground">—</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">EIP-1559</p>
                <p className="text-sm font-mono text-foreground">—</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Precompiled Contracts</p>
              <div className="text-sm text-muted-foreground">
                No data available
              </div>
            </div>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          View EVM version, opcodes, and execution parameters
        </p>
      </ExpandableCard>
    </div>
  );
};
