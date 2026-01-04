package mempool

import (
	"fmt"
	"math/big"
	"sort"
	"sync"

	"latticenetworkL1/core/dag"
)

// Mempool stores pending transactions for block production
type Mempool struct {
	mu        sync.RWMutex
	txs       map[string]*dag.Transaction
	validator *TransactionValidator
	maxSize   int
}

// NewMempool creates a new mempool with validation
func NewMempool(maxSize int) *Mempool {
	minGasPrice := big.NewInt(1000000000) // 1 gwei
	maxGasLimit := uint64(1000000)        // 1M gas

	return &Mempool{
		txs:       make(map[string]*dag.Transaction),
		validator: NewTransactionValidator(minGasPrice, maxGasLimit),
		maxSize:   maxSize,
	}
}

// Add adds a transaction to the mempool with validation
func (m *Mempool) Add(tx *dag.Transaction) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if mempool is full
	if len(m.txs) >= m.maxSize {
		return fmt.Errorf("mempool is full (max size: %d)", m.maxSize)
	}

	// Deduplicate by tx hash
	if _, exists := m.txs[tx.Hash]; exists {
		return nil // Already exists, no error
	}

	// Validate transaction
	if err := m.validator.ValidateTransaction(tx); err != nil {
		return fmt.Errorf("transaction validation failed: %v", err)
	}

	m.txs[tx.Hash] = tx
	return nil
}

// AddWithAccountState adds a transaction with account state validation
func (m *Mempool) AddWithAccountState(tx *dag.Transaction, fromBalance *big.Int, fromNonce uint64) error {
	// Set account state for validation
	m.validator.SetAccountState(tx.From, fromBalance, fromNonce)

	return m.Add(tx)
}

// Pop removes and returns up to max transactions from the mempool (sorted by gas price)
func (m *Mempool) Pop(max int) []*dag.Transaction {
	m.mu.Lock()
	defer m.mu.Unlock()

	if max <= 0 || len(m.txs) == 0 {
		return []*dag.Transaction{}
	}

	count := max
	if len(m.txs) < count {
		count = len(m.txs)
	}

	// Sort transactions by gas price (highest first)
	txs := make([]*dag.Transaction, 0, len(m.txs))
	for _, tx := range m.txs {
		txs = append(txs, tx)
	}

	sort.Slice(txs, func(i, j int) bool {
		return txs[i].GasPrice.Cmp(txs[j].GasPrice) > 0
	})

	// Take the top transactions
	result := make([]*dag.Transaction, 0, count)
	for i := 0; i < count && i < len(txs); i++ {
		tx := txs[i]
		result = append(result, tx)
		delete(m.txs, tx.Hash)
	}

	return result
}

// PopByNonce removes and returns transactions sorted by nonce for a specific account
func (m *Mempool) PopByNonce(from string, max int) []*dag.Transaction {
	m.mu.Lock()
	defer m.mu.Unlock()

	var accountTxs []*dag.Transaction
	for _, tx := range m.txs {
		if tx.From == from {
			accountTxs = append(accountTxs, tx)
		}
	}

	// Sort by nonce
	sort.Slice(accountTxs, func(i, j int) bool {
		return accountTxs[i].Nonce < accountTxs[j].Nonce
	})

	count := max
	if len(accountTxs) < count {
		count = len(accountTxs)
	}

	result := make([]*dag.Transaction, 0, count)
	for i := 0; i < count; i++ {
		tx := accountTxs[i]
		result = append(result, tx)
		delete(m.txs, tx.Hash)
	}

	return result
}

// Size returns the number of pending transactions
func (m *Mempool) Size() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.txs)
}

// GetTransactionsByNonce returns transactions for an account sorted by nonce
func (m *Mempool) GetTransactionsByNonce(from string) []*dag.Transaction {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var txs []*dag.Transaction
	for _, tx := range m.txs {
		if tx.From == from {
			txs = append(txs, tx)
		}
	}

	sort.Slice(txs, func(i, j int) bool {
		return txs[i].Nonce < txs[j].Nonce
	})

	return txs
}

// RemoveTransactions removes specific transactions from the mempool
func (m *Mempool) RemoveTransactions(txHashes []string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, hash := range txHashes {
		delete(m.txs, hash)
	}
}

// GetStats returns mempool statistics
func (m *Mempool) GetStats() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats := map[string]interface{}{
		"total_transactions": len(m.txs),
		"max_size":           m.maxSize,
		"utilization":        float64(len(m.txs)) / float64(m.maxSize) * 100,
	}

	// Calculate total gas price and average
	totalGasPrice := big.NewInt(0)
	if len(m.txs) > 0 {
		for _, tx := range m.txs {
			totalGasPrice.Add(totalGasPrice, tx.GasPrice)
		}
		avgGasPrice := new(big.Int).Div(totalGasPrice, big.NewInt(int64(len(m.txs))))
		stats["average_gas_price"] = avgGasPrice.String()
		stats["total_gas_price"] = totalGasPrice.String()
	}

	// Count transactions by account
	accountCounts := make(map[string]int)
	for _, tx := range m.txs {
		accountCounts[tx.From]++
	}
	stats["unique_accounts"] = len(accountCounts)

	return stats
}

// UpdateAccountState updates the validator's account state
func (m *Mempool) UpdateAccountState(address string, balance *big.Int, nonce uint64) {
	m.validator.SetAccountState(address, balance, nonce)
}

// GetValidator returns the transaction validator
func (m *Mempool) GetValidator() *TransactionValidator {
	return m.validator
}

// Contains checks if a transaction exists in the mempool
func (m *Mempool) Contains(txHash string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	_, exists := m.txs[txHash]
	return exists
}

// GetTransaction returns a specific transaction by hash
func (m *Mempool) GetTransaction(txHash string) (*dag.Transaction, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	tx, exists := m.txs[txHash]
	return tx, exists
}

// Clear empties the mempool
func (m *Mempool) Clear() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.txs = make(map[string]*dag.Transaction)
}
