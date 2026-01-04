package dag

import (
	"container/heap"
	"fmt"
	"sort"
)

// Block represents a block in the DAG
type Block struct {
	Hash               string
	Parents            []string
	Height             int64
	BlueScore          int64
	SelectedParent     string
	BlueWork           int64
	Timestamp          int64
	Signature          string
	Transactions       []*Transaction
	ProducerID         string
	ProducerPubKeyHash string
}

// GhostDAG implements the GHOSTDAG total ordering algorithm
type GhostDAG struct {
	blocks    map[string]*Block
	heap      *BlockHeap
	processed map[string]bool
}

// BlockHeap implements a priority queue for blocks based on GHOSTDAG ordering
type BlockHeap []*Block

func (h BlockHeap) Len() int { return len(h) }

func (h BlockHeap) Less(i, j int) bool {
	// Primary sort by blue score (higher is better)
	if h[i].BlueScore != h[j].BlueScore {
		return h[i].BlueScore > h[j].BlueScore
	}

	// Secondary sort by blue work (higher is better)
	if h[i].BlueWork != h[j].BlueWork {
		return h[i].BlueWork > h[j].BlueWork
	}

	// Tertiary sort by hash (lexicographical for deterministic ordering)
	return h[i].Hash < h[j].Hash
}

func (h BlockHeap) Swap(i, j int) { h[i], h[j] = h[j], h[i] }

func (h *BlockHeap) Push(x interface{}) {
	*h = append(*h, x.(*Block))
}

func (h *BlockHeap) Pop() interface{} {
	old := *h
	n := len(old)
	item := old[n-1]
	*h = old[0 : n-1]
	return item
}

// NewGhostDAG creates a new GHOSTDAG instance
func NewGhostDAG() *GhostDAG {
	return &GhostDAG{
		blocks:    make(map[string]*Block),
		heap:      &BlockHeap{},
		processed: make(map[string]bool),
	}
}

// AddBlock adds a block to the DAG
func (gd *GhostDAG) AddBlock(block *Block) error {
	if _, exists := gd.blocks[block.Hash]; exists {
		return fmt.Errorf("block %s already exists", block.Hash)
	}

	gd.blocks[block.Hash] = block
	heap.Push(gd.heap, block)

	return nil
}

// GetBlock retrieves a block by hash
func (gd *GhostDAG) GetBlock(hash string) (*Block, bool) {
	block, exists := gd.blocks[hash]
	return block, exists
}

// GetTotalOrder returns the total ordering of blocks according to GHOSTDAG
func (gd *GhostDAG) GetTotalOrder() ([]*Block, error) {
	if len(gd.blocks) == 0 {
		return []*Block{}, nil
	}

	// Create a copy of the heap for ordering
	tempHeap := &BlockHeap{}
	heap.Init(tempHeap)

	// Add all blocks to temp heap
	for _, block := range gd.blocks {
		heap.Push(tempHeap, block)
	}

	// Extract blocks in total order
	ordered := make([]*Block, 0, len(gd.blocks))
	for tempHeap.Len() > 0 {
		block := heap.Pop(tempHeap).(*Block)
		ordered = append(ordered, block)
	}

	return ordered, nil
}

// GetSelectedParentChain returns the chain of selected parents from genesis
func (gd *GhostDAG) GetSelectedParentChain(blockHash string) ([]*Block, error) {
	chain := make([]*Block, 0)
	current := blockHash

	for current != "" {
		block, exists := gd.blocks[current]
		if !exists {
			return nil, fmt.Errorf("block %s not found", current)
		}

		chain = append([]*Block{block}, chain...) // Prepend to maintain order
		current = block.SelectedParent
	}

	return chain, nil
}

// CalculateBlueScore calculates the blue score for a block
func (gd *GhostDAG) CalculateBlueScore(blockHash string) (int64, error) {
	block, exists := gd.blocks[blockHash]
	if !exists {
		return 0, fmt.Errorf("block %s not found", blockHash)
	}

	// Blue score is the sum of blue scores of selected parent plus 1
	if block.SelectedParent == "" {
		return 1, nil // Genesis block
	}

	parentScore, err := gd.CalculateBlueScore(block.SelectedParent)
	if err != nil {
		return 0, err
	}

	return parentScore + 1, nil
}

// GetAnticone returns the anticone of a block (blocks not in its past)
func (gd *GhostDAG) GetAnticone(blockHash string) ([]*Block, error) {
	_, exists := gd.blocks[blockHash]
	if !exists {
		return nil, fmt.Errorf("block %s not found", blockHash)
	}

	past := gd.getPast(blockHash)
	anticone := make([]*Block, 0)

	for _, candidate := range gd.blocks {
		if candidate.Hash == blockHash {
			continue
		}

		// If candidate is not in past, it's in anticone
		if !gd.isInPast(candidate.Hash, past) {
			anticone = append(anticone, candidate)
		}
	}

	return anticone, nil
}

// getPast returns all blocks in the past of the given block
func (gd *GhostDAG) getPast(blockHash string) map[string]bool {
	past := make(map[string]bool)
	queue := []string{blockHash}

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		if past[current] {
			continue
		}

		past[current] = true
		block, exists := gd.blocks[current]
		if !exists {
			continue
		}

		// Add all parents to queue
		for _, parent := range block.Parents {
			if !past[parent] {
				queue = append(queue, parent)
			}
		}
	}

	return past
}

// isInPast checks if a block is in the given past set
func (gd *GhostDAG) isInPast(blockHash string, past map[string]bool) bool {
	return past[blockHash]
}

// ValidateDAG validates the DAG structure
func (gd *GhostDAG) ValidateDAG() error {
	for hash, block := range gd.blocks {
		// Check parents exist
		for _, parent := range block.Parents {
			if _, exists := gd.blocks[parent]; !exists {
				return fmt.Errorf("block %s references non-existent parent %s", hash, parent)
			}
		}

		// Check selected parent is in parents
		if block.SelectedParent != "" {
			found := false
			for _, parent := range block.Parents {
				if parent == block.SelectedParent {
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("block %s has selected parent %s not in parents list", hash, block.SelectedParent)
			}
		}
	}

	return nil
}

// GetBlockCount returns the total number of blocks in the DAG
func (gd *GhostDAG) GetBlockCount() int {
	return len(gd.blocks)
}

// Clear removes all blocks from the DAG
func (gd *GhostDAG) Clear() {
	gd.blocks = make(map[string]*Block)
	gd.heap = &BlockHeap{}
	gd.processed = make(map[string]bool)
}

// SortByHeight sorts blocks by height
func SortByHeight(blocks []*Block) []*Block {
	sorted := make([]*Block, len(blocks))
	copy(sorted, blocks)

	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].Height != sorted[j].Height {
			return sorted[i].Height < sorted[j].Height
		}
		return sorted[i].Hash < sorted[j].Hash
	})

	return sorted
}

// GetTips returns all tip blocks (blocks with no children)
func (gd *GhostDAG) GetTips() []*Block {
	hasChildren := make(map[string]bool)

	// Mark all blocks that have children
	for _, block := range gd.blocks {
		for _, parent := range block.Parents {
			hasChildren[parent] = true
		}
	}

	// Tips are blocks that don't have children
	tips := make([]*Block, 0)
	for _, block := range gd.blocks {
		if !hasChildren[block.Hash] {
			tips = append(tips, block)
		}
	}

	return SortByHeight(tips)
}
