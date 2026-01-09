// Lattice L1 Real-Time Monitoring Configuration
// Configure UI to monitor Hetzner production nodes

export const NODE_CONFIG = {
  // Hetzner Production Servers
  servers: [
    {
      id: "vm-1",
      name: "Hetzner VM-1",
      publicIp: "77.42.84.199",
      privateIp: "10.10.1.2",
      role: "primary",
      validators: [1, 2],
      rpcPort: 8545,
      p2pPort: 26656,
      status: "active"
    },
    {
      id: "vm-2", 
      name: "Hetzner VM-2",
      publicIp: "157.180.81.129",
      privateIp: "10.10.1.3",
      role: "secondary",
      validators: [3, 4],
      rpcPort: 8545,
      p2pPort: 26656,
      status: "active"
    }
  ],

  // RPC Configuration for Production
  rpc: {
    primary: "http://77.42.84.199:8545",
    secondary: "http://157.180.81.129:8545",
    target: "rpc.lattice.network",
    rateLimits: {
      global: "20 req/sec/IP",
      burst: "40 req/sec",
      transactions: "5 req/sec/IP",
      logs: "1 req/sec/IP"
    }
  },

  // PQ Configuration
  pq: {
    algorithm: "CRYSTALS-Dilithium",
    level: 2,
    keySize: 1312,
    signatureSize: 2420,
    hashAlgorithm: "Keccak-256",
    chainId: "88401"
  },

  // Monitoring Configuration - UPDATED FOR 10s REFRESH
  monitoring: {
    refreshInterval: 10000, // 10 seconds - REAL-TIME UPDATES
    timeout: 10000, // 10 seconds
    retryAttempts: 3,
    alertThresholds: {
      blockProduction: 30000, // 30 seconds without blocks
      validatorOffline: 60000, // 1 minute offline
      highLatency: 5000, // 5 seconds
      lowStake: 1000000, // Below minimum stake
      consensusFailure: 120000 // 2 minutes
    }
  },

  // Real-time Data Sources
  dataSources: [
    {
      id: "vm-1-v1",
      name: "vm-1-validator-1",
      type: "validator",
      endpoint: "http://77.42.84.199:26658",
      metrics: "http://77.42.84.199:26658/metrics"
    },
    {
      id: "vm-1-v2",
      name: "vm-1-validator-2", 
      type: "validator",
      endpoint: "http://77.42.84.199:26659",
      metrics: "http://77.42.84.199:26659/metrics"
    },
    {
      id: "vm-2-v3",
      name: "vm-2-validator-3",
      type: "validator", 
      endpoint: "http://157.180.81.129:26660",
      metrics: "http://157.180.81.129:26660/metrics"
    },
    {
      id: "vm-2-v4",
      name: "vm-2-validator-4",
      type: "validator",
      endpoint: "http://157.180.81.129:26661", 
      metrics: "http://157.180.81.129:26661/metrics"
    }
  ]
};

// UI Configuration for monitoring - UPDATED FOR REAL-TIME
export const UI_CONFIG = {
  theme: "dark",
  layout: "dashboard",
  features: {
    realTimeUpdates: true,
    pqMonitoring: true,
    consensusVisualization: true,
    networkTopology: true,
    alerting: true,
    historicalData: true
  },
  dashboard: {
    refreshInterval: 10000, // 10 seconds - REAL-TIME UPDATES
    maxDataPoints: 1000,
    chartTypes: ["line", "bar", "gauge", "heatmap"],
    animations: true,
    liveStreaming: true
  }
};

export default NODE_CONFIG;
