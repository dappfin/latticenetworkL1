import { supabase } from "@/integrations/supabase/client";

export const RPC_CONFIG = {
  chainId: 88401,
  timeout: 15000,
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
  try {
    const { data, error } = await supabase.functions.invoke('rpc-proxy', {
      body: {
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      },
    });

    if (error) {
      console.warn("RPC proxy error:", error.message);
      return null;
    }

    const response = data as RPCResponse<T>;
    
    if (response.error) {
      console.warn("RPC error:", response.error.message);
      return null;
    }

    return response.result ?? null;
  } catch (error) {
    console.warn("RPC call failed:", error);
    return null;
  }
}
