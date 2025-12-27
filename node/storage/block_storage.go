package storage

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"

	"latticenetworkL1/core/dag"
)

// BlockStorage handles deterministic block persistence to disk
type BlockStorage struct {
	dataDir     string
	blockDir    string
	genesisFile string
	logFile     string
	logFd       *os.File
	mutex       sync.RWMutex
}

// BlockFile represents a stored block file with metadata
type BlockFile struct {
	Height    int64    `json:"height"`
	Hash      string   `json:"hash"`
	Timestamp int64    `json:"timestamp"`
	Parents   []string `json:"parents"`
}

// NewBlockStorage creates a new block storage instance
func NewBlockStorage(dataDir string) (*BlockStorage, error) {
	blockDir := filepath.Join(dataDir, "blocks")
	genesisFile := filepath.Join(dataDir, "genesis.json")
	logFile := filepath.Join(dataDir, "blocks.log")

	// Create directories if they don't exist
	if err := os.MkdirAll(blockDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create block directory: %v", err)
	}

	// Open append-only log file
	logFd, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open block log file: %v", err)
	}

	return &BlockStorage{
		dataDir:     dataDir,
		blockDir:    blockDir,
		genesisFile: genesisFile,
		logFile:     logFile,
		logFd:       logFd,
	}, nil
}

// StoreBlock stores a block deterministically to disk
func (bs *BlockStorage) StoreBlock(block *dag.Block) error {
	bs.mutex.Lock()
	defer bs.mutex.Unlock()

	// Create block file with deterministic naming: height_hash.json
	filename := fmt.Sprintf("%d_%s.json", block.Height, block.Hash)
	filepath := filepath.Join(bs.blockDir, filename)

	// Marshal block to JSON with full metadata
	blockData := map[string]interface{}{
		"hash":            block.Hash,
		"parents":         block.Parents,
		"height":          block.Height,
		"blue_score":      block.BlueScore,
		"selected_parent": block.SelectedParent,
		"blue_work":       block.BlueWork,
		"timestamp":       block.Timestamp,
		"signature":       block.Signature,
	}

	jsonData, err := json.MarshalIndent(blockData, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal block: %v", err)
	}

	// Write atomically
	if err := ioutil.WriteFile(filepath, jsonData, 0644); err != nil {
		return fmt.Errorf("failed to write block file: %v", err)
	}

	// Append to append-only log for deterministic ordering
	logEntry := map[string]interface{}{
		"action":    "store_block",
		"height":    block.Height,
		"hash":      block.Hash,
		"timestamp": block.Timestamp,
		"parents":   block.Parents,
	}
	logData, err := json.Marshal(logEntry)
	if err != nil {
		return fmt.Errorf("failed to marshal log entry: %v", err)
	}

	if _, err := bs.logFd.Write(append(logData, '\n')); err != nil {
		return fmt.Errorf("failed to append to block log: %v", err)
	}

	if err := bs.logFd.Sync(); err != nil {
		return fmt.Errorf("failed to sync block log: %v", err)
	}

	return nil
}

// LoadBlocks loads all blocks from disk in deterministic order
func (bs *BlockStorage) LoadBlocks() ([]*dag.Block, error) {
	bs.mutex.RLock()
	defer bs.mutex.RUnlock()

	// Read all block files
	files, err := ioutil.ReadDir(bs.blockDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []*dag.Block{}, nil
		}
		return nil, fmt.Errorf("failed to read block directory: %v", err)
	}

	// Parse and sort files by height then hash
	blockFiles := make([]BlockFile, 0, len(files))
	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		// Parse filename: height_hash.json
		parts := strings.Split(strings.TrimSuffix(file.Name(), ".json"), "_")
		if len(parts) < 2 {
			continue
		}

		height, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			continue
		}

		hash := strings.Join(parts[1:], "_")

		blockFiles = append(blockFiles, BlockFile{
			Height: height,
			Hash:   hash,
		})
	}

	// Sort deterministically by height then hash
	sort.Slice(blockFiles, func(i, j int) bool {
		if blockFiles[i].Height != blockFiles[j].Height {
			return blockFiles[i].Height < blockFiles[j].Height
		}
		return blockFiles[i].Hash < blockFiles[j].Hash
	})

	// Load blocks in order
	blocks := make([]*dag.Block, 0, len(blockFiles))
	for _, bf := range blockFiles {
		block, err := bs.loadBlockFile(bf)
		if err != nil {
			return nil, fmt.Errorf("failed to load block %d_%s: %v", bf.Height, bf.Hash, err)
		}
		blocks = append(blocks, block)
	}

	return blocks, nil
}

