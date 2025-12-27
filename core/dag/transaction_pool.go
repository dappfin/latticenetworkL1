package dag

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"sync"
	"time"
)

// Transaction represents a transaction in the DAG
type Transaction struct {
	Hash      string
	From      string
	To        string
	Value     *big.Int
	GasPrice  *big.Int
	GasLimit  uint64
	Nonce     uint64
	Data      []byte
	Timestamp int64
}

// TransactionPool manages pending transactions
type TransactionPool struct {
	pending   map[string]*Transaction
	processed map[string]bool
	mutex     sync.RWMutex
	maxSize   int
}

// NewTransactionPool creates a new transaction pool
func NewTransactionPool(maxSize int) *TransactionPool {
	return &TransactionPool{
		pending:   make(map[string]*Transaction),
		processed: make(map[string]bool),
		maxSize:   maxSize,
	}
}

// AddTransaction adds a transaction to the pool
func (tp *TransactionPool) AddTransaction(tx *Transaction) error {
	tp.mutex.Lock()
	defer tp.mutex.Unlock()

	if len(tp.pending) >= tp.maxSize {
		return fmt.Errorf("transaction pool is full")
	}

	if _, exists := tp.pending[tx.Hash]; exists {
		return fmt.Errorf("transaction %s already exists", tx.Hash)
	}

	tp.pending[tx.Hash] = tx
	return nil
}

// GetPendingTransactions returns pending transactions up to the limit
func (tp *TransactionPool) GetPendingTransactions(limit int) []*Transaction {
	tp.mutex.RLock()
	defer tp.mutex.RUnlock()

	count := limit
	if count > len(tp.pending) {
		count = len(tp.pending)
	}

	txs := make([]*Transaction, 0, count)
	for _, tx := range tp.pending {
		txs = append(txs, tx)
		if len(txs) >= count {
			break
		}
	}

	return txs
}

// MarkProcessed marks a transaction as processed
func (tp *TransactionPool) MarkProcessed(txHash string) {
	tp.mutex.Lock()
	defer tp.mutex.Unlock()

	delete(tp.pending, txHash)
	tp.processed[txHash] = true
}

// GetStats returns pool statistics
func (tp *TransactionPool) GetStats() map[string]int {
	tp.mutex.RLock()
	defer tp.mutex.RUnlock()

	return map[string]int{
		"pending":   len(tp.pending),
		"processed": len(tp.processed),
	}
}

// GenerateMockTransaction creates a mock transaction for testing
func GenerateMockTransaction(from, to string, nonce uint64) *Transaction {
	// Generate random value (1-1000 wei)
	value := big.NewInt(0)
	value.Add(value, big.NewInt(1))
	randVal, _ := rand.Int(rand.Reader, big.NewInt(999))
	value.Add(value, randVal)

	// Generate random gas price (1-20 gwei)
	gasPrice := big.NewInt(0)
	gasPrice.Add(gasPrice, big.NewInt(1000000000))               // 1 gwei
	randGas, _ := rand.Int(rand.Reader, big.NewInt(19000000000)) // up to 19 gwei
	gasPrice.Add(gasPrice, randGas)

	tx := &Transaction{
		From:      from,
		To:        to,
		Value:     value,
		GasPrice:  gasPrice,
		GasLimit:  21000,
		Nonce:     nonce,
		Data:      []byte{}, // Empty data for mock transactions
		Timestamp: time.Now().Unix(),
	}

	// Generate hash
	tx.Hash = GenerateTxHash(tx)
	return tx
}

// GenerateTxHash generates a hash for a transaction
func GenerateTxHash(tx *Transaction) string {
	hash := make([]byte, 32)
	rand.Read(hash) // Simplified hash generation
	return "0x" + hex.EncodeToString(hash)
}
