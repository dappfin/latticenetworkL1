# Lattice Network

A decentralized blockchain network with dynamic validator management and clean architecture.

## Structure

```
Latticenetwork/
├── bin/                     # Compiled binaries
├── genesis/                 # Genesis state (immutable)
├── validators/              # Validator management
├── nodes/                  # Node-specific configurations
├── evm/                    # EVM-related configurations
├── scripts/                # Management scripts
└── README.md
```

## Key Principles

- No hard-coded paths
- No implicit defaults
- Validator set = data, not code
- Node process ≠ validator
- Genesis = initial state only

## Usage

Start nodes: `./scripts/start_nodes.sh`
Verify nodes: `./scripts/verify_partial_nodes.sh`
Manage validators: `./scripts/validator_admin.sh`
