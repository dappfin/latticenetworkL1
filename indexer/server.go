package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

// Indexer tracks DAG layers, transactions, validator votes, and Merkle roots
type Indexer struct {
	rpcURL         string
	layers         []DAGLayer
	transactions   map[string]Transaction
	validatorVotes map[string][]ValidatorVote
	accounts       map[string]Account
	merkleRoots    map[int64]string
	mutex          sync.RWMutex
}

// DAGLayer represents a DAG layer with metadata
type DAGLayer struct {
	LayerNumber        int64     `json:"layer_number"`
	Timestamp          time.Time `json:"timestamp"`
	Transactions       []string  `json:"transactions"`
	ValidatorVotes     []string  `json:"validator_votes"`
	MerkleRoot         string    `json:"merkle_root"`
	IsSoftFinal        bool      `json:"is_soft_final"`
	IsHardFinal        bool      `json:"is_hard_final"`
	TotalStake         uint64    `json:"total_stake"`
	ParticipatingStake uint64    `json:"participating_stake"`
}

// Transaction represents a transaction in DAG
type Transaction struct {
	Hash        string    `json:"hash"`
	From        string    `json:"from"`
	To          string    `json:"to"`
	Value       string    `json:"value"`
	GasPrice    string    `json:"gas_price"`
	GasLimit    string    `json:"gas_limit"`
	Data        string    `json:"data"`
	Nonce       uint64    `json:"nonce"`
	Status      string    `json:"status"` // "pending", "soft_final", "final"
	LayerNumber int64     `json:"layer_number"`
	Timestamp   time.Time `json:"timestamp"`
	Signature   string    `json:"signature"`
}

// ValidatorVote represents a validator's vote on a layer
type ValidatorVote struct {
	ValidatorID  string    `json:"validator_id"`
	LayerNumber  int64     `json:"layer_number"`
	VoteHash     string    `json:"vote_hash"`
	Timestamp    time.Time `json:"timestamp"`
	Signature    string    `json:"signature"`
	IsSupporting bool      `json:"is_supporting"`
}

// Account represents an account with balance and transaction history
type Account struct {
	Address          string    `json:"address"`
	Balance          string    `json:"balance"`
	Nonce            uint64    `json:"nonce"`
	TransactionCount uint64    `json:"transaction_count"`
	LastUpdated      time.Time `json:"last_updated"`
}

// RPCRequest represents a JSON-RPC request
type RPCRequest struct {
	Jsonrpc string      `json:"jsonrpc"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params"`
	ID      interface{} `json:"id"`
}

