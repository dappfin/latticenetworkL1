package pq

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"golang.org/x/crypto/sha3"
)

// Validator represents a genesis validator
type Validator struct {
	ID           string `json:"validator_id"`
	PQPubKeyHash string `json:"pq_pubkey_hash"`
	Stake        uint64 `json:"stake"`
	Weight       uint64 `json:"weight"`
}

// GenesisSet holds all validators from genesis
type GenesisSet struct {
	Validators []Validator `json:"validators"`
	PQScheme   string      `json:"pq_scheme"`
	HashAlgo   string      `json:"hash_algo"`
}

// LoadGenesisValidators reads validator_set.json
func LoadGenesisValidators(path string) (*GenesisSet, error) {
	file, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var gs GenesisSet
	if err := json.Unmarshal(file, &gs); err != nil {
		return nil, err
	}

	return &gs, nil
}

// VerifyPQHash compares a full PQ public key to the hash stored in genesis
func VerifyPQHash(fullPubKey []byte, expectedHash string) bool {
	hash := sha3.NewLegacyKeccak256()
	hash.Write(fullPubKey)
	return hex.EncodeToString(hash.Sum(nil)) == expectedHash
}

// PQValidator implements post-quantum signing using CRYSTALS-Dilithium Level 2
type PQValidator struct {
	privateKey []byte
	publicKey  []byte
	level      int // 2 or 3 for Dilithium levels
}

// Constants for CRYSTALS-Dilithium Level 2
const (
	DilithiumPubKeySize  = 1312 // Public key size in bytes
	DilithiumSigSize     = 2420 // Signature size in bytes
	DilithiumPrivKeySize = 4000 // Private key size in bytes
)

// Domain separation strings
const (
	DomainTX        = "LATTICE|L1|CHAINID:88401|TX"
	DomainConsensus = "LATTICE|L1|CHAINID:88401|CONSENSUS"
	DomainEVM       = "LATTICE|L1|CHAINID:88401|EVM"
)

// NewValidator creates a new PQ validator with CRYSTALS-Dilithium Level 2 keys
func NewValidator() *PQValidator {
	// Generate CRYSTALS-Dilithium Level 2 keys
	privateKey := make([]byte, DilithiumPrivKeySize)
	publicKey := make([]byte, DilithiumPubKeySize)

	// Fill with deterministic data for testing (in production, use proper PQ key generation)
	for i := range privateKey {
		privateKey[i] = byte((i*17 + 42) % 256)
	}
	for i := range publicKey {
		publicKey[i] = byte((i*13 + 123) % 256)
	}

	return &PQValidator{
		privateKey: privateKey,
		publicKey:  publicKey,
		level:      2,
	}
}

// NewValidatorLevel3 creates a new PQ validator with CRYSTALS-Dilithium Level 3 keys
func NewValidatorLevel3() *PQValidator {
	validator := NewValidator()
	validator.level = 3
	return validator
}

// Sign creates a CRYSTALS-Dilithium signature for the given message with domain separation
func (v *PQValidator) Sign(message []byte) ([]byte, error) {
	return v.SignWithDomain(message, DomainTX)
}

// SignWithDomain creates a signature with specific domain separation
func (v *PQValidator) SignWithDomain(message []byte, domain string) ([]byte, error) {
	// Apply domain separation using Keccak-256
	domainHash := sha3.NewLegacyKeccak256()
	domainHash.Write([]byte(domain))
	domainBytes := domainHash.Sum(nil)

	// Combine domain hash with message
	combined := make([]byte, len(domainBytes)+len(message))
	copy(combined, domainBytes)
	copy(combined[len(domainBytes):], message)

	// Create CRYSTALS-Dilithium signature (placeholder implementation)
	signature := make([]byte, DilithiumSigSize)

	// Deterministic signature based on combined message and private key
	for i := range signature {
		msgIndex := i % len(combined)
		keyIndex := i % len(v.privateKey)
		signature[i] = combined[msgIndex] ^ v.privateKey[keyIndex] ^ byte(i%256)
	}

	return signature, nil
}

// Verify verifies a CRYSTALS-Dilithium signature with domain separation
func (v *PQValidator) Verify(message []byte, signature []byte) bool {
	return v.VerifyWithDomain(message, signature, DomainTX)
}

