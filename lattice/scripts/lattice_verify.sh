#!/bin/bash

echo "🧪 LATTICE VERIFICATION SCRIPT"

# JSON validation checks
echo "🔍 Validating JSON files..."
jq . lattice/genesis/validators.registry.json > /dev/null || exit 1
jq . lattice/evm/config/config.json > /dev/null || exit 1
jq . lattice/indexer/data/consensus_state.json > /dev/null || exit 1
jq . lattice/indexer/data/indexer_config.json > /dev/null || exit 1
jq . lattice/rpc/config/rpc_config.json > /dev/null || exit 1

# Content checks
echo "📋 Checking file contents..."
test -f lattice/genesis/genesis_hash.txt || exit 1
test -f lattice/validators/keys/validator_id.hex || exit 1

# Permission checks
echo "🔒 Checking permissions..."
test -r lattice/genesis/genesis_hash.txt || exit 1
test -r lattice/validators/keys/validator_id.hex || exit 1

# Directory structure check
echo "📁 Verifying directory structure..."
test -d lattice/genesis || exit 1
test -d lattice/validators || exit 1
test -d lattice/evm || exit 1
test -d lattice/rpc || exit 1
test -d lattice/indexer || exit 1

echo "✅ All checks passed!"
