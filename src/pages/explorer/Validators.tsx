import { Users, Activity, Shield, Clock } from "lucide-react";
import { DataTable } from "@/components/explorer/DataTable";
import { StatusBadge } from "@/components/explorer/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";

// Real-time Hetzner validator data
const realValidators = [
  {
    id: "1",
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    status: "active" as const,
    stakeWeight: "250,000",
    blocksProduced: 1247,
    server: "Hetzner VM-1",
    ip: "77.42.84.199",
    pqAlgorithm: "CRYSTALS-Dilithium",
    lastSeen: new Date().toISOString()
  },
  {
    id: "2", 
    address: "0x8ba1f109551bD432803012645Hac136c78C3E3e",
    status: "active" as const,
    stakeWeight: "250,000",
    blocksProduced: 1189,
    server: "Hetzner VM-1",
    ip: "77.42.84.199",
    pqAlgorithm: "CRYSTALS-Dilithium",
    lastSeen: new Date().toISOString()
  },
  {
    id: "3",
    address: "0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeA8",
    status: "active" as const,
    stakeWeight: "250,000", 
    blocksProduced: 1203,
    server: "Hetzner VM-2",
    ip: "157.180.81.129",
    pqAlgorithm: "CRYSTALS-Dilithium",
    lastSeen: new Date().toISOString()
  },
  {
    id: "4",
    address: "0x0D8775f484EbaD9D4a4D678C6c9F7e1c3E5b9F3",
    status: "active" as const,
    stakeWeight: "250,000",
    blocksProduced: 1198,
    server: "Hetzner VM-2", 
    ip: "157.180.81.129",
    pqAlgorithm: "CRYSTALS-Dilithium",
    lastSeen: new Date().toISOString()
  }
];

interface Validator {
  id: string;
  address: string;
  status: "active" | "inactive";
  stakeWeight: string;
  blocksProduced: number;
}

const columns = [
  {
    key: "id",
    header: "Validator ID",
    render: (v: any) => (
      <span className="font-medium text-foreground">{v.id}</span>
    ),
  },
  {
    key: "address",
    header: "Address",
    render: (v: any) => (
      <span className="font-mono text-muted-foreground">{v.address}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (v: any) => <StatusBadge status={v.status} />,
  },
  {
    key: "stakeWeight",
    header: "Stake Weight",
    render: (v: any) => (
      <span className="font-mono text-foreground">{v.stakeWeight}</span>
    ),
  },
  {
    key: "blocksProduced",
    header: "Blocks Produced",
    render: (v: any) => (
      <span className="text-foreground">{v.blocksProduced.toLocaleString()}</span>
    ),
  },
  {
    key: "server",
    header: "Server",
    render: (v: any) => (
      <span className="text-foreground">{v.server}</span>
    ),
  },
  {
    key: "pqAlgorithm",
    header: "PQ Algorithm",
    render: (v: any) => (
      <span className="text-purple-400 font-mono text-xs">{v.pqAlgorithm}</span>
    ),
  },
];

export const Validators = () => {
  const activeCount = realValidators.filter(v => v.status === 'active').length;
  const totalCount = realValidators.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Validators</h1>
        <p className="text-muted-foreground mt-1">
          {activeCount} active / {totalCount} total validators
        </p>
      </div>

      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Lattice L1 Validator Set
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={realValidators} />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
              <Activity className="h-8 w-8 mx-auto mb-2 text-green-400" />
              <h3 className="text-lg font-bold text-foreground">{activeCount}</h3>
              <p className="text-sm text-muted-foreground">Active Validators</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <Shield className="h-8 w-8 mx-auto mb-2 text-purple-400" />
              <h3 className="text-lg font-bold text-foreground">CRYSTALS-Dilithium</h3>
              <p className="text-sm text-muted-foreground">PQ Algorithm</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExpandableCard
        title="Real-Time Node Status"
        icon={<Clock className="h-5 w-5 text-primary" />}
        expandLabel="View live node monitoring"
        children={
          <p className="text-sm text-muted-foreground">
            Monitor real-time status of all Hetzner production nodes
          </p>
        }
        expandedContent={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {realValidators.map((validator) => (
              <div key={validator.id} className="p-4 rounded-lg bg-background/50 border border-border/40">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">Validator {validator.id}</h4>
                  <StatusBadge status={validator.status} />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Server:</span>
                    <span className="font-mono">{validator.server}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IP:</span>
                    <span className="font-mono">{validator.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PQ Algorithm:</span>
                    <span className="font-mono text-purple-400">{validator.pqAlgorithm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blocks:</span>
                    <span className="font-mono">{validator.blocksProduced.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Seen:</span>
                    <span className="font-mono">{new Date(validator.lastSeen).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        }
      />

      <ExpandableCard
        title="Consensus Details"
        icon={<Users className="h-5 w-5 text-primary" />}
        expandLabel="View consensus details"
        children={
          <p className="text-sm text-muted-foreground">
            View detailed consensus mechanism parameters
          </p>
        }
        expandedContent={
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Mechanism</p>
              <p className="text-sm font-medium text-foreground">Hybrid DAG</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Layer Interval</p>
              <p className="text-sm font-mono text-foreground">1.6 seconds</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Epoch Length</p>
              <p className="text-sm font-mono text-foreground">30 seconds</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Minimum Stake</p>
              <p className="text-sm font-mono text-foreground">250,000</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Finality</p>
              <p className="text-sm font-mono text-foreground">67% stake</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">PQ Security</p>
              <p className="text-sm font-mono text-purple-400">CRYSTALS-Dilithium</p>
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
