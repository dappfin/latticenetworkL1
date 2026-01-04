#!/usr/bin/env bash
set -euo pipefail

# ================================
# LATTICE LIVE METRIC PROBES
# ================================

if [ $# -lt 2 ]; then
  echo "Usage: $0 <rpc_url> <output_file>"
  echo "Example: $0 http://127.0.0.1:8545 metrics.log"
  exit 1
fi

RPC_URL="$1"
OUTPUT_FILE="$2"

echo "======================================"
echo "METRIC PROBES START"
echo "RPC:        $RPC_URL"
echo "Output:     $OUTPUT_FILE"
echo "======================================"

# Initialize metrics file
echo "timestamp,block_number,mempool_size,gas_price,sqlite_size_mb,cpu_load" > "$OUTPUT_FILE"

get_metric() {
  local metric="$1"
  curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"$metric\",\"params\":[],\"id\":1}" | \
    jq -r '.result // "null"' 2>/dev/null || echo "null"
}

get_sqlite_size() {
  local db_path="${3:-./data/state.db}"
  if [ -f "$db_path" ]; then
    stat -c%s "$db_path" | awk '{print $1/1024/1024}'
  else
    echo "0"
  fi
}

get_cpu_load() {
  top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//'
}

# Main monitoring loop
while true; do
  TIMESTAMP=$(date +%s.%N)
  
  # RPC metrics
  BLOCK_NUMBER=$(get_metric "eth_blockNumber")
  MEMPOOL_SIZE=$(get_metric "txpool_status" | jq -r '.pending // 0' 2>/dev/null || echo "0")
  GAS_PRICE=$(get_metric "eth_gasPrice")
  
  # System metrics
  SQLITE_SIZE=$(get_sqlite_size)
  CPU_LOAD=$(get_cpu_load)
  
  # Log metrics
  echo "$TIMESTAMP,$BLOCK_NUMBER,$MEMPOOL_SIZE,$GAS_PRICE,$SQLITE_SIZE,$CPU_LOAD" >> "$OUTPUT_FILE"
  
  # Display real-time stats
  printf "\r[%s] Block: %s | Mempool: %s | Gas: %s | DB: %.2fMB | CPU: %s%%" \
    "$(date '+%H:%M:%S')" \
    "${BLOCK_NUMBER:-null}" \
    "$MEMPOOL_SIZE" \
    "${GAS_PRICE:-null}" \
    "$SQLITE_SIZE" \
    "$CPU_LOAD"
  
  sleep 1
done