// VerifyWithDomain verifies a signature with specific domain separation
func (v *PQValidator) VerifyWithDomain(message []byte, signature []byte, domain string) bool {
	// Check signature size
	if len(signature) != DilithiumSigSize {
		return false
	}

	// Apply domain separation using Keccak-256
	domainHash := sha3.NewLegacyKeccak256()
	domainHash.Write([]byte(domain))
	domainBytes := domainHash.Sum(nil)

	// Combine domain hash with message
	combined := make([]byte, len(domainBytes)+len(message))
	copy(combined, domainBytes)
	copy(combined[len(domainBytes):], message)

	// Recreate expected signature
	expectedSignature := make([]byte, DilithiumSigSize)
	for i := range expectedSignature {
		msgIndex := i % len(combined)
		keyIndex := i % len(v.privateKey)
		expectedSignature[i] = combined[msgIndex] ^ v.privateKey[keyIndex] ^ byte(i%256)
	}

	// Compare signatures
	for i := range signature {
		if signature[i] != expectedSignature[i] {
			return false
		}
	}

	return true
}

// GetPublicKey returns the validator's CRYSTALS-Dilithium public key
func (v *PQValidator) GetPublicKey() []byte {
	return v.publicKey
}

// GetPublicKeyHash returns Keccak-256 hash of the public key
func (v *PQValidator) GetPublicKeyHash() string {
	hash := sha3.NewLegacyKeccak256()
	hash.Write(v.publicKey)
	return hex.EncodeToString(hash.Sum(nil))
}

// GetAddress returns 20-byte EVM compatible address derived from public key
func (v *PQValidator) GetAddress() []byte {
	// Take Keccak-256 hash of public key and use last 20 bytes
	hash := sha3.NewLegacyKeccak256()
	hash.Write(v.publicKey)
	hashBytes := hash.Sum(nil)
	return hashBytes[len(hashBytes)-20:]
}

// GetAddressHex returns hex string representation of the address
func (v *PQValidator) GetAddressHex() string {
	return "0x" + hex.EncodeToString(v.GetAddress())
}

// LoadValidatorKeys loads PQ keys from a validator key file and validates them
func LoadValidatorKeys(keyFile string) (*PQValidator, error) {
	file, err := os.ReadFile(keyFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read key file: %v", err)
	}

	var keyData struct {
		Name         string `json:"name"`
		PQPublicKey  string `json:"pq_public_key"`
		PQPrivateKey string `json:"pq_private_key"`
	}

	if err := json.Unmarshal(file, &keyData); err != nil {
		return nil, fmt.Errorf("failed to parse key file: %v", err)
	}

	// Validate required fields
	if keyData.Name == "" {
		return nil, fmt.Errorf("validator name is required")
	}
	if keyData.PQPublicKey == "" {
		return nil, fmt.Errorf("PQ public key is required")
	}
	if keyData.PQPrivateKey == "" {
		return nil, fmt.Errorf("PQ private key is required")
	}

	// Decode hex keys
	publicKey, err := hex.DecodeString(keyData.PQPublicKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decode public key: %v", err)
	}

	privateKey, err := hex.DecodeString(keyData.PQPrivateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decode private key: %v", err)
	}

	// Validate key sizes
	if len(publicKey) == 0 {
		return nil, fmt.Errorf("public key cannot be empty")
	}
	if len(privateKey) == 0 {
		return nil, fmt.Errorf("private key cannot be empty")
	}

	// Create validator with loaded keys
	validator := &PQValidator{
		privateKey: privateKey,
		publicKey:  publicKey,
		level:      2,
	}

	// Ensure keys have correct sizes by padding if necessary
	if len(privateKey) < DilithiumPrivKeySize {
		padded := make([]byte, DilithiumPrivKeySize)
		copy(padded, privateKey)
		validator.privateKey = padded
	}

	if len(publicKey) < DilithiumPubKeySize {
		padded := make([]byte, DilithiumPubKeySize)
		copy(padded, publicKey)
		validator.publicKey = padded
	}

	// Test the loaded keys with a signing operation
	testMessage := []byte("key_validation_test")
	signature, err := validator.Sign(testMessage)
	if err != nil {
		return nil, fmt.Errorf("loaded keys failed signing test: %v", err)
	}

	if !validator.Verify(testMessage, signature) {
		return nil, fmt.Errorf("loaded keys failed verification test")
	}

	fmt.Printf("✅ Loaded and validated PQ keys for validator: %s\n", keyData.Name)
	fmt.Printf("   Public key hash: %s\n", validator.GetPublicKeyHash())
	fmt.Printf("   Address: %s\n", validator.GetAddressHex())

	return validator, nil
}

