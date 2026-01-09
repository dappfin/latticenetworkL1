export const RPC_CONFIG = {
  primary: "https://rpc.lattice.network",
  fallbacks: [
    "http://77.42.84.199:8545",
    "http://157.180.81.129:8545"
  ],
  chainId: 88401,
  timeout: 10000,
};

export type RPCResponse<T> = {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
};

export async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T | null> {
  const endpoints = [RPC_CONFIG.primary, ...RPC_CONFIG.fallbacks];
  
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RPC_CONFIG.timeout);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      
      const data: RPCResponse<T> = await response.json();
      
      if (data.error) {
        console.warn(`RPC error from ${endpoint}:`, data.error.message);
        continue;
      }
      
      return data.result ?? null;
    } catch (error) {
      console.warn(`RPC call failed for ${endpoint}:`, error);
      continue;
    }
  }
  
  return null;
}