// loadBlockFile loads a specific block file
func (bs *BlockStorage) loadBlockFile(bf BlockFile) (*dag.Block, error) {
	filename := fmt.Sprintf("%d_%s.json", bf.Height, bf.Hash)
	filepath := filepath.Join(bs.blockDir, filename)

	data, err := ioutil.ReadFile(filepath)
	if err != nil {
		return nil, fmt.Errorf("failed to read block file: %v", err)
	}

	var blockData map[string]interface{}
	if err := json.Unmarshal(data, &blockData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal block data: %v", err)
	}

	// Reconstruct block
	block := &dag.Block{
		Hash:           getString(blockData, "hash"),
		Parents:        getStringSlice(blockData, "parents"),
		Height:         getInt64(blockData, "height"),
		BlueScore:      getInt64(blockData, "blue_score"),
		SelectedParent: getString(blockData, "selected_parent"),
		BlueWork:       getInt64(blockData, "blue_work"),
		Timestamp:      getInt64(blockData, "timestamp"),
		Signature:      getString(blockData, "signature"),
	}

	return block, nil
}

// StoreGenesis stores the genesis configuration
func (bs *BlockStorage) StoreGenesis(genesis interface{}) error {
	bs.mutex.Lock()
	defer bs.mutex.Unlock()

	jsonData, err := json.MarshalIndent(genesis, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal genesis: %v", err)
	}

	if err := ioutil.WriteFile(bs.genesisFile, jsonData, 0644); err != nil {
		return fmt.Errorf("failed to write genesis file: %v", err)
	}

	return nil
}

// LoadGenesis loads the genesis configuration
func (bs *BlockStorage) LoadGenesis(target interface{}) error {
	bs.mutex.RLock()
	defer bs.mutex.RUnlock()

	data, err := ioutil.ReadFile(bs.genesisFile)
	if err != nil {
		return fmt.Errorf("failed to read genesis file: %v", err)
	}

	if err := json.Unmarshal(data, target); err != nil {
		return fmt.Errorf("failed to unmarshal genesis: %v", err)
	}

	return nil
}

// GetBlockCount returns the number of stored blocks
func (bs *BlockStorage) GetBlockCount() (int, error) {
	bs.mutex.RLock()
	defer bs.mutex.RUnlock()

	files, err := ioutil.ReadDir(bs.blockDir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, fmt.Errorf("failed to read block directory: %v", err)
	}

	count := 0
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".json") {
			count++
		}
	}

	return count, nil
}

// Clear removes all stored blocks (for testing)
func (bs *BlockStorage) Clear() error {
	bs.mutex.Lock()
	defer bs.mutex.Unlock()

	if err := os.RemoveAll(bs.blockDir); err != nil {
		return fmt.Errorf("failed to clear block directory: %v", err)
	}

	return os.MkdirAll(bs.blockDir, 0755)
}

// Helper functions for JSON parsing
func getString(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func getStringSlice(m map[string]interface{}, key string) []string {
	if val, ok := m[key].([]interface{}); ok {
		result := make([]string, len(val))
		for i, v := range val {
			if s, ok := v.(string); ok {
				result[i] = s
			}
		}
		return result
	}
	return []string{}
}

func getInt64(m map[string]interface{}, key string) int64 {
	if val, ok := m[key].(float64); ok {
		return int64(val)
	}
	return 0
}

// GetBlock retrieves a specific block by hash
func (bs *BlockStorage) GetBlock(hash string) (*dag.Block, error) {
	bs.mutex.RLock()
	defer bs.mutex.RUnlock()

	// Search through all block files
	files, err := ioutil.ReadDir(bs.blockDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read block directory: %v", err)
	}

	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		// Parse filename: height_hash.json
		parts := strings.Split(strings.TrimSuffix(file.Name(), ".json"), "_")
		if len(parts) < 2 {
			continue
		}

		blockHash := strings.Join(parts[1:], "_")
		if blockHash == hash {
			height, err := strconv.ParseInt(parts[0], 10, 64)
			if err != nil {
				continue
			}

			bf := BlockFile{
				Height: height,
				Hash:   blockHash,
			}

			return bs.loadBlockFile(bf)
		}
	}

	return nil, fmt.Errorf("block %s not found", hash)
}

// GetFinalizedHeight returns the current finalized block height
func (bs *BlockStorage) GetFinalizedHeight() int64 {
	bs.mutex.RLock()
	defer bs.mutex.RUnlock()

	// Get the highest block height as finalized height
	files, err := ioutil.ReadDir(bs.blockDir)
	if err != nil {
		return 0
	}

	var maxHeight int64 = 0
	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		// Parse filename: height_hash.json
		parts := strings.Split(strings.TrimSuffix(file.Name(), ".json"), "_")
		if len(parts) < 2 {
			continue
		}

		height, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			continue
		}

		if height > maxHeight {
			maxHeight = height
		}
	}

	return maxHeight
}

// Close closes the block storage and log file
func (bs *BlockStorage) Close() error {
	bs.mutex.Lock()
	defer bs.mutex.Unlock()

	if bs.logFd != nil {
		return bs.logFd.Close()
	}
	return nil
}
