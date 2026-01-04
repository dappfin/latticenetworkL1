# Dynamic Validator Model

## Core Principle
Validators are NOT tied to node count. The validator registry is the single source of truth.

## Architecture

### 1. Validator Registry (Runtime Authority)
`validators/registry/validators.active.json`

```json
{
  "epoch": 0,
  "validators": [
    {
      "id": 0,
      "pubkey": "0xabc...",
      "stake": 1000000,
      "status": "active"
    }
  ]
}
```

**Operations:**
- ✅ Add validators
- ✅ Remove validators  
- ✅ Slash validators
- ✅ Rotate validators
- ❌ Genesis never changes this

### 2. Node Identity Configuration
`nodes/nodeX/node.json`

**Validator Node:**
```json
{
  "node_id": "node1",
  "validator_id": 0,
  "validator_key": "../../validators/keys/validator0.key"
}
```

**Non-Validator Node:**
```json
{
  "node_id": "node5",
  "validator_id": null
}
```

**Supported Node Types:**
- Full nodes (with validator key)
- Observer nodes (validator_id: null)
- Partial nodes (limited functionality)

### 3. Consensus Engine Requirements

**At Startup:**
1. Load `validators.active.json`
2. Check node config for `validator_id`
3. If present → bind key and sign blocks
4. If null → passive consensus participant

**Critical Rule:** No validator simulation inside node once enabled.

## Key Benefits

- **Dynamic:** Validator set can change without node restarts
- **Flexible:** Any number of nodes can run any subset of validators
- **Clean:** Clear separation between node infrastructure and validator logic
- **Secure:** Keys are external to node code
