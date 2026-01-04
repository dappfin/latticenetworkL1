# Control-Path Verification

## Purpose
Before any transaction flood testing, verify the network's control paths are correct to prevent double-signing bugs and configuration errors.

## Runtime Path Audit

The `verify_partial_nodes.sh` script now includes comprehensive path verification:

### 1. Registry Validation
- ✅ Validator registry exists: `validators/registry/validators.active.json`
- ✅ Hard failure if missing

### 2. Node Configuration Checks
- ✅ All node configs exist: `nodes/node*/node.json`
- ✅ Extract and display `validator_id` for each node
- ✅ Track validator bindings to detect duplicates

### 3. Validator Key File Verification
- ✅ Key files exist for validator nodes
- ✅ Proper relative path resolution: `../../validators/keys/validatorX.key`

### 4. Validator Existence Verification
- ✅ Node references only validators that exist in registry
- ✅ Prevents orphaned validator bindings

### 5. Duplicate Detection
- ✅ Prevents multiple nodes binding same validator key
- ✅ Critical for preventing double-signing attacks

## Hard Failure Conditions

The script will exit with error if any of these conditions are met:

1. **Missing Registry**: `validators/registry/validators.active.json` not found
2. **Missing Node Config**: Any `nodes/node*/node.json` missing
3. **Missing Key File**: Validator key file not found for validator node
4. **Invalid Validator**: Node references non-existent validator ID
5. **Duplicate Binding**: Same validator ID bound to multiple nodes

## Usage

```bash
# Verify 2-node setup
./scripts/verify_partial_nodes.sh 2

# Verify 3-node setup  
./scripts/verify_partial_nodes.sh 3

# Verify 4-node setup
./scripts/verify_partial_nodes.sh 4
```

## Output Example

```
[PATH CHECK] Validator registry:
/home/auli/Latticenetwork/validators/registry/validators.active.json

[PATH CHECK] Node configs:
  → nodes/node1/node.json
    validator_id: 0
  → nodes/node2/node.json
    validator_id: 1
  → nodes/node3/node.json
    validator_id: null

[PATH CHECK] Validator key files:
  → nodes/node1/../../validators/keys/validator0.key
  → nodes/node2/../../validators/keys/validator1.key

[PATH CHECK] Validator existence verification:
  ✓ Node nodes/node1/node.json validator 0 exists in registry
  ✓ Node nodes/node2/node.json validator 1 exists in registry

✅ All path checks passed
```

## Why This Matters

This verification prevents the most common L1 mistakes:
- ❌ Double-signing from duplicate validator bindings
- ❌ Orphaned nodes referencing non-existent validators
- ❌ Missing key files causing startup failures
- ❌ Path resolution errors in production

Only after these checks pass should you proceed to transaction flood testing.
