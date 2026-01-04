#!/usr/bin/env bash
set -euo pipefail

echo "=== Simple Lattice Network Test ==="

# Test 1: Check node connectivity
echo "1. Testing node connectivity..."
for port in 8545 8547 8549 8551; do
    echo -n "Node on port $port: "
    if curl -s --max-time 3 -X POST -H 'Content-Type: application/json' \
        --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
        "http://localhost:$port" | grep -q "activeValidators"; then
        echo "✅ CONNECTED"
    else
        echo "❌ FAILED"
    fi
done

# Test 2: Check consensus state
echo ""
echo "2. Testing consensus state..."
for port in 8545 8547 8549 8551; do
    echo -n "Node $(( (port-8545)/2 + 1 )) consensus: "
    result=$(curl -s --max-time 3 -X POST -H 'Content-Type: application/json' \
        --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
        "http://localhost:$port")
    
    if echo "$result" | grep -q "activeValidators.*4"; then
        echo "✅ 4/4 validators active"
    else
        echo "❌ Invalid consensus state"
    fi
done

# Test 3: Simple RPC latency test
echo ""
echo "3. Testing RPC latency..."
for port in 8545 8547 8549 8551; do
    echo -n "Node $(( (port-8545)/2 + 1 )) latency: "
    start_time=$(date +%s%N)
    if curl -s --max-time 3 -X POST -H 'Content-Type: application/json' \
        --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
        "http://localhost:$port" >/dev/null 2>&1; then
        end_time=$(date +%s%N)
        latency_ms=$(((end_time - start_time) / 1000000))
        echo "✅ ${latency_ms}ms"
    else
        echo "❌ TIMEOUT"
    fi
done

# Test 4: Block progression test
echo ""
echo "4. Testing block progression..."
initial_block=$(curl -s --max-time 3 -X POST -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
    "http://localhost:8545" | jq -r '.result.currentBlock')

echo "Initial block: $initial_block"
sleep 10

final_block=$(curl -s --max-time 3 -X POST -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
    "http://localhost:8545" | jq -r '.result.currentBlock')

echo "Final block: $final_block"

if [[ $final_block -gt $initial_block ]]; then
    echo "✅ Block progression: +$((final_block - initial_block)) blocks"
else
    echo "❌ No block progression"
fi

# Test 5: Minimal load test (10 requests over 5 seconds)
echo ""
echo "5. Minimal load test (10 requests over 5 seconds)..."
success_count=0
start_time=$(date +%s)

for i in {1..10}; do
    if curl -s --max-time 2 -X POST -H 'Content-Type: application/json' \
        --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
        "http://localhost:8545" >/dev/null 2>&1; then
        ((success_count++))
    fi
    sleep 0.5
done

end_time=$(date +%s)
duration=$((end_time - start_time))

echo "Load test results: $success_count/10 successful in ${duration}s"
if [[ $success_count -ge 8 ]]; then
    echo "✅ Load test passed"
else
    echo "❌ Load test failed"
fi

echo ""
echo "=== Test Summary ==="
echo "All basic connectivity and functionality tests completed."
echo "Network is ready for TPS escalation testing."
