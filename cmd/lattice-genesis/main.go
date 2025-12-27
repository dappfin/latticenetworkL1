package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"latticenetworkL1/core/pq"
)

// GenesisConfig represents the complete genesis configuration
type GenesisConfig struct {
	ChainID        string         `json:"chain_id"`
	NetworkName    string         `json:"network_name"`
	Timestamp      int64          `json:"timestamp"`
	Validators     []Validator    `json:"validators"`
	DAGConfig      DAGConfig      `json:"dag_config"`
	PQConfig       PQConfig       `json:"pq_config"`
	FinalityConfig FinalityConfig `json:"finality_config"`
}

// Validator represents a validator in genesis
type Validator struct {
	ID           string `json:"id"`
	PQPubKeyHash string `json:"pq_pubkey_hash"`
	Stake        uint64 `json:"stake"`
	Weight       uint64 `json:"weight"`
	PQPublicKey  string `json:"pq_public_key"`
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
}

// PQConfig represents post-quantum configuration
type PQConfig struct {
	Scheme        string `json:"scheme"`
	HashAlgo      string `json:"hash_algo"`
	SignTimeout   int    `json:"sign_timeout"`
	PublicKeySize int    `json:"public_key_size"`
	SignatureSize int    `json:"signature_size"`
}

// FinalityConfig represents finality thresholds
type FinalityConfig struct {
	SoftFinalityThreshold   float64 `json:"soft_finality_threshold"`
	SoftFinalityLayers      int     `json:"soft_finality_layers"`
	HardFinalityThreshold   float64 `json:"hard_finality_threshold"`
	HardFinalityEpochWindow int     `json:"hard_finality_epoch_window"`
}

// KeyPair represents a generated key pair
type KeyPair struct {
	PrivateKey string `json:"private_key"`
	PublicKey  string `json:"public_key"`
}

func main() {
	var (
		command       = flag.String("command", "", "Command to run: generate-key, create-genesis")
		output        = flag.String("output", "", "Output file path")
		validatorID   = flag.String("validator-id", "", "Validator ID for key generation")
		stake         = flag.Uint64("stake", 1000000, "Initial stake amount")
		weight        = flag.Uint64("weight", 100, "Validator weight")
		numValidators = flag.Int("num-validators", 3, "Number of validators for genesis")
	)
	flag.Parse()

	if *command == "" {
		fmt.Println("Usage: lattice-genesis -command=<command> [options]")
		fmt.Println("Commands:")
		fmt.Println("  generate-key  - Generate a new PQ key pair")
		fmt.Println("  create-genesis - Create genesis file with validators")
		os.Exit(1)
	}

	switch *command {
	case "generate-key":
		generateKey(*output, *validatorID)
	case "create-genesis":
		createGenesis(*output, *numValidators, *stake, *weight)
	default:
		log.Fatalf("Unknown command: %s", *command)
	}
}

// generateKey creates a new PQ key pair for a validator
func generateKey(outputPath, validatorID string) {
	if validatorID == "" {
		log.Fatal("validator-id is required for key generation")
	}

	if outputPath == "" {
		outputPath = fmt.Sprintf("%s_pq_key.json", validatorID)
	}

	fmt.Printf("🔐 Generating PQ key pair for validator: %s\n", validatorID)

	// Create a new PQ validator
	validator := pq.NewValidator()

	// Generate key pair (using the existing validator structure)
	privateKey := make([]byte, 4000) // Placeholder private key
	publicKey := validator.GetPublicKey()

	// Generate random private key for demo
	rand.Read(privateKey)

	keyPair := KeyPair{
		PrivateKey: hex.EncodeToString(privateKey),
		PublicKey:  hex.EncodeToString(publicKey),
	}

	// Save key pair to file
	keyData, err := json.MarshalIndent(keyPair, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal key pair: %v", err)
	}

	err = os.WriteFile(outputPath, keyData, 0644)
	if err != nil {
		log.Fatalf("Failed to write key file: %v", err)
	}

	fmt.Printf("✅ Key pair generated and saved to: %s\n", outputPath)
	fmt.Printf("📍 Address: %s\n", validator.GetAddressHex())
	fmt.Printf("🔑 Public Key: %s bytes\n", fmt.Sprintf("%d", len(publicKey)))
	fmt.Printf("🔒 Private Key: %s bytes\n", fmt.Sprintf("%d", len(privateKey)))
}

