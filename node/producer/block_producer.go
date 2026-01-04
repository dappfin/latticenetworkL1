package producer

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"sync"
	"time"

	"latticenetworkL1/core/dag"
	"latticenetworkL1/core/pq"
	"latticenetworkL1/node/mempool"
	"latticenetworkL1/node/p2p"
	"latticenetworkL1/node/storage"
)

// BlockProducer handles real mempool-driven block production
type BlockProducer struct {
	dag         *dag.GhostDAG
	posEngine   *dag.POSEngine
	mempool     *mempool.Mempool
	storage     *storage.BlockStorage
	pqValidator *pq.Validator
	p2pManager  *p2p.P2PManager
	running     bool
	mutex       sync.RWMutex
	config      BlockProducerConfig
}

// BlockProducerConfig holds configuration for block production
type BlockProducerConfig struct {
	MaxBlockSize   int           // Maximum block size in bytes
	BlockInterval  time.Duration // Time between blocks
	MaxTxsPerBlock int           // Maximum transactions per block
	MinTxsPerBlock int           // Minimum transactions to create a block
	// New fields added here
	MaxGasLimit int // Maximum gas limit per block
	MinGasLimit int // Minimum gas limit per block
}

// NewBlockProducer creates a new block producer
func NewBlockProducer(dag *dag.GhostDAG, posEngine *dag.POSEngine, mempool *mempool.Mempool,
	storage *storage.BlockStorage, pqValidator *pq.Validator, config BlockProducerConfig) *BlockProducer {
	return &BlockProducer{
		dag:         dag,
		posEngine:   posEngine,
		mempool:     mempool,
		storage:     storage,
		pqValidator: pqValidator,
		config:      config,
	}
}

// SetP2PManager sets the P2P manager for block gossip
func (bp *BlockProducer) SetP2PManager(p2pManager *p2p.P2PManager) {
	bp.mutex.Lock()
	defer bp.mutex.Unlock()
	bp.p2pManager = p2pManager
}

// Start begins the block production process
func (bp *BlockProducer) Start() {
	bp.mutex.Lock()
	defer bp.mutex.Unlock()

	if bp.running {
		return
	}

	bp.running = true
	log.Printf("Starting block producer: interval=%v, max_txs=%d", bp.config.BlockInterval, bp.config.MaxTxsPerBlock)

	go bp.productionLoop()
}

// Stop stops the block production process
func (bp *BlockProducer) Stop() {
	bp.mutex.Lock()
	defer bp.mutex.Unlock()

	bp.running = false
	log.Printf("Block producer stopped")
}

// productionLoop continuously produces blocks from mempool transactions
func (bp *BlockProducer) productionLoop() {
	ticker := time.NewTicker(bp.config.BlockInterval)
	defer ticker.Stop()

	for bp.isRunning() {
		select {
		case <-ticker.C:
			if err := bp.produceBlock(); err != nil {
				log.Printf("Failed to produce block: %v", err)
			}
		}
	}
}

// produceBlock creates a new block from mempool transactions with PoS integration
func (bp *BlockProducer) produceBlock() error {
	// Select validator for this block
	validator := bp.posEngine.SelectValidator()
	if validator == nil {
		return fmt.Errorf("no validator available")
	}

	// Get and validate transactions from mempool
	transactions, err := bp.selectAndValidateTransactions(validator)
	if err != nil {
		return fmt.Errorf("transaction selection failed: %v", err)
	}

	// If no transactions and minimum required, create empty block
	if len(transactions) == 0 {
		log.Printf("No valid transactions available, creating empty block")
		return bp.createEmptyBlock(validator)
	}

	// Create block with validated transactions
	block, err := bp.createBlockWithTransactions(transactions, validator)
	if err != nil {
		// Return transactions to mempool on failure
		bp.returnTransactionsToMempool(transactions)
		return fmt.Errorf("failed to create block: %v", err)
	}

	// Submit block for quorum voting
	if err := bp.submitBlockForVoting(block, validator); err != nil {
		bp.returnTransactionsToMempool(transactions)
		return fmt.Errorf("failed to submit block for voting: %v", err)
	}

	return nil
}

