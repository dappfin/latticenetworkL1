package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"latticenetworkL1/core/dag"
)

// BlockStore handles deterministic block persistence to disk
type BlockStore struct {
	dir   string
	mutex sync.RWMutex
}

// NewBlockStore creates a new block store with deterministic persistence
func NewBlockStore(dir string) *BlockStore {
	os.MkdirAll(dir, 0755)
	return &BlockStore{dir: dir}
}

// SaveBlock stores a block deterministically to disk
func (bs *BlockStore) SaveBlock(b *dag.Block) error {
	bs.mutex.Lock()
	defer bs.mutex.Unlock()

	// Create block file with deterministic naming: height_hash.json
	filename := fmt.Sprintf("%020d_%s.json", b.Height, b.Hash)
	path := filepath.Join(bs.dir, filename)

	// write-once guarantee - check if file already exists
	if _, err := os.Stat(path); err == nil {
		return nil // Already exists, no error
	}

	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("failed to create block file: %v", err)
	}
	defer f.Close()

	if err := json.NewEncoder(f).Encode(b); err != nil {
		return fmt.Errorf("failed to encode block: %v", err)
	}

	return nil
}

// LoadBlocks loads all blocks from disk in deterministic order
func (bs *BlockStore) LoadBlocks() ([]*dag.Block, error) {
	bs.mutex.RLock()
	defer bs.mutex.RUnlock()

	files, err := os.ReadDir(bs.dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []*dag.Block{}, nil
		}
		return nil, fmt.Errorf("failed to read block directory: %v", err)
	}

	// Parse and sort files by height then hash for deterministic loading
	blockFiles := make([]string, 0, len(files))
	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".json" {
			blockFiles = append(blockFiles, file.Name())
		}
	}

	// Sort deterministically by filename (height_hash)
	// This ensures blocks are loaded in the correct order
	for i := 0; i < len(blockFiles)-1; i++ {
		for j := i + 1; j < len(blockFiles); j++ {
			if blockFiles[i] > blockFiles[j] {
				blockFiles[i], blockFiles[j] = blockFiles[j], blockFiles[i]
			}
		}
	}

	// Load blocks in order
	blocks := make([]*dag.Block, 0, len(blockFiles))
	for _, filename := range blockFiles {
		block, err := bs.loadBlockFile(filename)
		if err != nil {
			return nil, fmt.Errorf("failed to load block %s: %v", filename, err)
		}
		blocks = append(blocks, block)
	}

	return blocks, nil
}

// loadBlockFile loads a specific block file
func (bs *BlockStore) loadBlockFile(filename string) (*dag.Block, error) {
	path := filepath.Join(bs.dir, filename)

	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open block file: %v", err)
	}
	defer f.Close()

	var block dag.Block
	if err := json.NewDecoder(f).Decode(&block); err != nil {
		return nil, fmt.Errorf("failed to decode block: %v", err)
	}

	return &block, nil
}

// GetBlockCount returns the number of stored blocks
func (bs *BlockStore) GetBlockCount() int {
	bs.mutex.RLock()
	defer bs.mutex.RUnlock()

	files, err := os.ReadDir(bs.dir)
	if err != nil {
		return 0
	}

	count := 0
	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".json" {
			count++
		}
	}

	return count
}

// Clear removes all stored blocks (for testing)
func (bs *BlockStore) Clear() error {
	bs.mutex.Lock()
	defer bs.mutex.Unlock()

	files, err := os.ReadDir(bs.dir)
	if err != nil {
		return err
	}

	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".json" {
			path := filepath.Join(bs.dir, file.Name())
			if err := os.Remove(path); err != nil {
				return fmt.Errorf("failed to remove block file %s: %v", file.Name(), err)
			}
		}
	}

	return nil
}
