#!/bin/bash

set -e

echo "=== Lattice Network 4-Node Startup Script ==="

# Step 1: Cleanup
echo "Cleaning up old processes and files..."
pkill -9 lattice_node 2>/dev/null || true
fuser -k 8545/tcp 8547/tcp 8549/tcp 8551/tcp 2>/dev/null || true
rm -rf ./nodes/*
rm -rf ./nodes/*
rm -f ./nodes/*.db ./nodes/*.db ./lattice_indexer.db

# Step 2: Ensure directories exist
echo "Creating necessary directories..."
mkdir -p ./nodes/node1
mkdir -p ./nodes/node2
mkdir -p ./nodes/node3
mkdir -p ./nodes/node4
mkdir -p ./nodes/node1
mkdir -p ./nodes/node2
mkdir -p ./nodes/node3
mkdir -p ./nodes/node4

# Step 3: Set permissions
echo "Setting validator key permissions..."
chmod 600 ./lattice/validators/keys/*.priv 2>/dev/null || true
chmod 444 ./lattice/validators/keys/*.pub 2>/dev/null || true
chmod 444 ./lattice/validators/keys/*.hex 2>/dev/null || true

# Step 4: Verify genesis and EVM allocations
echo "Verifying genesis configuration..."
echo "Genesis hash: $(cat ./lattice/genesis/genesis_hash.txt)"
echo "EVM allocations: $(cat ./evm/config/genesis_allocations.json)"

# Step 5: Start nodes
echo "Starting 4-node network..."

# Node 1
echo "Starting Node 1 (RPC: 8545)..."
./lattice-l1/lattice_node \
  --validators ./lattice/genesis/validators.registry.json \
  --rpc-config ./rpc/config/rpc_node1.json \
  --indexer-config ./indexer/data/indexer_config_node1.json \
  --log-dir ./nodes/node1 \
  --indexer-log-dir ./nodes/node1 \
  --genesis ./lattice/genesis/genesis_hash.txt \
  --evm ./evm/config/genesis_allocations.json \
  > ./nodes/node1/node.log 2>&1 &

NODE1_PID=$!
echo "Node 1 started with PID: $NODE1_PID"
sleep 2

# Node 2
echo "Starting Node 2 (RPC: 8547)..."
./lattice-l1/lattice_node \
  --validators ./lattice/genesis/validators.registry.json \
  --rpc-config ./rpc/config/rpc_node2.json \
  --indexer-config ./indexer/data/indexer_config_node2.json \
  --log-dir ./nodes/node2 \
  --indexer-log-dir ./nodes/node2 \
  --genesis ./lattice/genesis/genesis_hash.txt \
  --evm ./evm/config/genesis_allocations.json \
  > ./nodes/node2/node.log 2>&1 &

NODE2_PID=$!
echo "Node 2 started with PID: $NODE2_PID"
sleep 2

# Node 3
echo "Starting Node 3 (RPC: 8549)..."
./lattice-l1/lattice_node \
  --validators ./lattice/genesis/validators.registry.json \
  --rpc-config ./rpc/config/rpc_node3.json \
  --indexer-config ./indexer/data/indexer_config_node3.json \
  --log-dir ./nodes/node3 \
  --indexer-log-dir ./nodes/node3 \
  --genesis ./lattice/genesis/genesis_hash.txt \
  --evm ./evm/config/genesis_allocations.json \
  > ./nodes/node3/node.log 2>&1 &

NODE3_PID=$!
echo "Node 3 started with PID: $NODE3_PID"
sleep 2

# Node 4
echo "Starting Node 4 (RPC: 8551)..."
./lattice-l1/lattice_node \
  --validators ./lattice/genesis/validators.registry.json \
  --rpc-config ./rpc/config/rpc_node4.json \
  --indexer-config ./indexer/data/indexer_config_node4.json \
  --log-dir ./nodes/node4 \
  --indexer-log-dir ./nodes/node4 \
  --genesis ./lattice/genesis/genesis_hash.txt \
  --evm ./evm/config/genesis_allocations.json \
  > ./nodes/node4/node.log 2>&1 &

NODE4_PID=$!
echo "Node 4 started with PID: $NODE4_PID"

# Step 6: Wait for nodes to start
echo "Waiting for nodes to initialize..."
sleep 15

# Step 7: Verify network state
echo "=== Verifying Network State ==="
echo "Checking consensus state on each node..."

for port in 8545 8547 8549 8551; do
    echo -n "Node on port $port: "
    result=$(curl -s -X POST -H 'Content-Type: application/json' \
      --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
      http://localhost:$port 2>/dev/null)
    
    if [ $? -eq 0 ] && [ "$result" != "" ]; then
        active=$(echo "$result" | grep -o '"activeValidators":[0-9]*' | cut -d':' -f2)
        total=$(echo "$result" | grep -o '"totalValidators":[0-9]*' | cut -d':' -f2)
        echo "Active: $active/$total validators"
    else
        echo "Failed to connect"
    fi
done

# Step 8: Save PIDs for cleanup
echo $NODE1_PID > /tmp/lattice_node1.pid
echo $NODE2_PID > /tmp/lattice_node2.pid
echo $NODE3_PID > /tmp/lattice_node3.pid
echo $NODE4_PID > /tmp/lattice_node4.pid

echo "=== All 4 nodes started ==="
echo "Node 1: RPC 8545 (PID: $NODE1_PID)"
echo "Node 2: RPC 8547 (PID: $NODE2_PID)"
echo "Node 3: RPC 8549 (PID: $NODE3_PID)"
echo "Node 4: RPC 8551 (PID: $NODE4_PID)"
echo ""
echo "To check consensus state:"
echo "curl -X POST -H 'Content-Type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"lattice_getConsensusState\",\"params\":[],\"id\":1}' http://localhost:8545"
echo ""
echo "To stop all nodes: pkill -9 lattice_node"
