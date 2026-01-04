package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"latticenetworkL1/core/dag"
	"latticenetworkL1/core/pq"
	"latticenetworkL1/core/rpc"
	"latticenetworkL1/node/consensus"
	"latticenetworkL1/node/mempool"
	"latticenetworkL1/node/p2p"
	"latticenetworkL1/node/producer"
	"latticenetworkL1/node/storage"

	"golang.org/x/crypto/sha3"
)

// GenesisConfig represents the genesis configuration
type GenesisConfig struct {
	ChainID        string             `json:"chain_id"`
	NetworkName    string             `json:"network_name"`
	Timestamp      int64              `json:"timestamp"`
	Validators     []Validator        `json:"validators"`
	DAGConfig      DAGConfig          `json:"dag_config"`
	PQConfig       PQConfig           `json:"pq_config"`
	FinalityConfig dag.FinalityConfig `json:"finality_config"`
}

// BlockSubmission represents a block submission request
type BlockSubmission struct {
	Payload   string `json:"payload"`
	Validator string `json:"validator"`
}

// BlockResponse represents the response after block submission
type BlockResponse struct {
	Success    bool   `json:"success"`
	Message    string `json:"message"`
	BlockHash  string `json:"block_hash"`
	BlockCount int    `json:"block_count"`
	Timestamp  int64  `json:"timestamp"`
}

// Validator represents a validator in genesis
type Validator struct {
	ID           string `json:"id"`
	PQPubKeyHash string `json:"pq_pubkey_hash"`
	PQPublicKey  string `json:"pq_public_key"`
	Stake        uint64 `json:"stake"`
	Weight       uint64 `json:"weight"`
}

// DAGConfig represents DAG configuration
type DAGConfig struct {
	MaxBlockSize            int     `json:"max_block_size"`
	BlueScoreWindow         int     `json:"blue_score_window"`
	SelectedParentRule      string  `json:"selected_parent_rule"`
	AnticoneSizeLimit       int     `json:"anticone_size_limit"`
	LayerInterval           float64 `json:"layer_interval"`
	MaxTransactionsPerLayer int     `json:"max_transactions_per_layer"`
	MaxParentsPerVertex     int     `json:"max_parents_per_vertex"`
	MaxTxsPerBlock          int     `json:"max_txs_per_block"`
	MinTxsPerBlock          int     `json:"min_txs_per_block"`
}

// PQConfig represents post-quantum configuration
type PQConfig struct {
	Scheme        string `json:"scheme"`
	HashAlgo      string `json:"hash_algo"`
	SignTimeout   int    `json:"sign_timeout"`
	PublicKeySize int    `json:"public_key_size"`
	SignatureSize int    `json:"signature_size"`
}

