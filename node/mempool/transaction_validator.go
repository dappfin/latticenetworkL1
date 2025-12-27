package mempool

import (
	"fmt"
	"math/big"
	"sync"

	"latticenetworkL1/core/dag"

	"golang.org/x/crypto/sha3"
)

// AccountState represents the state of an account for validation
type AccountState struct {
	Balance *big.Int
	Nonce   uint64
	Address string
}

// TransactionValidator handles transaction validation
type TransactionValidator struct {
	mu            sync.RWMutex
	accountStates map[string]*AccountState
	minGasPrice   *big.Int
	maxGasLimit   uint64
}

// NewTransactionValidator creates a new transaction validator
func NewTransactionValidator(minGasPrice *big.Int, maxGasLimit uint64) *TransactionValidator {
	return &TransactionValidator{
		accountStates: make(map[string]*AccountState),
		minGasPrice:   minGasPrice,
		maxGasLimit:   maxGasLimit,
	}
}

// SetAccountState updates the state of an account
func (tv *TransactionValidator) SetAccountState(address string, balance *big.Int, nonce uint64) {
	tv.mu.Lock()
	defer tv.mu.Unlock()

	tv.accountStates[address] = &AccountState{
		Balance: balance,
		Nonce:   nonce,
		Address: address,
	}
}

// ValidateTransaction performs comprehensive transaction validation
func (tv *TransactionValidator) ValidateTransaction(tx *dag.Transaction) error {
	tv.mu.RLock()
	defer tv.mu.RUnlock()

	// 1. Basic transaction validation
	if err := tv.validateBasicFields(tx); err != nil {
		return fmt.Errorf("basic validation failed: %v", err)
	}

	// 2. Gas validation
	if err := tv.validateGas(tx); err != nil {
		return fmt.Errorf("gas validation failed: %v", err)
	}

	// 3. Account state validation
	if err := tv.validateAccountState(tx); err != nil {
		return fmt.Errorf("account state validation failed: %v", err)
	}

	// 4. Signature validation (if signature is present)
	if err := tv.validateSignature(tx); err != nil {
		return fmt.Errorf("signature validation failed: %v", err)
	}

	return nil
}

// validateBasicFields validates basic transaction fields
func (tv *TransactionValidator) validateBasicFields(tx *dag.Transaction) error {
	if tx.From == "" {
		return fmt.Errorf("from address is empty")
	}

	if tx.To == "" {
		return fmt.Errorf("to address is empty")
	}

	if tx.From == tx.To {
		return fmt.Errorf("cannot send transaction to self")
	}

	if tx.Value == nil || tx.Value.Sign() < 0 {
		return fmt.Errorf("invalid transaction value")
	}

	if tx.Value.Cmp(big.NewInt(0)) == 0 {
		return fmt.Errorf("transaction value cannot be zero")
	}

	if tx.Hash == "" {
		return fmt.Errorf("transaction hash is empty")
	}

	return nil
}

// validateGas validates gas-related fields
func (tv *TransactionValidator) validateGas(tx *dag.Transaction) error {
	if tx.GasPrice == nil || tx.GasPrice.Sign() <= 0 {
		return fmt.Errorf("invalid gas price")
	}

	if tx.GasPrice.Cmp(tv.minGasPrice) < 0 {
		return fmt.Errorf("gas price %s below minimum %s", tx.GasPrice.String(), tv.minGasPrice.String())
	}

	if tx.GasLimit == 0 {
		return fmt.Errorf("gas limit cannot be zero")
	}

	if tx.GasLimit > tv.maxGasLimit {
		return fmt.Errorf("gas limit %d exceeds maximum %d", tx.GasLimit, tv.maxGasLimit)
	}

	// Calculate total gas cost
	gasCost := new(big.Int).Mul(tx.GasPrice, big.NewInt(int64(tx.GasLimit)))

	// Check if account has enough balance for gas + value
	account, exists := tv.accountStates[tx.From]
	if !exists {
		return fmt.Errorf("account %s not found for gas validation", tx.From)
	}

	totalCost := new(big.Int).Add(tx.Value, gasCost)
	if account.Balance.Cmp(totalCost) < 0 {
		return fmt.Errorf("insufficient balance: have %s, need %s (value: %s, gas: %s)",
			account.Balance.String(), totalCost.String(), tx.Value.String(), gasCost.String())
	}

	return nil
}

