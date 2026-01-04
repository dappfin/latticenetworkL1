#!/usr/bin/env bash
set -euo pipefail

# ================================
# LATTICE RPC LOAD TEST
# ================================

if [ $# -lt 3 ]; then
  echo "Usage: $0 <rpc_url> <rps> <duration_seconds>"
  echo "Example: $0 http://localhost:8545 1000 30"
  exit 1
fi

RPC_URL="$1"
RPS="$2"
DURATION="$3"

TOTAL_REQUESTS=$((RPS * DURATION))
INTERVAL_NS=$((1000000000 / RPS))

echo "======================================"
echo "RPC LOAD TEST START"
echo "RPC:        $RPC_URL"
echo "RPS:        $RPS"
echo "Duration:   $DURATION sec"
echo "Total Req:  $TOTAL_REQUESTS"
echo "======================================"

START_TIME=$(date +%s%N)
SENT=0
FAIL=0

send_request() {
  curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    --data '{
      "jsonrpc":"2.0",
      "method":"lattice_getConsensusState",
      "params":[],
      "id":1
    }' > /dev/null || return 1
}

NEXT_TICK=$START_TIME

for ((i=1; i<=TOTAL_REQUESTS; i++)); do
  NOW=$(date +%s%N)
  if (( NOW < NEXT_TICK )); then
    sleep $(awk "BEGIN {print ($NEXT_TICK - $NOW)/1000000000}")
  fi

  if send_request; then
    ((SENT++))
  else
    ((FAIL++))
  fi

  NEXT_TICK=$((NEXT_TICK + INTERVAL_NS))
done

END_TIME=$(date +%s%N)
ELAPSED_NS=$((END_TIME - START_TIME))
ELAPSED_S=$(awk "BEGIN {print $ELAPSED_NS/1000000000}")

echo "======================================"
echo "RPC LOAD TEST COMPLETE"
echo "Sent OK:     $SENT"
echo "Failed:      $FAIL"
echo "Elapsed:     ${ELAPSED_S}s"
echo "Effective RPS: $(awk "BEGIN {print $SENT/$ELAPSED_S}")"
echo "======================================"