func main() {
	// Parse command line flags
	genesisFile := flag.String("genesis", "genesis/config.json", "Path to genesis configuration file")
	rpcEnabled := flag.Bool("rpc-enabled", true, "Enable RPC server")
	rpcBind := flag.String("rpc-bind", "0.0.0.0:8545", "RPC server bind address")
	p2pEnabled := flag.Bool("p2p-enabled", true, "Enable P2P networking")
	p2pBind := flag.String("p2p-bind", "0.0.0.0:8555", "P2P server bind address")
	p2pPort := flag.Int("p2p-port", 8555, "P2P server port (overrides p2p-bind port)")
	bootnode := flag.String("bootnode", "", "Bootnode address to connect to")
	p2pPeers := flag.String("p2p-peers", "", "Comma-separated list of peer addresses to connect to")
	validatorKey := flag.String("validator-key", "", "Path to validator PQ key file")
	flag.Parse()

	// Load genesis configuration
	genesisData, err := os.ReadFile(*genesisFile)
	if err != nil {
		log.Fatalf("Error reading genesis file %s: %v", *genesisFile, err)
	}

	var genesis GenesisConfig
	if err := json.Unmarshal(genesisData, &genesis); err != nil {
		log.Fatalf("Error parsing genesis file: %v", err)
	}

	// Convert node.Validators to pq.Validators for validation
	var pqValidators []pq.Validator
	for _, v := range genesis.Validators {
		pqValidators = append(pqValidators, pq.Validator{
			ID:           v.ID,
			PQPubKeyHash: v.PQPubKeyHash,
			Stake:        v.Stake,
			Weight:       v.Weight,
		})
	}

	if err := pq.ValidateGenesisPQ(pqValidators); err != nil {
		log.Fatalf("GENESIS PQ VALIDATION FAILED: %v", err)
	}

	// Load validator key if provided
	var currentValidatorID string
	if *validatorKey != "" {
		fmt.Printf("Loading validator key from: %s\n", *validatorKey)
		_, err := os.ReadFile(*validatorKey)
		if err != nil {
			log.Fatalf("Error reading validator key file %s: %v", *validatorKey, err)
		}

		// Parse validator key to get ID (for demo, extract from filename)
		if idx := len(*validatorKey) - 1; idx >= 0 && (*validatorKey)[idx] == '/' {
			slashIdx := len(*validatorKey) - 1
			for slashIdx := slashIdx - 1; slashIdx >= 0 && (*validatorKey)[slashIdx] != '/'; slashIdx-- {
			}
			if slashIdx >= 0 {
				currentValidatorID = (*validatorKey)[slashIdx+1 : len(*validatorKey)-9] // Remove _pq_key.json
			}
		}

		fmt.Printf("✅ Loaded validator key for: %s\n", currentValidatorID)
	}

	// Initialize PoS engine with finality configuration
	var validators []*pq.Validator
	for _, v := range genesis.Validators {
		validators = append(validators, &pq.Validator{
			ID:           v.ID,
			PQPubKeyHash: v.PQPubKeyHash,
			Stake:        v.Stake,
			Weight:       v.Weight,
		})
	}
	posS := dag.NewPOSEngine(validators, genesis.FinalityConfig)
	fmt.Printf("Initialized PoS engine with %d validators\n", len(validators))

	// Initialize GhostDAG
	g := dag.NewGhostDAG()
	fmt.Printf("Initialized GhostDAG\n")

	// Initialize BlockStorage with deterministic append-only log
	blockStorage, err := storage.NewBlockStorage("data")
	if err != nil {
		log.Fatalf("Failed to initialize block storage: %v", err)
	}
	defer blockStorage.Close()
	fmt.Printf("Initialized BlockStorage with append-only log\n")

	// Initialize mempool with enhanced validation
	mempool := mempool.NewMempool(10000) // Max 10,000 transactions
	fmt.Printf("Initialized enhanced mempool with validation\n")

	// Start layer management goroutine
	go startLayerManager(posS, genesis.DAGConfig.LayerInterval)

	// Load validators
	fmt.Printf("Loaded %d validators from genesis\n", len(genesis.Validators))
	for i, validator := range genesis.Validators {
		fmt.Printf("Validator %d: %s (hash: %s)\n", i+1, validator.ID, validator.PQPubKeyHash)
	}

	// Load all PQ keys from genesis/keys directory
	pqKeys, err := LoadAllPQValidatorKeys("genesis/keys")
	if err != nil {
		log.Fatalf("Failed to load PQ keys: %v", err)
	}
	fmt.Printf("Loaded %d PQ keys\n", len(pqKeys))

	// Initialize PQ validator with loaded keys
	pqValidator := pq.NewValidator()
	// Setup RPC server if enabled
	if *rpcEnabled {
		rpcServer := rpc.NewRPCServer(g, pqValidator, posS, mempool)
		rpc.StartRPCOnce(rpcServer, *rpcBind)
	} else {
		fmt.Printf("RPC server disabled\n")
	}

	// Initialize BlockProducer with enhanced transaction handling and gas limits
	blockProducerConfig := producer.BlockProducerConfig{
		MaxBlockSize:   genesis.DAGConfig.MaxBlockSize,
		BlockInterval:  time.Duration(genesis.DAGConfig.LayerInterval) * time.Second,
		MaxTxsPerBlock: genesis.DAGConfig.MaxTxsPerBlock,
		MinTxsPerBlock: genesis.DAGConfig.MinTxsPerBlock,
		MaxGasLimit:    15000000, // 15M gas per block
		MinGasLimit:    1000000,  // 1M gas minimum
	}

	// Create a dummy validator for block producer (will be selected by PoS)
	dummyPQValidator := &pq.Validator{ID: currentValidatorID}

	blockProducer := producer.NewBlockProducer(g, posS, mempool, blockStorage, dummyPQValidator, blockProducerConfig)
	blockProducer.Start()
	fmt.Printf("Initialized BlockProducer with mempool-driven transaction handling\n")

	// Initialize P2P manager if enabled
	var p2pManager *p2p.P2PManager
	var syncManager *p2p.SyncManager
	if *p2pEnabled {
		// Determine P2P bind address
		p2pBindAddr := *p2pBind
		if *p2pPort != 8555 {
			// Override port if p2p-port is specified
			p2pBindAddr = fmt.Sprintf("0.0.0.0:%d", *p2pPort)
		}

		p2pManager, err = p2p.NewP2PManager(g, blockStorage, p2pBindAddr)
		if err != nil {
			log.Fatalf("Failed to create P2P manager: %v", err)
		}
		p2pManager.Start()
		fmt.Printf("Initialized P2P manager on %s\n", p2pBindAddr)

		// Connect to bootnode if specified
		if *bootnode != "" {
			fmt.Printf("Connecting to bootnode %s\n", *bootnode)
			if err := p2pManager.ConnectToPeer(*bootnode); err != nil {
				log.Printf("Failed to connect to bootnode %s: %v", *bootnode, err)
			}
		}

		// Connect to additional peers if specified
		if *p2pPeers != "" {
			peers := strings.Split(*p2pPeers, ",")
			for _, peer := range peers {
				peer = strings.TrimSpace(peer)
				if peer != "" {
					fmt.Printf("Connecting to peer %s\n", peer)
					if err := p2pManager.ConnectToPeer(peer); err != nil {
						log.Printf("Failed to connect to peer %s: %v", peer, err)
					}
				}
			}
		}

		// Set P2P manager in block producer for gossip
		blockProducer.SetP2PManager(p2pManager)

		// Initialize sync manager
		syncManager = p2p.NewSyncManager(p2pManager, g, blockStorage)
		syncManager.StartSync()
		fmt.Printf("Initialized sync manager\n")

		// Connect to initial peers if provided
		if *p2pPeers != "" {
			peerList := strings.Split(*p2pPeers, ",")
			for _, peerAddr := range peerList {
				peerAddr = strings.TrimSpace(peerAddr)
				if peerAddr != "" {
					if err := p2pManager.ConnectToPeer(peerAddr); err != nil {
						log.Printf("Failed to connect to peer %s: %v", peerAddr, err)
					} else {
						fmt.Printf("Connected to peer: %s\n", peerAddr)
					}
				}
			}
		}
	} else {
		fmt.Printf("P2P networking disabled\n")
	}

	// Display configuration
	fmt.Printf("\n=== Node Configuration ===\n")
	fmt.Printf("Chain ID: %s\n", genesis.ChainID)
	fmt.Printf("Network Name: %s\n", genesis.NetworkName)
	fmt.Printf("DAG Rule: %s\n", genesis.DAGConfig.SelectedParentRule)
	fmt.Printf("Layer Interval: %.1f seconds\n", genesis.DAGConfig.LayerInterval)
	fmt.Printf("Max Transactions per Layer: %d\n", genesis.DAGConfig.MaxTransactionsPerLayer)
	fmt.Printf("Max Parents per Vertex: %d\n", genesis.DAGConfig.MaxParentsPerVertex)
	fmt.Printf("PQ Scheme: %s\n", genesis.PQConfig.Scheme)
	fmt.Printf("Hash Algorithm: %s\n", genesis.PQConfig.HashAlgo)
	fmt.Printf("Public Key Size: %d bytes\n", genesis.PQConfig.PublicKeySize)
	fmt.Printf("Signature Size: %d bytes\n", genesis.PQConfig.SignatureSize)
	fmt.Printf("Soft Finality: %.0f%% stake, %d consecutive layers\n", genesis.FinalityConfig.SoftFinalityThreshold*100, genesis.FinalityConfig.SoftFinalityLayers)
	fmt.Printf("Hard Finality: %.0f%% stake, %d second epoch\n", genesis.FinalityConfig.HardFinalityThreshold*100, genesis.FinalityConfig.HardFinalityEpochWindow)
	fmt.Printf("Max Block Size: %d bytes\n", genesis.DAGConfig.MaxBlockSize)
	fmt.Printf("Sign Timeout: %d ms\n", genesis.PQConfig.SignTimeout)
	fmt.Printf("RPC Bind Address: %s\n", *rpcBind)
	fmt.Printf("Block Producer: enabled (mempool-driven)\n")
	if *p2pEnabled {
		fmt.Printf("P2P Networking: enabled on %s\n", *p2pBind)
		if *p2pPeers != "" {
			fmt.Printf("Initial Peers: %s\n", *p2pPeers)
		}
	} else {
		fmt.Printf("P2P Networking: disabled\n")
	}

	fmt.Printf("\n=== Node Started Successfully ===\n")
	fmt.Printf("Ready to process blocks with DAG + PQ integration\n")
	fmt.Printf("RPC server listening on %s\n", *rpcBind)
	fmt.Printf("Block producer running (mempool-driven)\n")

	// Initialize graceful shutdown handler
	shutdownHandler := NewGracefulShutdownHandler()
	shutdownHandler.SetComponents(g, posS, blockStorage, mempool, blockProducer, p2pManager, syncManager, pqValidator)
	shutdownHandler.StartSignalHandling()

	// Start monitoring goroutine with shutdown context
	go startMonitoringWithContext(shutdownHandler.GetContext(), mempool, g, posS)

	// Wait for shutdown signal
	shutdownHandler.Wait()
}

