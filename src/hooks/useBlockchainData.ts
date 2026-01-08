import { useState, useEffect, useCallback } from "react";
import { rpcCall, RPC_CONFIG } from "@/config/rpc";

export interface BlockchainData {
  blockHeight: number | null;
  chainId: number | null;
  gasPrice: string | null;
  peerCount: number | null;
  syncing: boolean | null;
  networkVersion: string | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useBlockchainData(refreshInterval = 12000) {
  const [data, setData] = useState<BlockchainData>({
    blockHeight: null,
    chainId: null,
    gasPrice: null,
    peerCount: null,
    syncing: null,
    networkVersion: null,
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    try {
      const [blockNumber, chainId, gasPrice, peerCount, syncing, netVersion] = await Promise.all([
        rpcCall<string>("eth_blockNumber"),
        rpcCall<string>("eth_chainId"),
        rpcCall<string>("eth_gasPrice"),
        rpcCall<string>("net_peerCount"),
        rpcCall<boolean | object>("eth_syncing"),
        rpcCall<string>("net_version"),
      ]);

      setData({
        blockHeight: blockNumber ? parseInt(blockNumber, 16) : null,
        chainId: chainId ? parseInt(chainId, 16) : RPC_CONFIG.chainId,
        gasPrice: gasPrice ? (parseInt(gasPrice, 16) / 1e9).toFixed(2) + " Gwei" : null,
        peerCount: peerCount ? parseInt(peerCount, 16) : null,
        syncing: syncing === false ? false : syncing !== null,
        networkVersion: netVersion,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch data",
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { ...data, refetch: fetchData };
}
