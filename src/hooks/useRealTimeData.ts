import { useState, useEffect, useCallback } from 'react';
import { NODE_CONFIG, UI_CONFIG } from '@/config/monitoring';

interface NodeStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
  blockHeight: number;
  pqKeyStatus: 'valid' | 'invalid' | 'missing';
  latency: number;
  stakeWeight: string;
}

interface RealTimeMetrics {
  timestamp: number;
  blockHeight: number;
  transactionsPerSecond: number;
  activeValidators: number;
  networkLatency: number;
  pqSignaturesVerified: number;
}

interface UseRealTimeDataReturn {
  nodeStatuses: NodeStatus[];
  metrics: RealTimeMetrics | null;
  isConnecting: boolean;
  lastUpdate: string;
  error: string | null;
}

export const useRealTimeData = (): UseRealTimeDataReturn => {
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatus[]>([]);
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Simulate real-time data fetching from Hetzner nodes
  const fetchRealTimeData = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Simulate fetching from actual RPC endpoints
      const responses = await Promise.all(
        NODE_CONFIG.dataSources.map(async (source) => {
          // Simulate API call to validator endpoint
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
          
          // Generate realistic mock data based on current time
          const baseHeight = 4800 + Math.floor(Date.now() / 10000) % 100;
          const isOnline = Math.random() > 0.05; // 95% uptime
          
          return {
            id: source.id,
            name: source.name,
            status: (isOnline ? 'online' : 'warning') as 'online' | 'offline' | 'warning',
            lastSeen: new Date().toISOString(),
            blockHeight: baseHeight + Math.floor(Math.random() * 50),
            pqKeyStatus: 'valid' as 'valid' | 'invalid' | 'missing',
            latency: Math.floor(Math.random() * 200) + 50,
            stakeWeight: '250,000'
          };
        })
      );
      
      setNodeStatuses(responses);
      
      // Calculate aggregate metrics
      const avgLatency = responses.reduce((sum, node) => sum + node.latency, 0) / responses.length;
      const totalBlocks = Math.max(...responses.map(node => node.blockHeight));
      const onlineCount = responses.filter(node => node.status === 'online').length;
      
      setMetrics({
        timestamp: Date.now(),
        blockHeight: totalBlocks,
        transactionsPerSecond: Math.floor(Math.random() * 50) + 150, // 150-200 TPS
        activeValidators: onlineCount,
        networkLatency: Math.floor(avgLatency),
        pqSignaturesVerified: Math.floor(Math.random() * 100) + 200 // PQ signatures/sec
      });
      
      setLastUpdate(new Date().toLocaleTimeString());
      setIsConnecting(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch real-time data');
      setIsConnecting(false);
    }
  }, []);

  // Set up real-time updates every 10 seconds
  useEffect(() => {
    // Initial fetch
    fetchRealTimeData();
    
    // Set up interval for 10-second updates
    const interval = setInterval(fetchRealTimeData, UI_CONFIG.dashboard.refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchRealTimeData]);

  return {
    nodeStatuses,
    metrics,
    isConnecting,
    lastUpdate,
    error
  };
};
