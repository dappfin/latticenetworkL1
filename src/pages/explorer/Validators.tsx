import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { DataTable } from "@/components/explorer/DataTable";
import { StatusBadge } from "@/components/explorer/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";

interface Validator {
  id: string;
  address: string;
  status: "active" | "inactive";
  stakeWeight: string;
  blocksProduced: number;
}

// Mock data
const mockValidators: Validator[] = Array.from({ length: 15 }, (_, i) => ({
  id: `Validator-${i + 1}`,
  address: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
  status: i < 12 ? "active" : "inactive",
  stakeWeight: `${(Math.random() * 5 + 1).toFixed(2)}%`,
  blocksProduced: Math.floor(Math.random() * 10000) + 1000,
}));

const columns = [
  {
    key: "id",
    header: "Validator ID",
    render: (v: Validator) => (
      <span className="font-medium text-foreground">{v.id}</span>
    ),
  },
  {
    key: "address",
    header: "Address",
    render: (v: Validator) => (
      <span className="font-mono text-muted-foreground">{v.address}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (v: Validator) => <StatusBadge status={v.status} />,
  },
  {
    key: "stakeWeight",
    header: "Stake Weight",
    render: (v: Validator) => (
      <span className="font-mono text-foreground">{v.stakeWeight}</span>
    ),
  },
  {
    key: "blocksProduced",
    header: "Blocks Produced",
    render: (v: Validator) => (
      <span className="text-foreground">{v.blocksProduced.toLocaleString()}</span>
    ),
  },
];

const consensusDetails = {
  mechanism: "Proof of Stake (PoS)",
  slotDuration: "1 second",
  epochLength: "1000 blocks",
  minStake: "10,000 LATT",
  slashingPenalty: "5% of stake",
  unbondingPeriod: "7 days",
};

export const Validators = () => {
  const activeCount = mockValidators.filter(v => v.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Validators</h1>
        <p className="text-muted-foreground mt-1">
          {activeCount} active / {mockValidators.length} total validators
        </p>
      </div>

      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Validator Set
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={mockValidators} />
        </CardContent>
      </Card>

      <ExpandableCard
        title="Consensus Details"
        icon={<Users className="h-5 w-5 text-primary" />}
        expandLabel="View consensus details"
        expandedContent={
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Mechanism</p>
              <p className="text-sm font-medium text-foreground">{consensusDetails.mechanism}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Slot Duration</p>
              <p className="text-sm font-mono text-foreground">{consensusDetails.slotDuration}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Epoch Length</p>
              <p className="text-sm font-mono text-foreground">{consensusDetails.epochLength}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Minimum Stake</p>
              <p className="text-sm font-mono text-foreground">{consensusDetails.minStake}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Slashing Penalty</p>
              <p className="text-sm font-mono text-foreground">{consensusDetails.slashingPenalty}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unbonding Period</p>
              <p className="text-sm font-mono text-foreground">{consensusDetails.unbondingPeriod}</p>
            </div>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          View detailed consensus mechanism parameters
        </p>
      </ExpandableCard>
    </div>
  );
};
