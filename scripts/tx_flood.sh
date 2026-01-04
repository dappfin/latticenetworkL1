#!/usr/bin/env bash
set -euo pipefail

# ================================
# LATTICE TX FLOOD HARNESS
# ================================

if [ $# -lt 3 ]; then
  echo "Usage: $0 <rpc_url> <tps> <duration_seconds>"
  echo "Example: $0 http://127.0.0.1:8545 1000 30"
  exit 1
fi

RPC_URL="$1"
TPS="$2"
DURATION="$3"

TOTAL_TX=$((TPS * DURATION))
INTERVAL_NS=$((1000000000 / TPS))

echo "======================================"
echo "TX FLOOD START"
echo "RPC:        $RPC_URL"
echo "TPS:        $TPS"
echo "Duration:   $DURATION sec"
echo "Total TX:   $TOTAL_TX"
echo "======================================"

START_TIME=$(date +%s%N)
SENT=0
FAIL=0

send_tx() {
  curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    --data '{
      "jsonrpc":"2.0",
      "method":"eth_sendRawTransaction",
      "params":["0xf86b808504a817c80082520894aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa880de0b6b3a76400008025a0aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
      "id":1
    }' > /dev/null || return 1
}

NEXT_TICK=$START_TIME

for ((i=1; i<=TOTAL_TX; i++)); do
  NOW=$(date +%s%N)
  if (( NOW < NEXT_TICK )); then
    sleep $(awk "BEGIN {print ($NEXT_TICK - $NOW)/1000000000}")
  fi

  if send_tx; then
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
echo "TX FLOOD COMPLETE"
echo "Sent OK:     $SENT"
echo "Failed:      $FAIL"
echo "Elapsed:     ${ELAPSED_S}s"
echo "Effective TPS: $(awk "BEGIN {print $SENT/$ELAPSED_S}")"
echo "======================================"