// createGenesis creates a genesis file with multiple validators
func createGenesis(outputPath string, numValidators int, defaultStake, defaultWeight uint64) {
	if outputPath == "" {
		outputPath = "genesis.json"
	}

	fmt.Printf("🏗️  Creating genesis file with %d validators\n", numValidators)

	// Create genesis configuration
	genesis := GenesisConfig{
		ChainID:     "88401",
		NetworkName: "Lattice Network",
		Timestamp:   time.Now().Unix(),
		Validators:  make([]Validator, 0),
		DAGConfig: DAGConfig{
			MaxBlockSize:            1000000,
			BlueScoreWindow:         1000,
			SelectedParentRule:      "ghostdag",
			AnticoneSizeLimit:       100,
			LayerInterval:           1.6,
			MaxTransactionsPerLayer: 300,
			MaxParentsPerVertex:     2,
		},
		PQConfig: PQConfig{
			Scheme:        "crystals-dilithium-level2",
			HashAlgo:      "keccak-256",
			SignTimeout:   5000,
			PublicKeySize: 1312,
			SignatureSize: 2420,
		},
		FinalityConfig: FinalityConfig{
			SoftFinalityThreshold:   0.67,
			SoftFinalityLayers:      2,
			HardFinalityThreshold:   0.67,
			HardFinalityEpochWindow: 30,
		},
	}

	// Generate validators
	for i := 0; i < numValidators; i++ {
		validatorID := fmt.Sprintf("validator_%d", i+1)

		// Create a new PQ validator for each
		validator := pq.NewValidator()
		publicKey := validator.GetPublicKey()
		publicKeyHash := validator.GetPublicKeyHash()

		genValidator := Validator{
			ID:           validatorID,
			PQPubKeyHash: publicKeyHash,
			Stake:        defaultStake,
			Weight:       defaultWeight,
			PQPublicKey:  hex.EncodeToString(publicKey),
		}

		genesis.Validators = append(genesis.Validators, genValidator)

		fmt.Printf("   📝 Added validator: %s (stake: %d, weight: %d)\n",
			validatorID, defaultStake, defaultWeight)
		fmt.Printf("      📍 Address: %s\n", validator.GetAddressHex())
		fmt.Printf("      🔑 PubKey Hash: %s\n", publicKeyHash)
	}

	// Save genesis file
	genesisData, err := json.MarshalIndent(genesis, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal genesis: %v", err)
	}

	// Ensure directory exists
	dir := filepath.Dir(outputPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatalf("Failed to create directory: %v", err)
	}

	err = os.WriteFile(outputPath, genesisData, 0644)
	if err != nil {
		log.Fatalf("Failed to write genesis file: %v", err)
	}

	fmt.Printf("\n✅ Genesis file created: %s\n", outputPath)
	fmt.Printf("📊 Genesis Summary:\n")
	fmt.Printf("   Chain ID: %s\n", genesis.ChainID)
	fmt.Printf("   Network: %s\n", genesis.NetworkName)
	fmt.Printf("   Validators: %d\n", len(genesis.Validators))
	fmt.Printf("   Layer Interval: %.1fs\n", genesis.DAGConfig.LayerInterval)
	fmt.Printf("   Max TX/Layer: %d\n", genesis.DAGConfig.MaxTransactionsPerLayer)
	fmt.Printf("   Max Parents: %d\n", genesis.DAGConfig.MaxParentsPerVertex)
	fmt.Printf("   PQ Scheme: %s\n", genesis.PQConfig.Scheme)
	fmt.Printf("   Hash Algorithm: %s\n", genesis.PQConfig.HashAlgo)
	fmt.Printf("   Soft Finality: %.0f%% stake, %d layers\n",
		genesis.FinalityConfig.SoftFinalityThreshold*100, genesis.FinalityConfig.SoftFinalityLayers)
	fmt.Printf("   Hard Finality: %.0f%% stake, %ds epoch\n",
		genesis.FinalityConfig.HardFinalityThreshold*100, genesis.FinalityConfig.HardFinalityEpochWindow)
}
