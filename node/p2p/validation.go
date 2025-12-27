package p2p

import (
	"fmt"
	"log"
	"strings"
	"sync"
	"time"
)

// PeerValidator handles peer validation and bad peer management
type PeerValidator struct {
	badPeers     map[string]*BadPeerInfo
	badPeerMutex sync.RWMutex
	maxBadScore  int
	banDuration  time.Duration
}

// BadPeerInfo contains information about a bad peer
type BadPeerInfo struct {
	Address      string
	Reason       string
	Score        int
	FirstOffense time.Time
	LastOffense  time.Time
	IsBanned     bool
	BanUntil     time.Time
	OffenseCount int
}

// NewPeerValidator creates a new peer validator
func NewPeerValidator() *PeerValidator {
	return &PeerValidator{
		badPeers:    make(map[string]*BadPeerInfo),
		maxBadScore: 5,
		banDuration: 24 * time.Hour, // 24 hour ban
	}
}

// ValidatePeerHandshake validates peer during handshake
func (pv *PeerValidator) ValidatePeerHandshake(peerAddr string, nodeID string, version string) error {
	// Check if peer is banned
	pv.badPeerMutex.RLock()
	if badPeer, exists := pv.badPeers[peerAddr]; exists && badPeer.IsBanned {
		if time.Now().Before(badPeer.BanUntil) {
			pv.badPeerMutex.RUnlock()
			return fmt.Errorf("peer %s is banned until %s", peerAddr, badPeer.BanUntil.Format(time.RFC3339))
		}
		// Ban expired, unban the peer
		badPeer.IsBanned = false
		badPeer.Score = 0
		log.Printf("Ban expired for peer %s, unbanning", peerAddr)
	}
	pv.badPeerMutex.RUnlock()

	// Validate node ID format
	if !strings.HasPrefix(nodeID, "node_") {
		pv.RecordPeerMisbehavior(peerAddr, "invalid node ID format")
		return fmt.Errorf("invalid node ID format: %s", nodeID)
	}

	// Validate version format
	if version == "" {
		pv.RecordPeerMisbehavior(peerAddr, "missing version")
		return fmt.Errorf("missing version information")
	}

	// Check for suspicious patterns
	if pv.containsSuspiciousPatterns(nodeID) {
		pv.RecordPeerMisbehavior(peerAddr, "suspicious node ID pattern")
		return fmt.Errorf("suspicious node ID pattern detected")
	}

	return nil
}

// ValidateMessage validates incoming messages from peers
func (pv *PeerValidator) ValidateMessage(peerAddr string, msgType MessageType, msgData interface{}) error {
	// Check message rate limits
	if pv.isRateLimited(peerAddr) {
		pv.RecordPeerMisbehavior(peerAddr, "message rate limit exceeded")
		return fmt.Errorf("peer %s exceeded message rate limit", peerAddr)
	}

	// Validate message data based on type
	switch msgType {
	case MessageBlockAnnounce:
		return pv.validateBlockAnnounce(peerAddr, msgData)
	case MessageBlockRequest:
		return pv.validateBlockRequest(peerAddr, msgData)
	case MessageBlockResponse:
		return pv.validateBlockResponse(peerAddr, msgData)
	case MessagePeerInfo:
		return pv.validatePeerInfo(peerAddr, msgData)
	case MessagePing, MessagePong:
		return pv.validatePingPong(peerAddr, msgData)
	default:
		pv.RecordPeerMisbehavior(peerAddr, fmt.Sprintf("unknown message type: %s", msgType))
		return fmt.Errorf("unknown message type: %s", msgType)
	}
}

