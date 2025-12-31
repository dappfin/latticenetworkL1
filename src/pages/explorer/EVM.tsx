import { Cpu, Zap, Database, Settings } from "lucide-react";
import { ExpandableCard } from "@/components/explorer/ExpandableCard";
import { StatCard } from "@/components/explorer/StatCard";
import { StatusBadge } from "@/components/explorer/StatusBadge";

const evmData = {
  chainId: 88401,
  status: "healthy" as const,
  blockGasLimit: 15000000,
  avgGasUsage: 4827391,
  avgGasPrice: "0.0001 LATT",
};

const advancedInfo = {
  evmVersion: "Shanghai",
  opcodeSet: "Full EVM Compatibility",
  precompiles: ["ecRecover", "sha256", "ripemd160", "identity", "modexp", "ecAdd", "ecMul", "ecPairing"],
  maxCodeSize: "24KB",
  maxInitCodeSize: "48KB",
  gasPerByte: 16,
  baseFeeEnabled: true,
  eip1559: true,
};

export const EVM = () => {
  const usagePercent = ((evmData.avgGasUsage / evmData.blockGasLimit) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">EVM</h1>
        <p className="text-muted-foreground mt-1">Execution environment information</p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Execution Status:</span>
        <StatusBadge status={evmData.status} />
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Chain ID"
          value={evmData.chainId}
          icon={<Cpu className="h-5 w-5" />}
        />
        <StatCard
          label="Block Gas Limit"
          value={evmData.blockGasLimit.toLocaleString()}
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Gas Usage"
          value={`${usagePercent}%`}
          icon={<Database className="h-5 w-5" />}
          subValue={evmData.avgGasUsage.toLocaleString()}
        />
        <StatCard
          label="Avg Gas Price"
          value={evmData.avgGasPrice}
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
                <p className="text-sm font-medium text-foreground">{advancedInfo.evmVersion}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Opcode Set</p>
                <p className="text-sm font-medium text-foreground">{advancedInfo.opcodeSet}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Code Size</p>
                <p className="text-sm font-mono text-foreground">{advancedInfo.maxCodeSize}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Init Code Size</p>
                <p className="text-sm font-mono text-foreground">{advancedInfo.maxInitCodeSize}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Gas Per Byte</p>
                <p className="text-sm font-mono text-foreground">{advancedInfo.gasPerByte}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Base Fee Enabled</p>
                <p className="text-sm font-mono text-foreground">{advancedInfo.baseFeeEnabled ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">EIP-1559</p>
                <p className="text-sm font-mono text-foreground">{advancedInfo.eip1559 ? "Enabled" : "Disabled"}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Precompiled Contracts</p>
              <div className="flex flex-wrap gap-2">
                {advancedInfo.precompiles.map((precompile, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-secondary/50 rounded text-xs font-mono text-foreground"
                  >
                    {precompile}
                  </span>
                ))}
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
