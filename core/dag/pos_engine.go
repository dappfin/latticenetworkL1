package dag

import (
	"fmt"
	"time"

	"latticenetworkL1/core/pq"
)

// POSEngine holds validator state and staking info
type POSEngine struct {
	Validators      []*pq.Validator
	FinalityConfig  FinalityConfig
	CurrentLayer    int64
	LayerTimestamps []int64
	StakeHistory    []StakeSnapshot
	Participation   map[uint64]map[string]bool
}

// StakeSnapshot represents stake distribution at a point in time
type StakeSnapshot struct {
	Layer int64
	Stake map[string]uint64
	Total uint64
}

// NewPOSEngine initializes the PoS engine with finality configuration
func NewPOSEngine(validators []*pq.Validator, finalityConfig FinalityConfig) *POSEngine {
	// Initialize stake distribution
	stake := make(map[string]uint64)
	var totalStake uint64
	for _, v := range validators {
		stake[v.ID] = v.Stake
		totalStake += v.Stake
	}

	return &POSEngine{
		Validators:      validators,
		FinalityConfig:  finalityConfig,
		CurrentLayer:    0,
		LayerTimestamps: make([]int64, 0),
		StakeHistory:    []StakeSnapshot{{Layer: 0, Stake: stake, Total: totalStake}},
		Participation:   make(map[uint64]map[string]bool),
	}
}

// SelectValidator selects a validator for the next block using stake-weighted selection
func (p *POSEngine) SelectValidator() *pq.Validator {
	if len(p.Validators) == 0 {
		return nil
	}

	// Get current stake distribution
	currentStake := p.StakeHistory[len(p.StakeHistory)-1]
	totalWeight := currentStake.Total

	if totalWeight == 0 {
		return p.Validators[0]
	}

	// Simple weighted random selection based on stake
	// In production, use proper VRF or cryptographic selection
	var selected *pq.Validator
	accumulated := uint64(0)
	target := uint64(time.Now().UnixNano()) % totalWeight

	for _, v := range p.Validators {
		if stake, exists := currentStake.Stake[v.ID]; exists {
			accumulated += stake
			if accumulated >= target {
				selected = v
				break
			}
		}
	}

	if selected == nil {
		selected = p.Validators[0]
	}

	return selected
}

// ValidatorExists checks if a validator ID exists in the validator set
func (p *POSEngine) ValidatorExists(validatorID string) bool {
	for _, validator := range p.Validators {
		if validator.ID == validatorID {
			return true
		}
	}
	return false
}

// GetValidatorPQHash returns the PQ public key hash for a validator
func (p *POSEngine) GetValidatorPQHash(validatorID string) string {
	for _, validator := range p.Validators {
		if validator.ID == validatorID {
			return validator.PQPubKeyHash
		}
	}
	return ""
}

// RecordParticipation records that a validator participated in a specific layer
func (p *POSEngine) RecordParticipation(layer uint64, validatorID string) {
	if _, ok := p.Participation[layer]; !ok {
		p.Participation[layer] = make(map[string]bool)
	}

	// Only log if this is a new participation record for this validator at this layer
	if !p.Participation[layer][validatorID] {
		p.Participation[layer][validatorID] = true
		fmt.Printf("PARTICIPATION_TRACKED: Layer %d - Validator %s recorded as participant\n", layer, validatorID)

		// Log total participants for this layer
		totalParticipants := len(p.Participation[layer])
		fmt.Printf("PARTICIPATION_SUMMARY: Layer %d now has %d participants\n", layer, totalParticipants)
	}
}

// SignBlock simulates signing a block using PQ keys
func (p *POSEngine) SignBlock(validator *pq.Validator, blockData []byte, fullPQKey []byte) ([]byte, error) {
	// For now, create a mock signature since we don't have the actual PQ keys in the PoS engine
	// In production, this would use the validator's actual PQ private key
	signature := make([]byte, 2420) // Dilithium signature size
	for i := range signature {
		signature[i] = byte((i*7 + int(blockData[i%len(blockData)])) % 256)
	}

	fmt.Printf("[%s] Validator %s signed block at %s\n", time.Now().Format(time.RFC3339), validator.ID, time.Now())
	return signature, nil
}

// CheckSoftFinality determines if a layer has achieved soft finality
func (p *POSEngine) CheckSoftFinality(layer int64) bool {
	if layer < int64(p.FinalityConfig.SoftFinalityLayers) {
		return false
	}

	// Check last N consecutive layers for ≥67% stake participation
	for i := layer - int64(p.FinalityConfig.SoftFinalityLayers) + 1; i <= layer; i++ {
		if !p.checkLayerStakeThreshold(i, p.FinalityConfig.SoftFinalityThreshold) {
			return false
		}
	}

	return true
}

