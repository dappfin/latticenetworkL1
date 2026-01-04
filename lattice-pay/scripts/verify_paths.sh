#!/bin/bash
set -e

REQUIRED=(
  contracts/Paymaster.sol
  contracts/SubscriptionNFT.sol
  contracts/SessionManager.sol
  contracts/GatewayRegistry.sol
  config/lattice-l1.json
  config/paymaster.rules.json
)

for f in "${REQUIRED[@]}"; do
  [ -f "$f" ] || { echo "❌ Missing $f"; exit 1; }
done

echo "✅ All required files present"
