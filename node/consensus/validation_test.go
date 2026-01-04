package consensus

import (
	"encoding/hex"
	"testing"
	"time"

	"latticenetworkL1/core/dag"
	"latticenetworkL1/core/pq"
)

// TestInvalidBlockRejection creates test cases for various invalid block scenarios
func TestInvalidBlockRejection(t *testing.T) {
	// Setup test environment
	testDAG := dag.NewGhostDAG()
	testValidator := &pq.PQValidator{}
	testPOSEngine := &dag.POSEngine{}

	// Create a valid genesis block for testing
	genesisBlock := &dag.Block{
		Hash:      "genesis",
		Parents:   []string{},
		Height:    0,
		BlueScore: 0,
		Timestamp: time.Now().Unix(),
		Signature: "valid_signature",
	}
	testDAG.AddBlock(genesisBlock)

	tests := []struct {
		name        string
		block       *dag.Block
		expectError bool
		errorMsg    string
	}{
		{
			name:        "Valid Block",
			block:       createValidBlock(testDAG, 1),
			expectError: false,
		},
		{
			name: "Corrupt PQ Signature - Empty",
			block: &dag.Block{
				Hash:      "test_block_1",
				Parents:   []string{"genesis"},
				Height:    1,
				BlueScore: 1,
				Timestamp: time.Now().Unix(),
				Signature: "", // Empty signature
			},
			expectError: true,
			errorMsg:    "empty signature",
		},
		{
			name: "Corrupt PQ Signature - Too Short",
			block: &dag.Block{
				Hash:      "test_block_2",
				Parents:   []string{"genesis"},
				Height:    1,
				BlueScore: 1,
				Timestamp: time.Now().Unix(),
				Signature: "1234", // Too short
			},
			expectError: true,
			errorMsg:    "signature too short",
		},
		{
			name: "Corrupt PQ Signature - All Zeros",
			block: &dag.Block{
				Hash:      "test_block_3",
				Parents:   []string{"genesis"},
				Height:    1,
				BlueScore: 1,
				Timestamp: time.Now().Unix(),
				Signature: hex.EncodeToString(make([]byte, 200)), // All zeros
			},
			expectError: true,
			errorMsg:    "signature appears corrupted",
		},
		{
			name: "Invalid Parent Reference - Missing Parent",
			block: &dag.Block{
				Hash:      "test_block_4",
				Parents:   []string{"nonexistent_parent"},
				Height:    1,
				BlueScore: 1,
				Timestamp: time.Now().Unix(),
				Signature: hex.EncodeToString(make([]byte, 200)), // Valid length
			},
			expectError: true,
			errorMsg:    "missing parent",
		},
		{
			name: "Invalid Parent Reference - Empty Parent",
			block: &dag.Block{
				Hash:      "test_block_5",
				Parents:   []string{""},
				Height:    1,
				BlueScore: 1,
				Timestamp: time.Now().Unix(),
				Signature: hex.EncodeToString(make([]byte, 200)),
			},
			expectError: true,
			errorMsg:    "missing parent",
		},
		{
			name: "Tampered Timestamp - Too Far Future",
			block: &dag.Block{
				Hash:      "test_block_6",
				Parents:   []string{"genesis"},
				Height:    1,
				BlueScore: 1,
				Timestamp: time.Now().Unix() + 1000, // 1000 seconds in future
				Signature: hex.EncodeToString(make([]byte, 200)),
			},
			expectError: true,
			errorMsg:    "timestamp too far in future",
		},
		{
			name: "Tampered Timestamp - Too Far Past",
			block: &dag.Block{
				Hash:      "test_block_7",
				Parents:   []string{"genesis"},
				Height:    1,
				BlueScore: 1,
				Timestamp: time.Now().Unix() - 7200, // 2 hours in past
				Signature: hex.EncodeToString(make([]byte, 200)),
			},
			expectError: true,
			errorMsg:    "timestamp too far in past",
		},
		{
			name: "Duplicate Block",
			block: func() *dag.Block {
				block := createValidBlock(testDAG, 1)
				testDAG.AddBlock(block) // Add the block first
				return block
			}(),
			expectError: true,
			errorMsg:    "duplicate block",
		},
		{
			name: "Invalid Hash - Corrupted",
			block: &dag.Block{
				Hash:      "invalid_hash_123",
				Parents:   []string{"genesis"},
				Height:    1,
				BlueScore: 1,
				Timestamp: time.Now().Unix(),
				Signature: hex.EncodeToString(make([]byte, 200)),
			},
			expectError: true,
			errorMsg:    "invalid hash",
		},
		{
			name: "Cycle Detection - Height Not Increasing",
			block: &dag.Block{
				Hash:      "test_block_8",
				Parents:   []string{"genesis"},
				Height:    0, // Same height as parent
				BlueScore: 1,
				Timestamp: time.Now().Unix(),
				Signature: hex.EncodeToString(make([]byte, 200)),
			},
			expectError: true,
			errorMsg:    "cycle detected",
		},
		{
			name: "Invalid BlueScore",
			block: &dag.Block{
				Hash:      "test_block_9",
				Parents:   []string{"genesis"},
				Height:    1,
				BlueScore: -1, // Invalid BlueScore
				Timestamp: time.Now().Unix(),
				Signature: hex.EncodeToString(make([]byte, 200)),
			},
			expectError: true,
			errorMsg:    "invalid bluescore",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateBlock(tt.block, testDAG, testValidator, testPOSEngine)

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error containing '%s', but got none", tt.errorMsg)
				} else if tt.errorMsg != "" && !contains(err.Error(), tt.errorMsg) {
					t.Errorf("Expected error containing '%s', but got: %v", tt.errorMsg, err)
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, but got: %v", err)
				}
			}
		})
	}
}

// createValidBlock creates a valid block for testing
func createValidBlock(testDAG *dag.GhostDAG, height int64) *dag.Block {
	// Create a valid signature (non-zero bytes)
	sig := make([]byte, 200)
	sig[0] = 1 // Make it non-zero

	return &dag.Block{
		Hash:      computeBlockHashForTest(height),
		Parents:   []string{"genesis"},
		Height:    height,
		BlueScore: 1,
		Timestamp: time.Now().Unix(),
		Signature: hex.EncodeToString(sig),
	}
}

// computeBlockHashForTest computes a deterministic hash for testing
func computeBlockHashForTest(height int64) string {
	return "test_hash_" + string(rune(height))
}

// contains checks if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && s[:len(substr)] == substr ||
		(len(s) > len(substr) && contains(s[1:], substr))
}
