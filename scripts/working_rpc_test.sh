#!/usr/bin/env bash
set -euo pipefail

# Simple working RPC load test
RPC_URL=${1:-"http://localhost:8545"}
RPS=${2:-100}
DURATION=${3:-10}

TOTAL_REQUESTS=$((RPS * DURATION))
echo "Starting RPC load test: $RPS RPS for $DURATION seconds ($TOTAL_REQUESTS requests)"

START_TIME=$(date +%s)
SUCCESS=0
FAILED=0

# Simple loop without complex timing
for ((i=1; i<=TOTAL_REQUESTS; i++)); do
    if curl -s --max-time 2 -X POST -H 'Content-Type: application/json' \
        --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
        "$RPC_URL" >/dev/null 2>&1; then
        ((SUCCESS++))
    else
        ((FAILED++))
    fi
    
    # Simple rate limiting
    if (( i % RPS == 0 )); then
        sleep 1
    fi
done

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "Results:"
echo "  Successful: $SUCCESS"
echo "  Failed: $FAILED"
echo "  Duration: ${ELAPSED}s"
echo "  Actual RPS: $((SUCCESS / ELAPSED))"
