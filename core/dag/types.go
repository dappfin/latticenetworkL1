package dag

// FinalityConfig represents finality thresholds
type FinalityConfig struct {
	SoftFinalityThreshold   float64 `json:"soft_finality_threshold"`
	SoftFinalityLayers      int     `json:"soft_finality_layers"`
	HardFinalityThreshold   float64 `json:"hard_finality_threshold"`
	HardFinalityEpochWindow int     `json:"hard_finality_epoch_window"`
}
