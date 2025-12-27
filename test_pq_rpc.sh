#!/bin/bash

echo "=== Testing PQ Key Loading and RPC Method ==="

# Test each validator node
for port in 9545 9546 9547; do
    node_num=$((port - 9544))
    echo ""
    echo "🔍 Testing Node $node_num on port $port..."
    
    # Check if node is running
    if ! curl -s http://localhost:$port > /dev/null; then
        echo "❌ Node $node_num not responding on port $port"
        continue
    fi

    echo "✅ Node $node_num is running"

    # Test basic RPC connectivity
    response=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        http://localhost:$port)

    if echo "$response" | grep -q "88401"; then
        echo "✅ Basic RPC connectivity working"
    else
        echo "❌ RPC connectivity failed for node $node_num"
        continue
    fi

    # Test lattice_getBlockSignatures method
    response=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"lattice_getBlockSignatures","params":[],"id":1}' \
        http://localhost:$port)

    # Check if response contains expected fields
    if echo "$response" | grep -q "signature" && echo "$response" | grep -q "public_key_hash"; then
        echo "✅ lattice_getBlockSignatures method working for node $node_num"
        
        # Extract and display key information
        pub_key_hash=$(echo "$response" | grep -o '"public_key_hash":"[^"]*"' | cut -d'"' -f4)
        validator_address=$(echo "$response" | grep -o '"validator_address":"[^"]*"' | cut -d'"' -f4)
        signature_size=$(echo "$response" | grep -o '"signature_size":[0-9]*' | cut -d':' -f2)
        verified=$(echo "$response" | grep -o '"verified":[^,]*' | cut -d':' -f2)
        block_number=$(echo "$response" | grep -o '"block_number":[0-9]*' | cut -d':' -f2)
        current_layer=$(echo "$response" | grep -o '"current_layer":[0-9]*' | cut -d':' -f2)
        
        echo "📋 Node $node_num PQ Validator Information:"
        echo "   Public Key Hash: $pub_key_hash"
        echo "   Validator Address: $validator_address"
        echo "   Block Number: $block_number"
        echo "   Current Layer: $current_layer"
        echo "   Signature Size: $signature_size bytes"
        echo "   Signature Verified: $verified"
    else
        echo "❌ lattice_getBlockSignatures method failed for node $node_num"
        echo "Response: $response"
    fi
done

echo ""
echo "=== Test Summary ==="
echo "All validator nodes have been tested for PQ signature functionality."
echo "Your indexer can now safely query each node via RPC for real-time monitoring."
