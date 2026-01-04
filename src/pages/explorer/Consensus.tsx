import { Link2, Shield, Layers, Users } from "lucide-react";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";
import { StatCard } from "@/components/explorer/StatCard";
import { StatusBadge } from "@/components/explorer/StatusBadge";

export const Consensus = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Consensus & Finality</h1>
        <p className="text-muted-foreground mt-1">Network consensus state and finality rules</p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Epoch"
          value="—"
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          label="Total Stake"
          value="—"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Active Stake"
          value="—"
          icon={<Shield className="h-5 w-5" />}
        />
        <StatCard
          label="Quorum Threshold"
          value="—"
          icon={<Link2 className="h-5 w-5" />}
        />
      </div>

      {/* Last finalized block */}
      <ExpandableCard
        title="Finalization Status"
        icon={<Shield className="h-5 w-5 text-primary" />}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Last Finalized Block</p>
            <p className="text-lg font-mono text-foreground">—</p>
          </div>
          <StatusBadge status="inactive" />
        </div>
      </ExpandableCard>

      {/* Soft Finality */}
      <ExpandableCard
        title="Soft Finality Rules"
        icon={<Layers className="h-5 w-5 text-primary" />}
        expandLabel="View soft finality details"
        expandedContent={
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Required Confirmations</span>
              <span className="text-sm font-mono text-foreground">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Expected Latency</span>
              <span className="text-sm font-mono text-foreground">—</span>
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground">Probabilistic finality based on validator attestations</p>
            </div>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <StatusBadge status="soft" />
          <span className="text-sm text-muted-foreground">Fast confirmations with probabilistic guarantees</span>
        </div>
      </ExpandableCard>

      {/* Hard Finality */}
      <ExpandableCard
        title="Hard Finality Rules"
        icon={<Shield className="h-5 w-5 text-primary" />}
        expandLabel="View hard finality details"
        expandedContent={
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Required Confirmations</span>
              <span className="text-sm font-mono text-foreground">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Expected Latency</span>
              <span className="text-sm font-mono text-foreground">—</span>
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground">Cryptographic finality with 2/3+ stake attestation</p>
            </div>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <StatusBadge status="hard" />
          <span className="text-sm text-muted-foreground">Irreversible with cryptographic guarantees</span>
        </div>
      </ExpandableCard>
    </div>
  );
};
