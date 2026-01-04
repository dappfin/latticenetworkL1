#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# CONFIG (single source of truth)
###############################################################################

MAX_NODES=4
BASE_RPC_PORT=8545
BASE_DIR="$(pwd)"

NODE_BIN="./bin/lattice_node"
GENESIS="./genesis/genesis_hash.txt"
VALIDATORS="./validators/registry/validators.active.json"
EVM_GENESIS="./evm/genesis_allocations.json"

RPC_CONFIG_DIR="./nodes"
INDEXER_CONFIG_DIR="./nodes"
INDEXER_DB_DIR="./nodes"

STARTUP_WAIT=12
PROPAGATION_WAIT=8

###############################################################################
# INPUT
###############################################################################

NODES="${1:-}"

if [[ -z "$NODES" ]]; then
  echo "Usage: $0 <2|3|4>"
  exit 1
fi

if ! [[ "$NODES" =~ ^[234]$ ]]; then
  echo "Error: node count must be 2, 3, or 4"
  exit 1
fi

echo "================================================"
echo "VERIFYING LATTICE NETWORK ($NODES NODE PROCESS[ES])"
echo "================================================"
echo

###############################################################################
# CLEAN START
###############################################################################

echo "[1/6] Stopping existing nodes..."
pkill -9 lattice_node 2>/dev/null || true
sleep 1

echo "[2/6] Cleaning old logs and databases..."
# rm -f nodes/*/db/indexer.db
rm -rf nodes/*/logs/*

mkdir -p "$INDEXER_DB_DIR"

###############################################################################
# RUNTIME PATH AUDIT
###############################################################################

echo "[PATH CHECK] Validator registry:"
if [[ ! -f "$VALIDATORS" ]]; then
  echo "❌ ERROR: Validator registry missing: $VALIDATORS"
  exit 1
fi
realpath "$VALIDATORS"

echo "[PATH CHECK] Node configs:"
declare -A validator_bindings
for n in nodes/node*/node.json; do
  if [[ ! -f "$n" ]]; then
    echo "❌ ERROR: Node config missing: $n"
    exit 1
  fi
  echo "  → $n"
  validator_id=$(jq -r '.validator_id' "$n")
  echo "    validator_id: $validator_id"
  
  # Track validator bindings for duplicate detection
  if [[ "$validator_id" != "null" ]]; then
    if [[ -n "${validator_bindings[$validator_id]:-}" ]]; then
      echo "❌ ERROR: Duplicate validator binding detected"
      echo "  Validator $validator_id bound to multiple nodes:"
      echo "    - ${validator_bindings[$validator_id]}"
      echo "    - $n"
      exit 1
    fi
    validator_bindings[$validator_id]="$n"
  fi
done

echo "[PATH CHECK] Validator key files:"
for n in nodes/node*/node.json; do
  validator_id=$(jq -r '.validator_id' "$n")
  if [[ "$validator_id" != "null" ]]; then
    key_path=$(jq -r '.validator_key' "$n")
    full_key_path="$(dirname "$n")/$key_path"
    if [[ ! -f "$full_key_path" ]]; then
      echo "❌ ERROR: Validator key missing: $full_key_path"
      exit 1
    fi
    echo "  → $full_key_path"
  fi
done

echo "[PATH CHECK] Validator existence verification:"
registry_validators=$(jq -r '.validators[].id' "$VALIDATORS")
for n in nodes/node*/node.json; do
  validator_id=$(jq -r '.validator_id' "$n")
  if [[ "$validator_id" != "null" ]]; then
    if ! echo "$registry_validators" | grep -q "^$validator_id$"; then
      echo "❌ ERROR: Node references non-existent validator $validator_id"
      echo "  Node config: $n"
      echo "  Available validators: $registry_validators"
      exit 1
    fi
    echo "  ✓ Node $n validator $validator_id exists in registry"
  fi
done

echo "✅ All path checks passed"
echo

###############################################################################
# START NODES
###############################################################################

echo "[3/6] Starting $NODES node process(es)..."

