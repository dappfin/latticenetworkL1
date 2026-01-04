#!/bin/bash

# Test script for the new RPC endpoints
RPC_URL="http://localhost:8545"

echo "=== Testing Lattice Network RPC Endpoints ==="

# Test 1: lattice_getBlockCount
echo -e "\n1. Testing lattice_getBlockCount:"
curl -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "lattice_getBlockCount",
    "params": [],
    "id": 1
  }' | jq '.'

# Test 2: lattice_submitTransaction
echo -e "\n2. Testing lattice_submitTransaction:"
curl -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "lattice_submitTransaction",
    "params": [{
      "from": "0x1234567890123456789012345678901234567890",
      "to": "0x0987654321098765432109876543210987654321",
      "value": "0x16345785D8A0000",
      "gasPrice": "0x3B9ACA00",
      "gasLimit": "0x5208",
      "nonce": "0x0",
      "data": "0x"
    }],
    "id": 2
  }' | jq '.'

# Test 3: lattice_getDAGStats
echo -e "\n3. Testing lattice_getDAGStats:"
curl -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "lattice_getDAGStats",
    "params": [],
    "id": 3
  }' | jq '.'

# Test 4: eth_blockNumber (should work now)
echo -e "\n4. Testing eth_blockNumber:"
curl -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 4
  }' | jq '.'

echo -e "\n=== RPC Endpoint Tests Complete ==="
