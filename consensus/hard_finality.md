HARD FINALITY:

- Epoch-based finalization
- Epoch = fixed number of DAG layers
- After epoch commit:
  - No rollback
  - No reorg
- Checkpoint hash:
  - Keccak-256
  - Signed by ≥ 2/3 stake
