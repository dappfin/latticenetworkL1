package metrics

import (
	"sync"
	"time"
)

// MetricsCollector collects and stores network metrics
type MetricsCollector struct {
	mu sync.RWMutex

	// Block metrics
	BlocksPerSecond    float64
	TotalBlocks        uint64
	LastBlockTimestamp int64

	// Layer metrics
	LayersPerSecond    float64
	CurrentLayer       int64
	LastLayerTimestamp int64

	// Validator metrics
	ActiveValidators int
	TotalStake       uint64

	// Mempool metrics
	MempoolSize        int
	MempoolSizeHistory []int64

	// Network metrics
	PeersConnected int
	NetworkUptime  int64

	// Finality metrics
	HardFinality bool
	SoftFinality bool

	// Performance metrics
	AverageBlockTime time.Duration
	PeakTPS          float64

	// History for charts
	History        []MetricSnapshot
	MaxHistorySize int
}

// MetricSnapshot represents metrics at a point in time
type MetricSnapshot struct {
	Timestamp       time.Time
	BlocksPerSecond float64
	LayersPerSecond float64
	CurrentLayer    int64
	MempoolSize     int
	Validators      int
	TotalStake      uint64
	PeersConnected  int
	HardFinality    bool
	SoftFinality    bool
}

// NewMetricsCollector creates a new metrics collector
func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{
		MempoolSizeHistory: make([]int64, 0),
		History:            make([]MetricSnapshot, 0),
		MaxHistorySize:     1000, // Keep last 1000 snapshots
		NetworkUptime:      time.Now().Unix(),
	}
}

// UpdateBlockMetrics updates block-related metrics
func (m *MetricsCollector) UpdateBlockMetrics(blockCount uint64, lastBlockTime int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().Unix()

	if m.LastBlockTimestamp > 0 {
		timeDiff := float64(now - m.LastBlockTimestamp)
		if timeDiff > 0 {
			m.BlocksPerSecond = 1.0 / timeDiff
		}
	}

	m.TotalBlocks = blockCount
	m.LastBlockTimestamp = lastBlockTime

	// Update average block time
	if m.TotalBlocks > 1 {
		m.AverageBlockTime = time.Duration(float64(now-m.NetworkUptime) / float64(m.TotalBlocks-1) * float64(time.Second))
	}
}

// UpdateLayerMetrics updates layer-related metrics
func (m *MetricsCollector) UpdateLayerMetrics(currentLayer int64, lastLayerTime int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().Unix()

	if m.LastLayerTimestamp > 0 {
		timeDiff := float64(now - m.LastLayerTimestamp)
		if timeDiff > 0 {
			m.LayersPerSecond = 1.0 / timeDiff
		}
	}

	m.CurrentLayer = currentLayer
	m.LastLayerTimestamp = lastLayerTime
}

// UpdateValidatorMetrics updates validator-related metrics
func (m *MetricsCollector) UpdateValidatorMetrics(validatorCount int, totalStake uint64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.ActiveValidators = validatorCount
	m.TotalStake = totalStake
}

// UpdateMempoolMetrics updates mempool-related metrics
func (m *MetricsCollector) UpdateMempoolMetrics(size int) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.MempoolSize = size
	m.MempoolSizeHistory = append(m.MempoolSizeHistory, int64(size))

	// Keep only last 1000 entries
	if len(m.MempoolSizeHistory) > 1000 {
		m.MempoolSizeHistory = m.MempoolSizeHistory[1:]
	}
}

// UpdateNetworkMetrics updates network-related metrics
func (m *MetricsCollector) UpdateNetworkMetrics(peersConnected int) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.PeersConnected = peersConnected
}

// UpdateFinalityMetrics updates finality-related metrics
func (m *MetricsCollector) UpdateFinalityMetrics(hardFinality, softFinality bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.HardFinality = hardFinality
	m.SoftFinality = softFinality
}

// TakeSnapshot creates a snapshot of current metrics
func (m *MetricsCollector) TakeSnapshot() MetricSnapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return MetricSnapshot{
		Timestamp:       time.Now(),
		BlocksPerSecond: m.BlocksPerSecond,
		LayersPerSecond: m.LayersPerSecond,
		CurrentLayer:    m.CurrentLayer,
		MempoolSize:     m.MempoolSize,
		Validators:      m.ActiveValidators,
		TotalStake:      m.TotalStake,
		PeersConnected:  m.PeersConnected,
		HardFinality:    m.HardFinality,
		SoftFinality:    m.SoftFinality,
	}
}

// AddSnapshot adds a snapshot to history
func (m *MetricsCollector) AddSnapshot(snapshot MetricSnapshot) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.History = append(m.History, snapshot)

	// Keep only last MaxHistorySize entries
	if len(m.History) > m.MaxHistorySize {
		m.History = m.History[1:]
	}
}

// GetRecentHistory returns the last N snapshots
func (m *MetricsCollector) GetRecentHistory(count int) []MetricSnapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if count > len(m.History) {
		count = len(m.History)
	}

	if count == 0 {
		return []MetricSnapshot{}
	}

	return m.History[len(m.History)-count:]
}

// GetCurrentMetrics returns current metrics as a map
func (m *MetricsCollector) GetCurrentMetrics() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return map[string]interface{}{
		"blocks_per_second":  m.BlocksPerSecond,
		"layers_per_second":  m.LayersPerSecond,
		"total_blocks":       m.TotalBlocks,
		"current_layer":      m.CurrentLayer,
		"active_validators":  m.ActiveValidators,
		"total_stake":        m.TotalStake,
		"mempool_size":       m.MempoolSize,
		"peers_connected":    m.PeersConnected,
		"hard_finality":      m.HardFinality,
		"soft_finality":      m.SoftFinality,
		"average_block_time": m.AverageBlockTime.Seconds(),
		"peak_tps":           m.PeakTPS,
		"network_uptime":     time.Now().Unix() - m.NetworkUptime,
		"timestamp":          time.Now().Unix(),
	}
}

// CalculateTPS calculates transactions per second
func (m *MetricsCollector) CalculateTPS(txCount uint64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.TotalBlocks > 0 {
		tps := float64(txCount) / float64(m.TotalBlocks)
		if tps > m.PeakTPS {
			m.PeakTPS = tps
		}
	}
}
