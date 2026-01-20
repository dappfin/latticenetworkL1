// @ts-nocheck

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RPC_ENDPOINTS = [
  "https://rpc.lattice.network",
  "http://77.42.84.199:8545",
  "http://157.180.81.129:8545"
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("RPC Proxy request:", JSON.stringify(body));

    // Try each endpoint in order until one succeeds
    for (const endpoint of RPC_ENDPOINTS) {
      try {
        console.log(`Trying RPC endpoint: ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`Endpoint ${endpoint} returned status ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`Success from ${endpoint}:`, JSON.stringify(data));

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.warn(`Endpoint ${endpoint} failed:`, error.message);
        continue;
      }
    }

    // All endpoints failed
    console.error("All RPC endpoints failed");
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id || 1,
        error: { code: -32000, message: "All RPC endpoints unavailable" }
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error("RPC Proxy error:", error);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32700, message: "Invalid request" }
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