// validateBlockAnnounce validates block announcement messages
func (pv *PeerValidator) validateBlockAnnounce(peerAddr string, msgData interface{}) error {
	data, ok := msgData.(map[string]interface{})
	if !ok {
		pv.RecordPeerMisbehavior(peerAddr, "invalid block announce data format")
		return fmt.Errorf("invalid block announce data format")
	}

	// Check required fields
	requiredFields := []string{"hash", "height", "parents", "blue_score", "timestamp"}
	for _, field := range requiredFields {
		if _, exists := data[field]; !exists {
			pv.RecordPeerMisbehavior(peerAddr, fmt.Sprintf("missing required field: %s", field))
			return fmt.Errorf("missing required field: %s", field)
		}
	}

	// Validate hash format
	hash := getString(data, "hash")
	if len(hash) < 8 || !strings.HasPrefix(hash, "block_") {
		pv.RecordPeerMisbehavior(peerAddr, "invalid block hash format")
		return fmt.Errorf("invalid block hash format: %s", hash)
	}

	// Validate height
	height := getInt64(data, "height")
	if height < 0 {
		pv.RecordPeerMisbehavior(peerAddr, "invalid block height")
		return fmt.Errorf("invalid block height: %d", height)
	}

	// Validate timestamp
	timestamp := getInt64(data, "timestamp")
	if timestamp <= 0 || timestamp > time.Now().Unix()+300 { // Allow 5 minutes future
		pv.RecordPeerMisbehavior(peerAddr, "invalid block timestamp")
		return fmt.Errorf("invalid block timestamp: %d", timestamp)
	}

	return nil
}

// validateBlockRequest validates block request messages
func (pv *PeerValidator) validateBlockRequest(peerAddr string, msgData interface{}) error {
	data, ok := msgData.(map[string]interface{})
	if !ok {
		pv.RecordPeerMisbehavior(peerAddr, "invalid block request data format")
		return fmt.Errorf("invalid block request data format")
	}

	hash := getString(data, "hash")
	if len(hash) < 8 {
		pv.RecordPeerMisbehavior(peerAddr, "invalid block hash in request")
		return fmt.Errorf("invalid block hash in request: %s", hash)
	}

	return nil
}

// validateBlockResponse validates block response messages
func (pv *PeerValidator) validateBlockResponse(peerAddr string, msgData interface{}) error {
	data, ok := msgData.(map[string]interface{})
	if !ok {
		pv.RecordPeerMisbehavior(peerAddr, "invalid block response data format")
		return fmt.Errorf("invalid block response data format")
	}

	blockData := getMap(data, "block")
	if blockData == nil {
		pv.RecordPeerMisbehavior(peerAddr, "missing block data in response")
		return fmt.Errorf("missing block data in response")
	}

	// Validate block structure
	requiredFields := []string{"hash", "height", "parents", "blue_score", "timestamp"}
	for _, field := range requiredFields {
		if _, exists := blockData[field]; !exists {
			pv.RecordPeerMisbehavior(peerAddr, fmt.Sprintf("missing required block field: %s", field))
			return fmt.Errorf("missing required block field: %s", field)
		}
	}

	return nil
}

// validatePeerInfo validates peer info messages
func (pv *PeerValidator) validatePeerInfo(peerAddr string, msgData interface{}) error {
	data, ok := msgData.(map[string]interface{})
	if !ok {
		pv.RecordPeerMisbehavior(peerAddr, "invalid peer info data format")
		return fmt.Errorf("invalid peer info data format")
	}

	nodeID := getString(data, "node_id")
	if !strings.HasPrefix(nodeID, "node_") {
		pv.RecordPeerMisbehavior(peerAddr, "invalid node ID in peer info")
		return fmt.Errorf("invalid node ID in peer info: %s", nodeID)
	}

	height := getInt64(data, "finalized_height")
	if height < 0 {
		pv.RecordPeerMisbehavior(peerAddr, "invalid finalized height in peer info")
		return fmt.Errorf("invalid finalized height in peer info: %d", height)
	}

	return nil
}

// validatePingPong validates ping/pong messages
func (pv *PeerValidator) validatePingPong(peerAddr string, msgData interface{}) error {
	// Ping/pong messages should have minimal data or nil
	if msgData != nil {
		pv.RecordPeerMisbehavior(peerAddr, "unexpected data in ping/pong message")
		return fmt.Errorf("unexpected data in ping/pong message")
	}
	return nil
}

