import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NODE_CONFIG } from '@/config/monitoring';

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

export const RealTimeMonitor = () => {
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatus[]>([]);
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Real-time data fetching
  useEffect(() => {
    const fetchNodeData = async () => {
      try {
        const responses = await Promise.all(
          NODE_CONFIG.dataSources.map(async (source) => {
            const response = await fetch(`${source.endpoint}/status`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
              throw new Error(`Node ${source.name} offline`);
            }
            
            const data = await response.json();
            return {
              id: source.id,
              name: source.name,
              status: 'online' as 'online' | 'offline' | 'warning',
              lastSeen: new Date().toISOString(),
              blockHeight: data.blockHeight || 0,
              pqKeyStatus: (data.pqKeyValid ? 'valid' : 'invalid') as 'valid' | 'invalid' | 'missing',
              latency: data.latency || 0,
              stakeWeight: data.stakeWeight || '0'
            };
          })
        );
        
        setNodeStatuses(responses);
        
        // Fetch aggregate metrics
        const metricsResponse = await fetch(`${NODE_CONFIG.rpc.primary}/metrics`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          setMetrics(metricsData);
        }
      } catch (error) {
        console.error('Failed to fetch node data:', error);
        // Set offline status for failed nodes
        setNodeStatuses(prev => prev.map(node => 
          node.id.includes('vm-1') || node.id.includes('vm-2') 
            ? { ...node, status: 'offline', lastSeen: new Date().toISOString() }
            : node
        ));
      }
    };

    fetchNodeData();
    const interval = setInterval(fetchNodeData, NODE_CONFIG.monitoring.refreshInterval);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'offline': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getPQStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-500';
      case 'invalid': return 'text-red-500';
      case 'missing': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Node Status Overview */}
        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-cyan-500/40">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              🔗 Live Node Status
              <Badge variant="outline" className="text-xs">
                {nodeStatuses.filter(n => n.status === 'online').length}/{nodeStatuses.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nodeStatuses.map((node) => (
                <div 
                  key={node.id}
                  className="p-4 rounded-lg bg-background/50 border border-border/200 hover:border-primary/40 transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedNode(node.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-foreground">{node.name}</h4>
                    <Badge className={`text-xs ${getStatusColor(node.status)}`}>
                      {node.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IP:</span>
                      <span className="font-mono">{node.id.includes('vm-1') ? '77.42.84.199' : '157.180.81.129'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Height:</span>
                      <span className="font-mono text-foreground">{node.blockHeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PQ Keys:</span>
                      <span className={`font-mono ${getPQStatusColor(node.pqKeyStatus)}`}>
                        {node.pqKeyStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Latency:</span>
                      <span className="font-mono text-foreground">{node.latency}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stake:</span>
                      <span className="font-mono text-foreground">{node.stakeWeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Seen:</span>
                      <span className="font-mono text-foreground">{new Date(node.lastSeen).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Metrics */}
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/40">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              📊 Real-Time Metrics
              {metrics && (
                <Badge variant="outline" className="text-xs text-green-400">
                  LIVE
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {metrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-background/50">
                    <h3 className="text-2xl font-bold text-foreground">{metrics.blockHeight}</h3>
                    <p className="text-sm text-muted-foreground">Current Block</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background/50">
                    <h3 className="text-2xl font-bold text-foreground">{metrics.activeValidators}</h3>
                    <p className="text-sm text-muted-foreground">Active Validators</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-background/50">
                    <h3 className="text-2xl font-bold text-foreground">{metrics.transactionsPerSecond}</h3>
                    <p className="text-sm text-muted-foreground">TX/sec</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background/50">
                    <h3 className="text-2xl font-bold text-foreground">{metrics.networkLatency}</h3>
                    <p className="text-sm text-muted-foreground">Network Latency (ms)</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-background/50">
                    <h3 className="text-2xl font-bold text-foreground">{metrics.pqSignaturesVerified}</h3>
                    <p className="text-sm text-muted-foreground">PQ Signatures/sec</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background/50">
                    <h3 className="text-2xl font-bold text-foreground">
                      {NODE_CONFIG.pq.algorithm}
                    </h3>
                    <p className="text-sm text-muted-foreground">PQ Algorithm</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Waiting for metrics data...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              📋 Node Details: {selectedNode}
              <button 
                onClick={() => setSelectedNode(null)}
                className="ml-auto text-sm text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {(() => {
              const node = nodeStatuses.find(n => n.id === selectedNode);
              if (!node) return null;
              
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Server:</span>
                      <span className="font-mono">{node.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Endpoint:</span>
                      <span className="font-mono text-xs">{node.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(node.status)}>
                        {node.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Update:</span>
                      <span className="font-mono">{new Date(node.lastSeen).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 rounded-lg bg-background/50">
                    <h4 className="text-sm font-semibold mb-2">Performance Metrics</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Block Production Rate:</span>
                        <span>{node.blockHeight > 0 ? 'Normal' : 'Stopped'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PQ Key Status:</span>
                        <Badge className={getPQStatusColor(node.pqKeyStatus)}>
                          {node.pqKeyStatus}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Network Latency:</span>
                        <span className={node.latency > 1000 ? 'text-red-500' : 'text-green-500'}>
                          {node.latency}ms
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeMonitor;