// CheckHardFinality determines if the current epoch has achieved hard finality
func (p *POSEngine) CheckHardFinality() bool {
	currentTime := time.Now().Unix()
	epochWindow := int64(p.FinalityConfig.HardFinalityEpochWindow)

	// Find layers within the epoch window
	validLayers := 0
	for i := len(p.LayerTimestamps) - 1; i >= 0 && currentTime-p.LayerTimestamps[i] <= epochWindow; i-- {
		validLayers++
	}

	if validLayers == 0 {
		return false
	}

	// Check if layers in epoch window have ≥67% stake participation
	for i := len(p.LayerTimestamps) - validLayers; i < len(p.LayerTimestamps); i++ {
		if !p.checkLayerStakeThreshold(int64(i), p.FinalityConfig.HardFinalityThreshold) {
			return false
		}
	}

	return true
}

// checkLayerStakeThreshold checks if a layer meets the stake threshold
func (p *POSEngine) checkLayerStakeThreshold(layer int64, threshold float64) bool {
	if layer >= int64(len(p.StakeHistory)) {
		layer = int64(len(p.StakeHistory)) - 1
	}

	stakeSnapshot := p.StakeHistory[layer]
	requiredStake := uint64(float64(stakeSnapshot.Total) * threshold)

	// In a real implementation, this would check actual signatures in the layer
	// For now, assume all validators participate
	var participatingStake uint64
	for _, v := range p.Validators {
		if stake, exists := stakeSnapshot.Stake[v.ID]; exists {
			participatingStake += stake
		}
	}

	return participatingStake >= requiredStake
}

// AdvanceLayer advances to the next layer and records timestamp
func (p *POSEngine) AdvanceLayer() {
	p.CurrentLayer++
	p.LayerTimestamps = append(p.LayerTimestamps, time.Now().Unix())

	// Copy current stake distribution to new layer
	if len(p.StakeHistory) > 0 {
		lastStake := p.StakeHistory[len(p.StakeHistory)-1]
		newStake := make(map[string]uint64)
		for k, v := range lastStake.Stake {
			newStake[k] = v
		}
		p.StakeHistory = append(p.StakeHistory, StakeSnapshot{
			Layer: p.CurrentLayer,
			Stake: newStake,
			Total: lastStake.Total,
		})
	}
}

// AddValidator dynamically adds a new validator to the network
func (p *POSEngine) AddValidator(validator *pq.Validator) error {
	// Check if validator already exists
	for _, v := range p.Validators {
		if v.ID == validator.ID {
			return fmt.Errorf("validator %s already exists", validator.ID)
		}
	}

	// Add validator to the list
	p.Validators = append(p.Validators, validator)

	// Update current stake distribution
	if len(p.StakeHistory) > 0 {
		currentStake := p.StakeHistory[len(p.StakeHistory)-1]
		newStake := make(map[string]uint64)
		for k, v := range currentStake.Stake {
			newStake[k] = v
		}
		newStake[validator.ID] = validator.Stake
		currentStake.Stake = newStake
		currentStake.Total += validator.Stake
	}

	return nil
}

// RemoveValidator removes a validator from the network
func (p *POSEngine) RemoveValidator(validatorID string) error {
	for i, v := range p.Validators {
		if v.ID == validatorID {
			// Remove from validators list
			p.Validators = append(p.Validators[:i], p.Validators[i+1:]...)

			// Update current stake distribution
			if len(p.StakeHistory) > 0 {
				currentStake := p.StakeHistory[len(p.StakeHistory)-1]
				if stake, exists := currentStake.Stake[validatorID]; exists {
					delete(currentStake.Stake, validatorID)
					currentStake.Total -= stake
				}
			}

			return nil
		}
	}

	return fmt.Errorf("validator %s not found", validatorID)
}

// UpdateValidatorStake updates a validator's stake amount
func (p *POSEngine) UpdateValidatorStake(validatorID string, newStake uint64) error {
	for _, v := range p.Validators {
		if v.ID == validatorID {
			oldStake := v.Stake
			v.Stake = newStake

			// Update current stake distribution
			if len(p.StakeHistory) > 0 {
				currentStake := p.StakeHistory[len(p.StakeHistory)-1]
				if _, exists := currentStake.Stake[validatorID]; exists {
					currentStake.Total = currentStake.Total - oldStake + newStake
					currentStake.Stake[validatorID] = newStake
				}
			}

			return nil
		}
	}

	return fmt.Errorf("validator %s not found", validatorID)
}

// GetActiveValidators returns all currently active validators
func (p *POSEngine) GetActiveValidators() []*pq.Validator {
	return p.Validators
}

// GetValidatorInfo returns detailed information about a specific validator
func (p *POSEngine) GetValidatorInfo(validatorID string) (*pq.Validator, error) {
	for _, v := range p.Validators {
		if v.ID == validatorID {
			return v, nil
		}
	}

	return nil, fmt.Errorf("validator %s not found", validatorID)
}

// GetTotalStake returns the total stake of all validators
func (p *POSEngine) GetTotalStake() uint64 {
	if len(p.StakeHistory) == 0 {
		return 0
	}
	return p.StakeHistory[len(p.StakeHistory)-1].Total
}