// validateAccountState validates nonce and balance
func (tv *TransactionValidator) validateAccountState(tx *dag.Transaction) error {
	account, exists := tv.accountStates[tx.From]
	if !exists {
		return fmt.Errorf("account %s not found", tx.From)
	}

	// Nonce validation
	if tx.Nonce < account.Nonce {
		return fmt.Errorf("nonce %d is too low, current nonce is %d", tx.Nonce, account.Nonce)
	}

	// Allow some nonce gap for out-of-order transactions, but not too large
	if tx.Nonce > account.Nonce+10 {
		return fmt.Errorf("nonce %d is too far ahead, current nonce is %d", tx.Nonce, account.Nonce)
	}

	return nil
}

// validateSignature validates the transaction signature
func (tv *TransactionValidator) validateSignature(tx *dag.Transaction) error {
	// For now, we'll skip signature validation as the Transaction struct
	// doesn't include signature fields. This would need to be added
	// when implementing proper cryptographic signatures

	// TODO: Implement proper signature validation when Transaction struct includes:
	// - Signature field
	// - Recovery ID
	// - Public key or address derivation

	return nil
}

// GetAccountState returns the current state of an account
func (tv *TransactionValidator) GetAccountState(address string) (*AccountState, error) {
	tv.mu.RLock()
	defer tv.mu.RUnlock()

	account, exists := tv.accountStates[address]
	if !exists {
		return nil, fmt.Errorf("account %s not found", address)
	}

	// Return a copy to prevent external modification
	return &AccountState{
		Balance: new(big.Int).Set(account.Balance),
		Nonce:   account.Nonce,
		Address: account.Address,
	}, nil
}

// UpdateAccountNonce updates the nonce for an account (used after transaction processing)
func (tv *TransactionValidator) UpdateAccountNonce(address string, newNonce uint64) {
	tv.mu.Lock()
	defer tv.mu.Unlock()

	if account, exists := tv.accountStates[address]; exists {
		if newNonce > account.Nonce {
			account.Nonce = newNonce
		}
	}
}

// DeductBalance deducts the transaction cost from an account balance
func (tv *TransactionValidator) DeductBalance(address string, amount *big.Int) error {
	tv.mu.Lock()
	defer tv.mu.Unlock()

	account, exists := tv.accountStates[address]
	if !exists {
		return fmt.Errorf("account %s not found", address)
	}

	if account.Balance.Cmp(amount) < 0 {
		return fmt.Errorf("insufficient balance for deduction")
	}

	account.Balance.Sub(account.Balance, amount)
	return nil
}

// GetValidatorStats returns validation statistics
func (tv *TransactionValidator) GetValidatorStats() map[string]interface{} {
	tv.mu.RLock()
	defer tv.mu.RUnlock()

	stats := map[string]interface{}{
		"total_accounts": len(tv.accountStates),
		"min_gas_price":  tv.minGasPrice.String(),
		"max_gas_limit":  tv.maxGasLimit,
	}

	// Calculate total balance across all accounts
	totalBalance := big.NewInt(0)
	for _, account := range tv.accountStates {
		totalBalance.Add(totalBalance, account.Balance)
	}
	stats["total_balance"] = totalBalance.String()

	return stats
}

// Mock signature validation function (placeholder)
func ValidateECSignature(hash string, signature []byte, address string) bool {
	// TODO: Implement proper ECDSA signature validation
	// This would involve:
	// 1. Recover public key from signature
	// 2. Derive address from public key
	// 3. Compare with expected address

	// For now, return true for mock validation
	return true
}

// GenerateTransactionHash generates a proper hash for transaction signing
func GenerateTransactionHash(tx *dag.Transaction) string {
	// Create hash of transaction fields
	hasher := sha3.NewLegacyKeccak256()

	hasher.Write([]byte(tx.From))
	hasher.Write([]byte(tx.To))
	hasher.Write(tx.Value.Bytes())
	hasher.Write(tx.GasPrice.Bytes())
	hasher.Write([]byte(fmt.Sprintf("%d", tx.GasLimit)))
	hasher.Write([]byte(fmt.Sprintf("%d", tx.Nonce)))
	hasher.Write(tx.Data)
	hasher.Write([]byte(fmt.Sprintf("%d", tx.Timestamp)))

	hash := hasher.Sum(nil)
	return fmt.Sprintf("0x%x", hash)
}