for i in $(seq 1 "$NODES"); do
  RPC_PORT=$((BASE_RPC_PORT + (i - 1) * 2))
  NODE_DIR="nodes/node$i"
  NODE_CFG="$NODE_DIR/node.json"
  RPC_CFG="$NODE_DIR/rpc.json"
  IDX_CFG="$NODE_DIR/indexer.json"

  echo "  → Node$i (RPC $RPC_PORT)"

  "$NODE_BIN" \
    --node-config "$NODE_CFG" \
    --validator-registry "$VALIDATORS" \
    --rpc-config "$RPC_CFG" \
    --indexer-config "$IDX_CFG" \
    --log-dir "$NODE_DIR/logs" \
    --genesis "$GENESIS" \
    --evm "$EVM_GENESIS" \
    >/dev/null 2>&1 &

  sleep 1
done

echo "Waiting $STARTUP_WAIT seconds for initialization..."
sleep "$STARTUP_WAIT"
echo

###############################################################################
# DATABASE VERIFICATION
###############################################################################

echo "[4/6] Verifying SQLite database creation..."

DB_OK=true

for i in $(seq 1 "$NODES"); do
  DB_PATH="nodes/node$i/db/indexer.db"

  if [[ ! -f "$DB_PATH" ]]; then
    echo "  ❌ Node$i DB MISSING: $DB_PATH"
    DB_OK=false
  else
    if file "$DB_PATH" | grep -qi sqlite; then
      echo "  ✅ Node$i DB OK: $DB_PATH"
    else
      echo "  ❌ Node$i DB EXISTS but NOT SQLITE"
      DB_OK=false
    fi
  fi
done

echo

###############################################################################
# CONSENSUS VERIFICATION
###############################################################################

echo "[5/6] Verifying consensus state (STATIC VALIDATOR SET)..."

BLOCKS=()
VALIDATOR_REPORT_OK=true

for i in $(seq 1 "$NODES"); do
  PORT=$((BASE_RPC_PORT + (i - 1) * 2))

  STATE=$(curl -s -X POST \
    -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
    "http://localhost:$PORT")

  if echo "$STATE" | grep -q '"error"'; then
    echo "  ❌ Node$i RPC error"
    VALIDATOR_REPORT_OK=false
    continue
  fi

  BLOCK=$(echo "$STATE" | jq -r '.result.currentBlock')
  ACTIVE=$(echo "$STATE" | jq -r '.result.activeValidators')
  TOTAL=$(echo "$STATE" | jq -r '.result.totalValidators')

  BLOCKS+=("$BLOCK")

  echo "  Node$i → Block $BLOCK | Validators $ACTIVE/$TOTAL"

  if [[ "$ACTIVE" != "$TOTAL" ]]; then
    VALIDATOR_REPORT_OK=false
  fi
done

echo
echo "NOTE:"
echo "  Validator count is STATIC by genesis design."
echo "  Running fewer node processes does NOT reduce validators."
echo "  Each node currently simulates all validators internally."
echo

echo "Waiting $PROPAGATION_WAIT seconds for block propagation..."
sleep "$PROPAGATION_WAIT"

###############################################################################
# BLOCK PROPAGATION CHECK
###############################################################################

echo "[6/6] Verifying block propagation..."

# Re-query consensus state after propagation wait
BLOCKS=()
for i in $(seq 1 "$NODES"); do
  PORT=$((BASE_RPC_PORT + (i - 1) * 2))

  STATE=$(curl -s -X POST \
    -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
    "http://localhost:$PORT")

  BLOCK=$(echo "$STATE" | jq -r '.result.currentBlock')
  BLOCKS+=("$BLOCK")
done

FIRST_BLOCK="${BLOCKS[0]}"
PROP_OK=true

for b in "${BLOCKS[@]}"; do
  if [[ "$b" != "$FIRST_BLOCK" ]]; then
    PROP_OK=false
  fi
done

if $PROP_OK; then
  echo "  ✅ All nodes report same block height ($FIRST_BLOCK)"
else
  echo "  ❌ Block heights differ: ${BLOCKS[*]}"
fi

echo
echo "================================================"
echo "TEST SUMMARY"
echo "================================================"

$DB_OK && echo "✅ SQLite DB creation: OK" || echo "❌ SQLite DB creation: FAILED"
$VALIDATOR_REPORT_OK && echo "✅ Consensus health: OK" || echo "❌ Consensus health: FAILED"
$PROP_OK && echo "✅ Block propagation: OK" || echo "❌ Block propagation: FAILED"

echo
echo "Stopping nodes..."
pkill -9 lattice_node 2>/dev/null || true

echo "DONE."