// RecordPeerMisbehavior records peer misbehavior and updates score
func (pv *PeerValidator) RecordPeerMisbehavior(peerAddr string, reason string) {
	pv.badPeerMutex.Lock()
	defer pv.badPeerMutex.Unlock()

	badPeer, exists := pv.badPeers[peerAddr]
	if !exists {
		badPeer = &BadPeerInfo{
			Address:      peerAddr,
			Score:        0,
			FirstOffense: time.Now(),
		}
		pv.badPeers[peerAddr] = badPeer
	}

	badPeer.Score++
	badPeer.LastOffense = time.Now()
	badPeer.OffenseCount++
	badPeer.Reason = reason

	log.Printf("Peer misbehavior recorded: %s - %s (score: %d, offenses: %d)",
		peerAddr, reason, badPeer.Score, badPeer.OffenseCount)

	// Check if peer should be banned
	if badPeer.Score >= pv.maxBadScore {
		badPeer.IsBanned = true
		badPeer.BanUntil = time.Now().Add(pv.banDuration)
		log.Printf("Peer %s banned until %s (score: %d)",
			peerAddr, badPeer.BanUntil.Format(time.RFC3339), badPeer.Score)
	}
}

// IsPeerBanned checks if a peer is currently banned
func (pv *PeerValidator) IsPeerBanned(peerAddr string) bool {
	pv.badPeerMutex.RLock()
	defer pv.badPeerMutex.RUnlock()

	badPeer, exists := pv.badPeers[peerAddr]
	if !exists {
		return false
	}

	if badPeer.IsBanned && time.Now().Before(badPeer.BanUntil) {
		return true
	}

	// Check if ban has expired
	if badPeer.IsBanned && time.Now().After(badPeer.BanUntil) {
		badPeer.IsBanned = false
		badPeer.Score = 0
		log.Printf("Ban expired for peer %s, unbanning", peerAddr)
		return false
	}

	return false
}

// GetPeerScore returns the current bad peer score
func (pv *PeerValidator) GetPeerScore(peerAddr string) int {
	pv.badPeerMutex.RLock()
	defer pv.badPeerMutex.RUnlock()

	if badPeer, exists := pv.badPeers[peerAddr]; exists {
		return badPeer.Score
	}
	return 0
}

// containsSuspiciousPatterns checks for suspicious patterns in node ID
func (pv *PeerValidator) containsSuspiciousPatterns(nodeID string) bool {
	suspiciousPatterns := []string{
		"admin", "root", "test", "debug", "malicious",
		"attack", "exploit", "hack", "bot", "automated",
	}

	nodeIDLower := strings.ToLower(nodeID)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(nodeIDLower, pattern) {
			return true
		}
	}

	return false
}

// isRateLimited checks if peer is rate limited
func (pv *PeerValidator) isRateLimited(peerAddr string) bool {
	pv.badPeerMutex.RLock()
	defer pv.badPeerMutex.RUnlock()

	badPeer, exists := pv.badPeers[peerAddr]
	if !exists {
		return false
	}

	// If peer has high score, apply rate limiting
	if badPeer.Score >= 3 {
		// Allow only 1 message per 10 seconds for high-score peers
		return time.Since(badPeer.LastOffense) < 10*time.Second
	}

	return false
}

// CleanupExpiredBans removes expired bans
func (pv *PeerValidator) CleanupExpiredBans() {
	pv.badPeerMutex.Lock()
	defer pv.badPeerMutex.Unlock()

	now := time.Now()
	for addr, badPeer := range pv.badPeers {
		if badPeer.IsBanned && now.After(badPeer.BanUntil) {
			badPeer.IsBanned = false
			badPeer.Score = 0
			log.Printf("Ban expired for peer %s, unbanning", addr)
		}
	}
}

// GetBadPeersInfo returns information about bad peers
func (pv *PeerValidator) GetBadPeersInfo() map[string]*BadPeerInfo {
	pv.badPeerMutex.RLock()
	defer pv.badPeerMutex.RUnlock()

	info := make(map[string]*BadPeerInfo)
	for addr, badPeer := range pv.badPeers {
		// Create a copy
		peerInfo := *badPeer
		info[addr] = &peerInfo
	}
	return info
}

// ResetPeerScore resets a peer's bad score (for admin use)
func (pv *PeerValidator) ResetPeerScore(peerAddr string) {
	pv.badPeerMutex.Lock()
	defer pv.badPeerMutex.Unlock()

	if badPeer, exists := pv.badPeers[peerAddr]; exists {
		badPeer.Score = 0
		badPeer.IsBanned = false
		badPeer.BanUntil = time.Time{}
		log.Printf("Reset score for peer %s", peerAddr)
	}
}