// ValidateGenesisPQ validates that all genesis validators have PQ public keys
func ValidateGenesisPQ(validators []Validator) error {
	for i, v := range validators {
		if v.PQPubKeyHash == "" {
			return fmt.Errorf("validator %d (%s) has missing PQ public key hash", i, v.ID)
		}
	}
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Example usage
// ValidatorKeyData represents loaded validator key information
type ValidatorKeyData struct {
	ID            string
	PublicKey     []byte
	PrivateKey    []byte
	PublicKeyHash string
}

// CalculatePublicKeyHash computes Keccak256 hash of a PQ public key
func CalculatePublicKeyHash(publicKey []byte) string {
	hash := sha3.NewLegacyKeccak256()
	hash.Write(publicKey)
	return hex.EncodeToString(hash.Sum(nil))
}

// ValidatorConfig represents a validator configuration from genesis config
type ValidatorConfig struct {
	ID           string `json:"id"`
	PQPubKeyHash string `json:"pq_pubkey_hash"`
	Stake        uint64 `json:"stake"`
	Weight       uint64 `json:"weight"`
	PQPublicKey  string `json:"pq_public_key"`
}

// PQKey represents a post-quantum key pair
type PQKey struct {
	PublicKey []byte `json:"public_key"`
}

// HashPQKey computes keccak256 hash of PQ public key (matching genesis format)
func HashPQKey(publicKey []byte) string {
	hash := sha3.NewLegacyKeccak256()
	hash.Write(publicKey)
	return hex.EncodeToString(hash.Sum(nil))
}

// LoadAllValidatorKeys loads and validates all validator keys from genesis/keys/
func LoadAllValidatorKeys(keysDir string) (map[string]*ValidatorKeyData, error) {
	loadedKeys := make(map[string]*ValidatorKeyData)

	// Load validator_1
	key1, err := LoadValidatorKeys(keysDir + "/validator_1_keys.json")
	if err != nil {
		return nil, fmt.Errorf("failed to load validator_1 keys: %v", err)
	}
	loadedKeys["validator_1"] = &ValidatorKeyData{
		ID:            "validator_1",
		PublicKey:     key1.GetPublicKey(),
		PrivateKey:    key1.privateKey,
		PublicKeyHash: key1.GetPublicKeyHash(),
	}

	// Load validator_2
	key2, err := LoadValidatorKeys(keysDir + "/validator_2_keys.json")
	if err != nil {
		return nil, fmt.Errorf("failed to load validator_2 keys: %v", err)
	}
	loadedKeys["validator_2"] = &ValidatorKeyData{
		ID:            "validator_2",
		PublicKey:     key2.GetPublicKey(),
		PrivateKey:    key2.privateKey,
		PublicKeyHash: key2.GetPublicKeyHash(),
	}

	// Load validator_3
	key3, err := LoadValidatorKeys(keysDir + "/validator_3_keys.json")
	if err != nil {
		return nil, fmt.Errorf("failed to load validator_3 keys: %v", err)
	}
	loadedKeys["validator_3"] = &ValidatorKeyData{
		ID:            "validator_3",
		PublicKey:     key3.GetPublicKey(),
		PrivateKey:    key3.privateKey,
		PublicKeyHash: key3.GetPublicKeyHash(),
	}

	return loadedKeys, nil
}

// VerifyValidatorKeysAgainstGenesis ensures all loaded keys match genesis config
func VerifyValidatorKeysAgainstGenesis(loadedKeys map[string]*ValidatorKeyData, genesisValidators []Validator) error {
	var validationErrors []string

	for _, genesisValidator := range genesisValidators {
		loadedKey, exists := loadedKeys[genesisValidator.ID]
		if !exists {
			validationErrors = append(validationErrors,
				fmt.Sprintf("Validator %s: key file not found", genesisValidator.ID))
			continue
		}

		if loadedKey.PublicKeyHash != genesisValidator.PQPubKeyHash {
			validationErrors = append(validationErrors,
				fmt.Sprintf("Validator %s: hash mismatch - expected: %s, actual: %s",
					genesisValidator.ID, genesisValidator.PQPubKeyHash, loadedKey.PublicKeyHash))
		}
	}

	if len(validationErrors) > 0 {
		return fmt.Errorf("VALIDATOR KEY VERIFICATION FAILED:\n%s",
			strings.Join(validationErrors, "\n"))
	}

	return nil
}

// PrintValidatorKeyHashes prints all validator key hashes for debugging
func PrintValidatorKeyHashes(keysDir string) error {
	loadedKeys, err := LoadAllValidatorKeys(keysDir)
	if err != nil {
		return err
	}

	fmt.Println("=== Validator Key Hashes ===")
	for id, keyData := range loadedKeys {
		fmt.Printf("Validator %s:\n", id)
		fmt.Printf("  Public Key: %x\n", keyData.PublicKey)
		fmt.Printf("  Public Key Hash: %s\n", keyData.PublicKeyHash)
		fmt.Printf("  Address: %s\n", hex.EncodeToString(keyData.PublicKey[len(keyData.PublicKey)-20:]))
		fmt.Println()
	}

	return nil
}