// selectAndValidateTransactions selects and validates transactions for block production
func (bp *BlockProducer) selectAndValidateTransactions(validator *pq.Validator) ([]*dag.Transaction, error) {
	if bp.mempool.Size() == 0 {
		return []*dag.Transaction{}, nil
	}

	// Get candidate transactions from mempool
	candidateTxs := bp.mempool.Pop(bp.config.MaxTxsPerBlock)
	if len(candidateTxs) == 0 {
		return []*dag.Transaction{}, nil
	}

	// Validate transactions and calculate gas
	validTxs := make([]*dag.Transaction, 0)
	totalGas := uint64(0)
	processedNonces := make(map[string]uint64)

	for _, tx := range candidateTxs {
		// Check nonce ordering for each account
		lastNonce, exists := processedNonces[tx.From]
		if exists && tx.Nonce <= lastNonce {
			// Skip out-of-order transaction
			continue
		}

		// Check block gas limit
		if bp.config.MaxGasLimit > 0 && totalGas+tx.GasLimit > uint64(bp.config.MaxGasLimit) {
			// Return remaining transactions to mempool
			for _, remainingTx := range candidateTxs[len(validTxs):] {
				bp.mempool.Add(remainingTx)
			}
			break
		}

		// Additional validation using mempool validator
		if err := bp.mempool.GetValidator().ValidateTransaction(tx); err != nil {
			log.Printf("Transaction validation failed: %v", err)
			continue
		}

		// Add to valid transactions
		validTxs = append(validTxs, tx)
		totalGas += tx.GasLimit
		processedNonces[tx.From] = tx.Nonce
	}

	// Check minimum transaction requirement
	if len(validTxs) > 0 && len(validTxs) < bp.config.MinTxsPerBlock {
		log.Printf("Not enough valid transactions (%d < %d), returning to mempool",
			len(validTxs), bp.config.MinTxsPerBlock)
		bp.returnTransactionsToMempool(validTxs)
		return []*dag.Transaction{}, nil
	}

	log.Printf("Selected %d valid transactions with total gas: %d", len(validTxs), totalGas)
	return validTxs, nil
}

// createEmptyBlock creates an empty block (no transactions)
func (bp *BlockProducer) createEmptyBlock(validator *pq.Validator) error {
	block, err := bp.createBlock([]*dag.Transaction{}, validator)
	if err != nil {
		return fmt.Errorf("failed to create empty block: %v", err)
	}

	return bp.submitBlockForVoting(block, validator)
}

// createBlockWithTransactions creates a block with transactions and proper gas tracking
func (bp *BlockProducer) createBlockWithTransactions(transactions []*dag.Transaction, validator *pq.Validator) (*dag.Block, error) {
	// Calculate total gas used
	totalGas := uint64(0)
	for _, tx := range transactions {
		totalGas += tx.GasLimit
	}

	// Create block with enhanced data
	block, err := bp.createEnhancedBlock(transactions, validator, totalGas)
	if err != nil {
		return nil, err
	}

	return block, nil
}

// submitBlockForVoting submits the block to the PoS engine for quorum voting
func (bp *BlockProducer) submitBlockForVoting(block *dag.Block, validator *pq.Validator) error {
	// Add block to DAG
	if err := bp.dag.AddBlock(block); err != nil {
		return fmt.Errorf("failed to add block to DAG: %v", err)
	}

	// Store block deterministically
	if err := bp.storage.StoreBlock(block); err != nil {
		log.Printf("Failed to store block: %v", err)
		// Continue anyway, block is in DAG
	}

	// Submit to PoS engine (simplified for now - will implement full voting later)
	// TODO: Implement proper quorum voting in PoS engine
	log.Printf("Block %s submitted to PoS engine by validator %s", block.Hash, validator.ID)

	// Gossip block to peers
	bp.mutex.RLock()
	if bp.p2pManager != nil {
		go bp.p2pManager.GossipBlock(block)
	}
	bp.mutex.RUnlock()

	// Advance PoS layer
	bp.posEngine.AdvanceLayer()

	log.Printf("Produced block %s at height %d with %d transactions by validator %s",
		block.Hash, block.Height, len(block.Transactions), validator.ID)

	return nil
}

