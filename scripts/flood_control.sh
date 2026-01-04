#!/usr/bin/env bash
set -euo pipefail

# ================================
# LATTICE FLOOD TEST CONTROL
# ================================

if [ $# -lt 3 ]; then
  echo "Usage: $0 <rpc_url> <tps> <duration_seconds>"
  echo "Example: $0 http://127.0.0.1:8545 1000 30"
  exit 1
fi

RPC_URL="$1"
TPS="$2"
DURATION="$3"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
METRICS_FILE="./logs/flood_metrics_${TIMESTAMP}.log"
PROBES_PID=""
FLOOD_PID=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cleanup() {
  echo -e "\n${YELLOW}[*] Cleaning up...${NC}"
  
  if [ -n "$PROBES_PID" ] && kill -0 "$PROBES_PID" 2>/dev/null; then
    echo "  Stopping metric probes (PID: $PROBES_PID)"
    kill "$PROBES_PID" 2>/dev/null || true
  fi
  
  if [ -n "$FLOOD_PID" ] && kill -0 "$FLOOD_PID" 2>/dev/null; then
    echo "  Stopping flood test (PID: $FLOOD_PID)"
    kill "$FLOOD_PID" 2>/dev/null || true
  fi
  
  # Wait for processes to terminate
  sleep 2
  
  echo -e "${GREEN}[*] Cleanup complete${NC}"
}

trap cleanup EXIT INT TERM

# Create logs directory
mkdir -p ./logs

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}LATTICE FLOOD TEST CONTROL${NC}"
echo -e "${BLUE}======================================${NC}"
echo "RPC:        $RPC_URL"
echo "TPS:        $TPS"
echo "Duration:   $DURATION sec"
echo "Metrics:    $METRICS_FILE"
echo -e "${BLUE}======================================${NC}"

# Pre-flight checks
echo -e "\n${YELLOW}[*] Pre-flight checks...${NC}"

# Check RPC connectivity
echo -n "  RPC connectivity... "
if curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | \
  jq -e '.result' >/dev/null 2>&1; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}FAILED${NC}"
  echo -e "${RED}[!] Cannot connect to RPC endpoint${NC}"
  exit 1
fi

# Check required tools
for tool in jq awk bc sqlite3; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo -e "${RED}[!] Required tool not found: $tool${NC}"
    exit 1
  fi
done
echo -e "${GREEN}  All required tools available${NC}"

# Start metric probes
echo -e "\n${YELLOW}[*] Starting metric probes...${NC}"
./scripts/metric_probes.sh "$RPC_URL" "$METRICS_FILE" &
PROBES_PID=$!
echo "  Probes PID: $PROBES_PID"

# Wait a moment for probes to initialize
sleep 2

# Verify probes are running
if ! kill -0 "$PROBES_PID" 2>/dev/null; then
  echo -e "${RED}[!] Metric probes failed to start${NC}"
  exit 1
fi

echo -e "${GREEN}  Metric probes running${NC}"

# Start flood test
echo -e "\n${YELLOW}[*] Starting flood test...${NC}"
echo -e "${BLUE}  Press Ctrl+C to abort${NC}"

./scripts/tx_flood.sh "$RPC_URL" "$TPS" "$DURATION" &
FLOOD_PID=$!

# Monitor flood test
echo "  Flood PID: $FLOOD_PID"
echo -e "\n${BLUE}[*] Test in progress...${NC}"

# Wait for flood test to complete
while kill -0 "$FLOOD_PID" 2>/dev/null; do
  sleep 1
  # Show live metrics from last line
  if [ -f "$METRICS_FILE" ] && [ -s "$METRICS_FILE" ]; then
    tail -n1 "$METRICS_FILE" | awk -F',' '{
    printf "\r  Live: Block=%s Mempool=%s Gas=%s DB=%.2fMB CPU=%s%%", 
           $2, $3, $4, $5, $6
  }'
  fi
done

# Wait for flood process to fully terminate
wait "$FLOOD_PID" 2>/dev/null || true
FLOOD_EXIT_CODE=$?

echo -e "\n${YELLOW}[*] Flood test completed${NC}"
echo "  Exit code: $FLOOD_EXIT_CODE"

# Stop metric probes
if [ -n "$PROBES_PID" ] && kill -0 "$PROBES_PID" 2>/dev/null; then
  echo -e "\n${YELLOW}[*] Stopping metric probes...${NC}"
  kill "$PROBES_PID"
  wait "$PROBES_PID" 2>/dev/null || true
fi

# Run integrity checks
echo -e "\n${YELLOW}[*] Running post-test integrity checks...${NC}"
./scripts/integrity_check.sh "$RPC_URL" "$METRICS_FILE"

# Generate summary report
echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}FLOOD TEST SUMMARY${NC}"
echo -e "${BLUE}======================================${NC}"
echo "Test ID:     $TIMESTAMP"
echo "RPC URL:     $RPC_URL"
echo "Target TPS:  $TPS"
echo "Duration:    $DURATION sec"
echo "Metrics file: $METRICS_FILE"

if [ -f "$METRICS_FILE" ] && [ -s "$METRICS_FILE" ]; then
  local samples=$(($(wc -l < "$METRICS_FILE") - 1))
  echo "Data samples: $samples"
  
  # Extract final stats
  tail -n1 "$METRICS_FILE" | awk -F',' '{
    printf "Final block: %s\nFinal mempool: %s\nFinal gas price: %s\n", $2, $3, $4
  }'
fi

echo -e "${BLUE}======================================${NC}"

echo -e "\n${GREEN}[*] Flood test complete!${NC}"
echo "  Review metrics: $METRICS_FILE"
echo "  Check logs for detailed analysis"