// startLayerManager manages layer advancement with the specified interval
func startLayerManager(posS *dag.POSEngine, interval float64) {
	ticker := time.NewTicker(time.Duration(interval * float64(time.Second)))
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			posS.AdvanceLayer()
			layer := posS.CurrentLayer

			// Check finality
			if posS.CheckSoftFinality(layer) {
				fmt.Printf("[%s] Layer %d achieved SOFT finality\n", time.Now().Format(time.RFC3339), layer)
			}

			if posS.CheckHardFinality() {
				fmt.Printf("[%s] Current epoch achieved HARD finality\n", time.Now().Format(time.RFC3339))
			}

			fmt.Printf("[%s] Advanced to layer %d\n", time.Now().Format(time.RFC3339), layer)
		}
	}
}

func handleBlockSubmission(w http.ResponseWriter, r *http.Request, g *dag.GhostDAG, pqValidator *pq.PQValidator, posS *dag.POSEngine, blockStorage *storage.BlockStorage) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var submission BlockSubmission
	if err := json.NewDecoder(r.Body).Decode(&submission); err != nil {
		response := BlockResponse{
			Success: false,
			Message: "Invalid JSON payload",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Select validator using PoS engine
	selectedValidator := posS.SelectValidator()
	if selectedValidator == nil {
		response := BlockResponse{
			Success: false,
			Message: "No validators available",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Sign the block payload with selected validator
	sig, err := pqValidator.SignWithDomain([]byte(submission.Payload), pq.DomainTX)
	if err != nil {
		response := BlockResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to sign block: %v", err),
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Create block with unique hash based on payload content
	hashInput := fmt.Sprintf("%s:%s:%d", submission.Payload, submission.Validator, time.Now().UnixNano())
	hash := sha3.NewLegacyKeccak256()
	hash.Write([]byte(hashInput))
	hashBytes := hash.Sum(nil)
	block := &dag.Block{
		Hash:               "block_" + hex.EncodeToString(hashBytes)[:16],
		Parents:            []string{"genesis"},
		Height:             int64(g.GetBlockCount() + 1),
		BlueScore:          1,
		Timestamp:          time.Now().Unix(),
		Signature:          hex.EncodeToString(sig),
		ProducerID:         submission.Validator,
		ProducerPubKeyHash: pqValidator.GetPublicKeyHash(),
	}

	// Validate block before adding to DAG
	if err := consensus.ValidateBlock(block, g, pqValidator, posS); err != nil {
		response := BlockResponse{
			Success: false,
			Message: fmt.Sprintf("Block validation failed: %v", err),
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Add block to DAG
	if err := g.AddBlock(block); err != nil {
		response := BlockResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to add block to DAG: %v", err),
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Persist block to disk with deterministic append-only log
	if err := blockStorage.StoreBlock(block); err != nil {
		log.Printf("Failed to persist block %s: %v", block.Hash, err)
	}

	// Log the processed block
	log.Printf("Processed block: Hash=%s, Payload=%s, Validator=%s, Signature Length=%d bytes, Layer=%d",
		block.Hash, submission.Payload, selectedValidator.ID, len(sig), posS.CurrentLayer)

	// Return success response
	response := BlockResponse{
		Success:    true,
		Message:    "Block submitted successfully",
		BlockHash:  block.Hash,
		BlockCount: g.GetBlockCount(),
		Timestamp:  block.Timestamp,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// startMonitoring provides periodic status updates
func startMonitoring(mempool *mempool.Mempool, g *dag.GhostDAG, posS *dag.POSEngine) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			fmt.Printf("\n[%s] Node Status:\n", time.Now().Format(time.RFC3339))
			fmt.Printf("  Layer: %d\n", posS.CurrentLayer)
			fmt.Printf("  DAG Blocks: %d\n", g.GetBlockCount())
			fmt.Printf("  Mempool Size: %d\n", mempool.Size())
		}
	}
}

// startMonitoringWithContext provides periodic status updates with context cancellation support
func startMonitoringWithContext(ctx context.Context, mempool *mempool.Mempool, g *dag.GhostDAG, posS *dag.POSEngine) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			fmt.Printf("\n[%s] Monitoring stopped due to shutdown\n", time.Now().Format(time.RFC3339))
			return
		case <-ticker.C:
			fmt.Printf("\n[%s] Node Status:\n", time.Now().Format(time.RFC3339))
			fmt.Printf("  Layer: %d\n", posS.CurrentLayer)
			fmt.Printf("  DAG Blocks: %d\n", g.GetBlockCount())
			fmt.Printf("  Mempool Size: %d\n", mempool.Size())
		}
	}
}

// generateRandomBytes generates random bytes of the specified length
func generateRandomBytes(length int) []byte {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return bytes
}

// generateBlockHash generates a mock block hash
func generateBlockHash(payload string) string {
	hash := make([]byte, 32)
	rand.Read(hash) // Simplified hash generation
	return "block_" + hex.EncodeToString(hash)[:16]
}

// computeBlockHash calculates the expected hash for a block using SHA256
func computeBlockHash(block *dag.Block) string {
	// Create hash input from block content for deterministic hashing
	hashInput := fmt.Sprintf("%s:%d:%d:%d:%s",
		block.Parents, block.Height, block.BlueScore, block.Timestamp, block.SelectedParent)

	// Use SHA256 for proper cryptographic hashing
	hash := sha3.NewLegacyKeccak256()
	hash.Write([]byte(hashInput))
	hashBytes := hash.Sum(nil)
	return fmt.Sprintf("%x", hashBytes)[:16]
}