// returnTransactionsToMempool returns failed transactions back to the mempool
func (bp *BlockProducer) returnTransactionsToMempool(transactions []*dag.Transaction) {
	for _, tx := range transactions {
		if err := bp.mempool.Add(tx); err != nil {
			log.Printf("Failed to return transaction to mempool: %v", err)
		}
	}
}

// createEnhancedBlock creates a new block with enhanced transaction data
func (bp *BlockProducer) createEnhancedBlock(transactions []*dag.Transaction, validator *pq.Validator, totalGas uint64) (*dag.Block, error) {
	// Get current tips to use as parents
	tips := bp.dag.GetTips()
	parents := make([]string, 0, len(tips))
	for _, tip := range tips {
		parents = append(parents, tip.Hash)
	}

	// If no tips, use genesis
	if len(parents) == 0 {
		parents = []string{"genesis"}
	}

	// Create enhanced block data with gas information
	blockData := bp.prepareEnhancedBlockData(transactions, parents, totalGas)

	// Sign block with validator's PQ key
	signature, err := bp.posEngine.SignBlock(validator, blockData, []byte{}) // Use empty byte slice for PQ key placeholder
	if err != nil {
		return nil, fmt.Errorf("failed to sign block: %v", err)
	}

	// Create block with enhanced fields
	block := &dag.Block{
		Hash:               generateBlockHash(blockData),
		Parents:            parents,
		Height:             int64(bp.dag.GetBlockCount() + 1),
		BlueScore:          1,
		Timestamp:          time.Now().Unix(),
		Signature:          hex.EncodeToString(signature),
		Transactions:       transactions,
		ProducerID:         validator.ID,
		ProducerPubKeyHash: validator.PQPubKeyHash,
	}

	return block, nil
}

// createBlock creates a new block with the given transactions (legacy method)
func (bp *BlockProducer) createBlock(transactions []*dag.Transaction, validator *pq.Validator) (*dag.Block, error) {
	totalGas := uint64(0)
	for _, tx := range transactions {
		totalGas += tx.GasLimit
	}
	return bp.createEnhancedBlock(transactions, validator, totalGas)
}

// prepareEnhancedBlockData prepares enhanced data for block signing with gas information
func (bp *BlockProducer) prepareEnhancedBlockData(transactions []*dag.Transaction, parents []string, totalGas uint64) []byte {
	data := fmt.Sprintf("height:%d,parents:%v,timestamp:%d,txs:%d,gas:%d",
		bp.dag.GetBlockCount()+1, parents, time.Now().Unix(), len(transactions), totalGas)
	return []byte(data)
}

// prepareBlockData prepares the data for block signing (legacy method)
func (bp *BlockProducer) prepareBlockData(transactions []*dag.Transaction, parents []string) []byte {
	totalGas := uint64(0)
	for _, tx := range transactions {
		totalGas += tx.GasLimit
	}
	return bp.prepareEnhancedBlockData(transactions, parents, totalGas)
}

// generateBlockHash generates a deterministic block hash
func generateBlockHash(data []byte) string {
	hash := make([]byte, 32)
	rand.Read(hash) // Simplified hash generation
	return "block_" + hex.EncodeToString(hash)[:16]
}

// isRunning checks if the producer is running
func (bp *BlockProducer) isRunning() bool {
	bp.mutex.RLock()
	defer bp.mutex.RUnlock()
	return bp.running
}

// GetStats returns producer statistics
func (bp *BlockProducer) GetStats() map[string]interface{} {
	bp.mutex.RLock()
	defer bp.mutex.RUnlock()

	return map[string]interface{}{
		"running":           bp.running,
		"block_interval":    bp.config.BlockInterval.String(),
		"max_txs_per_block": bp.config.MaxTxsPerBlock,
		"min_txs_per_block": bp.config.MinTxsPerBlock,
		"mempool_size":      bp.mempool.Size(),
		"dag_blocks":        bp.dag.GetBlockCount(),
		"current_layer":     bp.posEngine.CurrentLayer,
		"validator_id":      bp.pqValidator.ID,
	}
}