// RPCResponse represents a JSON-RPC response
type RPCResponse struct {
	ID      interface{} `json:"id"`
	Jsonrpc string      `json:"jsonrpc"`
	Result  interface{} `json:"result,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

// NewIndexer creates a new indexer instance
func NewIndexer(rpcURL string) *Indexer {
	return &Indexer{
		rpcURL:         rpcURL,
		layers:         make([]DAGLayer, 0),
		transactions:   make(map[string]Transaction),
		validatorVotes: make(map[string][]ValidatorVote),
		accounts:       make(map[string]Account),
		merkleRoots:    make(map[int64]string),
		mutex:          sync.RWMutex{},
	}
}

// Start begins the indexer service
func (i *Indexer) Start() error {
	log.Printf("Starting indexer service, connecting to RPC: %s", i.rpcURL)

	// Start periodic sync
	go i.syncLoop()

	// Start API server
	return i.startAPIServer()
}

// syncLoop continuously syncs data from RPC
func (i *Indexer) syncLoop() {
	ticker := time.NewTicker(10 * time.Second) // Sync every 10 seconds to avoid rate limits
	defer ticker.Stop()

	log.Printf("Starting sync loop with 10-second intervals")

	for {
		select {
		case <-ticker.C:
			log.Printf("Triggering sync cycle...")
			i.syncFromRPC()
			// Add additional delay between sync cycles
			time.Sleep(2 * time.Second)
		}
	}
}

// syncFromRPC fetches latest data from RPC endpoint
func (i *Indexer) syncFromRPC() {
	log.Printf("syncFromRPC: Starting sync cycle")
	i.mutex.Lock()
	defer i.mutex.Unlock()

	// Get current block number
	log.Printf("syncFromRPC: Getting current block number...")
	blockNumber, err := i.getCurrentBlockNumber()
	if err != nil {
		log.Printf("Error getting block number: %v", err)
		return
	}
	log.Printf("syncFromRPC: Current block number: %d", blockNumber)

	// Get latest known layer
	latestLayer := int64(0)
	if len(i.layers) > 0 {
		latestLayer = i.layers[len(i.layers)-1].LayerNumber
	}
	log.Printf("syncFromRPC: Latest known layer: %d, Target block: %d", latestLayer, blockNumber)

	// Sync new layers with throttling
	layersToSync := blockNumber - latestLayer
	log.Printf("syncFromRPC: Need to sync %d layers", layersToSync)

	for layerNum := latestLayer + 1; layerNum <= blockNumber; layerNum++ {
		log.Printf("syncFromRPC: Syncing layer %d", layerNum)
		i.syncLayer(layerNum)
		// Add delay between layer syncs to respect rate limits
		time.Sleep(1 * time.Second) // Increased from 200ms to 1s
	}

	// Update finality status
	i.updateFinalityStatus()
}

// getCurrentBlockNumber fetches current block number from RPC
func (i *Indexer) getCurrentBlockNumber() (int64, error) {
	req := RPCRequest{
		Jsonrpc: "2.0",
		Method:  "eth_blockNumber",
		Params:  []interface{}{},
		ID:      1,
	}

	resp, err := i.makeRPCRequest(req)
	if err != nil {
		return 0, err
	}

	// Add delay after RPC call to respect rate limits
	time.Sleep(2 * time.Second) // Increased from 100ms to 2s

	if resp.Error != nil {
		return 0, fmt.Errorf("RPC error: %v", resp.Error)
	}

	if result, ok := resp.Result.(string); ok {
		// Convert hex string to int64
		var blockNum int64
		_, err := fmt.Sscanf(result, "0x%x", &blockNum)
		return blockNum, err
	}

	return 0, fmt.Errorf("invalid response format")
}

// syncLayer synchronizes a specific layer from RPC
func (i *Indexer) syncLayer(layerNumber int64) {
	log.Printf("Syncing layer %d", layerNumber)

	// Create layer entry
	layer := DAGLayer{
		LayerNumber:        layerNumber,
		Timestamp:          time.Now(),
		Transactions:       []string{},
		ValidatorVotes:     []string{},
		IsSoftFinal:        false,
		IsHardFinal:        false,
		TotalStake:         0,
		ParticipatingStake: 0,
	}

	// Compute Merkle root for this layer
	merkleRoot := i.computeMerkleRoot(layer.Transactions, layerNumber)
	layer.MerkleRoot = merkleRoot

	// Store layer
	i.layers = append(i.layers, layer)
	i.merkleRoots[layerNumber] = merkleRoot

	log.Printf("Synced layer %d with Merkle root: %s", layerNumber, merkleRoot)
}

// computeMerkleRoot computes Merkle root for a list of transaction hashes
func (i *Indexer) computeMerkleRoot(transactions []string, layerNumber int64) string {
	if len(transactions) == 0 {
		return ""
	}

	// For now, return simple hash of concatenated transactions
	// In production, implement proper Merkle tree algorithm
	combined := ""
	for _, tx := range transactions {
		combined += tx
	}

	// Use Keccak-256 (would import proper hash function)
	return fmt.Sprintf("0x%x", int64(len(combined))+layerNumber)
}

// updateFinalityStatus updates finality status based on DAG rules
func (i *Indexer) updateFinalityStatus() {
	// Simple finality logic - in production, use proper DAG finality rules
	for j := range i.layers {
		layer := &i.layers[j]

		// Mark layers as soft final after 2 confirmations
		if layer.LayerNumber <= int64(len(i.layers))-3 {
			layer.IsSoftFinal = true
		}

		// Mark layers as hard final after 30 seconds
		if time.Since(layer.Timestamp) >= 30*time.Second {
			layer.IsHardFinal = true
		}

		// Update transaction statuses
		for _, txHash := range layer.Transactions {
			if tx, exists := i.transactions[txHash]; exists {
				if layer.IsSoftFinal && tx.Status == "pending" {
					tx.Status = "soft_final"
				}
				if layer.IsHardFinal && tx.Status == "soft_final" {
					tx.Status = "final"
				}
				tx.LayerNumber = layer.LayerNumber
				i.transactions[txHash] = tx
			}
		}
	}
}

// makeRPCRequest makes an HTTP request to RPC endpoint
func (i *Indexer) makeRPCRequest(req RPCRequest) (*RPCResponse, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(i.rpcURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var rpcResp RPCResponse
	err = json.NewDecoder(resp.Body).Decode(&rpcResp)
	return &rpcResp, err
}

// startAPIServer starts the indexer API server
func (i *Indexer) startAPIServer() error {
	http.HandleFunc("/api/layers", i.handleGetLayers)
	http.HandleFunc("/api/transactions", i.handleGetTransactions)
	http.HandleFunc("/api/validators", i.handleGetValidators)
	http.HandleFunc("/api/accounts/", i.handleGetAccounts)
	http.HandleFunc("/api/merkle-roots", i.handleGetMerkleRoots)
	http.HandleFunc("/api/health", i.handleHealth)

	log.Println("Indexer API server started on :8081")
	return http.ListenAndServe(":8081", nil)
}

// API Handlers
func (i *Indexer) handleGetLayers(w http.ResponseWriter, r *http.Request) {
	i.mutex.RLock()
	defer i.mutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(i.layers)
}

func (i *Indexer) handleGetTransactions(w http.ResponseWriter, r *http.Request) {
	i.mutex.RLock()
	defer i.mutex.RUnlock()

	// Convert map to slice for JSON response
	txs := make([]Transaction, 0, len(i.transactions))
	for _, tx := range i.transactions {
		txs = append(txs, tx)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(txs)
}

func (i *Indexer) handleGetValidators(w http.ResponseWriter, r *http.Request) {
	i.mutex.RLock()
	defer i.mutex.RUnlock()

	// Convert validator votes map to slice
	votes := make([]ValidatorVote, 0)
	for _, voteList := range i.validatorVotes {
		votes = append(votes, voteList...)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(votes)
}

func (i *Indexer) handleGetAccounts(w http.ResponseWriter, r *http.Request) {
	i.mutex.RLock()
	defer i.mutex.RUnlock()

	// Extract address from URL path
	address := r.URL.Path[len("/api/accounts/"):]
	if address == "" {
		// Return all accounts
		accounts := make([]Account, 0, len(i.accounts))
		for _, acc := range i.accounts {
			accounts = append(accounts, acc)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(accounts)
		return
	}

	// Return specific account
	if account, exists := i.accounts[address]; exists {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(account)
	} else {
		http.Error(w, "Account not found", http.StatusNotFound)
	}
}

func (i *Indexer) handleGetMerkleRoots(w http.ResponseWriter, r *http.Request) {
	i.mutex.RLock()
	defer i.mutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(i.merkleRoots)
}

func (i *Indexer) handleHealth(w http.ResponseWriter, r *http.Request) {
	i.mutex.RLock()
	defer i.mutex.RUnlock()

	health := map[string]interface{}{
		"status":               "healthy",
		"layers_synced":        len(i.layers),
		"transactions_indexed": len(i.transactions),
		"last_sync":            time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// main function to run the indexer
func main() {
	// Default RPC URL - use local endpoint to avoid rate limits
	rpcURL := "http://127.0.0.1:8545" // Use localhost for local RPC
	if envURL := os.Getenv("RPC_URL"); envURL != "" {
		rpcURL = envURL
	}

	// Create and start indexer
	indexer := NewIndexer(rpcURL)
	log.Printf("Starting indexer with RPC URL: %s", rpcURL)

	if err := indexer.Start(); err != nil {
		log.Fatalf("Failed to start indexer: %v", err)
	}
}
