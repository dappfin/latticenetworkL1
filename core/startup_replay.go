package core

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"sort"

	"latticenetworkL1/core/dag"
	"latticenetworkL1/core/pq"
	"latticenetworkL1/node/consensus"
)

// StartupReplay handles full node replay on startup
type StartupReplay struct {
	GenesisFile string
	BlockDir    string
	DAG         *dag.GhostDAG
	pqValidator *pq.PQValidator
	posEngine   *dag.POSEngine
}

// NewStartupReplay creates a new StartupReplay instance
func NewStartupReplay(genesisFile, blockDir string) *StartupReplay {
	return &StartupReplay{
		GenesisFile: genesisFile,
		BlockDir:    blockDir,
		DAG:         dag.NewGhostDAG(),
	}
}

// LoadGenesis loads the genesis block from file
func (sr *StartupReplay) LoadGenesis() error {
	data, err := ioutil.ReadFile(sr.GenesisFile)
	if err != nil {
		return fmt.Errorf("failed to read genesis file: %w", err)
	}

	var genesisConfig map[string]interface{}
	if err := json.Unmarshal(data, &genesisConfig); err != nil {
		return fmt.Errorf("failed to parse genesis config: %w", err)
	}

	// Create genesis block from config
	timestamp, _ := genesisConfig["timestamp"].(float64)
	genesis := &dag.Block{
		Hash:      "genesis",
		Parents:   []string{},
		Height:    0,
		BlueScore: 0,
		Timestamp: int64(timestamp),
	}

	sr.DAG.AddBlock(genesis)
	return nil
}

// DeserializeBlock deserializes a block from JSON data
func DeserializeBlock(data []byte) (*dag.Block, error) {
	var block dag.Block
	if err := json.Unmarshal(data, &block); err != nil {
		return nil, fmt.Errorf("failed to deserialize block: %w", err)
	}
	return &block, nil
}

// LoadBlocksFromDisk loads all persisted blocks in deterministic order
func (sr *StartupReplay) LoadBlocksFromDisk() ([]*dag.Block, error) {
	files, err := filepath.Glob(filepath.Join(sr.BlockDir, "*.json"))
	if err != nil {
		return nil, fmt.Errorf("failed to read block directory: %w", err)
	}

	// Sort alphabetically for deterministic replay
	sort.Strings(files)

	blocks := []*dag.Block{}
	for _, f := range files {
		data, err := ioutil.ReadFile(f)
		if err != nil {
			return nil, fmt.Errorf("failed to read block file %s: %w", f, err)
		}

		block, err := DeserializeBlock(data)
		if err != nil {
			return nil, fmt.Errorf("failed to deserialize block %s: %w", f, err)
		}

		blocks = append(blocks, block)
	}

	return blocks, nil
}

// ValidateAndAddBlock validates a block and adds it to the DAG
func (sr *StartupReplay) ValidateAndAddBlock(block *dag.Block) error {
	// Full validation during replay to ensure consistency
	if sr.pqValidator != nil && sr.posEngine != nil {
		if err := consensus.ValidateBlock(block, sr.DAG, sr.pqValidator, sr.posEngine); err != nil {
			return fmt.Errorf("block validation failed during replay: %w", err)
		}
	}

	// Add block to DAG
	if err := sr.DAG.AddBlock(block); err != nil {
		return fmt.Errorf("failed to add block to DAG during replay: %w", err)
	}

	return nil
}

// Replay loads genesis and all blocks, validates, and rebuilds DAG
func (sr *StartupReplay) Replay() error {
	// Load genesis first
	if err := sr.LoadGenesis(); err != nil {
		return err
	}

	// Load persisted blocks
	blocks, err := sr.LoadBlocksFromDisk()
	if err != nil {
		return err
	}

	for _, blk := range blocks {
		if err := sr.ValidateAndAddBlock(blk); err != nil {
			return fmt.Errorf("block %s failed validation during replay: %w", blk.Hash, err)
		}
	}

	return nil
}

// SetPQValidator sets the PQ validator for validation during replay
func (sr *StartupReplay) SetPQValidator(pqValidator *pq.PQValidator) {
	sr.pqValidator = pqValidator
}

// SetPOSEngine sets the PoS engine for validation during replay
func (sr *StartupReplay) SetPOSEngine(posEngine *dag.POSEngine) {
	sr.posEngine = posEngine
}

// VerifyReplay ensures DAG state matches expected head or other invariants
func (sr *StartupReplay) VerifyReplay(expectedHead string) error {
	tips := sr.DAG.GetTips()
	if len(tips) == 0 {
		return fmt.Errorf("no tips found in DAG after replay")
	}

	// Use the first tip as head for verification
	head := tips[0]
	if head.Hash != expectedHead {
		return fmt.Errorf("replay verification failed: head %s != expected %s", head.Hash, expectedHead)
	}
	return nil
}
