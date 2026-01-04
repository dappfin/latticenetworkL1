package p2p

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"latticenetworkL1/core/dag"
)

// sendMessage sends a message to a peer
func (pm *P2PManager) sendMessage(peerAddr string, msg *Message) error {
	pm.peerMutex.RLock()
	peer, exists := pm.peers[peerAddr]
	pm.peerMutex.RUnlock()

	if !exists || peer.Connection == nil {
		return fmt.Errorf("peer %s not connected", peerAddr)
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %v", err)
	}

	data = append(data, '\n')

	peer.Mutex.Lock()
	defer peer.Mutex.Unlock()

	peer.Connection.SetWriteDeadline(time.Now().Add(10 * time.Second))
	_, err = peer.Connection.Write(data)
	return err
}

// sendPeerInfo sends our peer information
func (pm *P2PManager) sendPeerInfo(peerAddr string) error {
	msg := &Message{
		Type:      MessagePeerInfo,
		Timestamp: time.Now().Unix(),
		Nonce:     fmt.Sprintf("%d", time.Now().UnixNano()),
		Data: PeerInfoData{
			FinalizedHeight: pm.blockStore.GetFinalizedHeight(),
			NodeID:          pm.nodeID,
			Version:         "1.0.0",
		},
	}

	return pm.sendMessage(peerAddr, msg)
}

// sendPing sends a ping message
func (pm *P2PManager) sendPing(peerAddr string) error {
	msg := &Message{
		Type:      MessagePing,
		Timestamp: time.Now().Unix(),
		Nonce:     fmt.Sprintf("%d", time.Now().UnixNano()),
		Data:      nil,
	}

	return pm.sendMessage(peerAddr, msg)
}

// processMessage processes an incoming message
func (pm *P2PManager) processMessage(peerAddr string, msg *Message) error {
	// Validate message before processing
	if err := pm.validator.ValidateMessage(peerAddr, msg.Type, msg.Data); err != nil {
		log.Printf("Message validation failed from peer %s: %v", peerAddr, err)
		return err
	}

	switch msg.Type {
	case MessageBlockAnnounce:
		return pm.handleBlockAnnounce(peerAddr, msg)
	case MessageBlockRequest:
		return pm.handleBlockRequest(peerAddr, msg)
	case MessageBlockResponse:
		return pm.handleBlockResponse(peerAddr, msg)
	case MessageGetBlocks:
		return pm.handleGetBlocks(peerAddr, msg)
	case MessagePeerInfo:
		return pm.handlePeerInfo(peerAddr, msg)
	case MessagePing:
		return pm.handlePing(peerAddr, msg)
	case MessagePong:
		return pm.handlePong(peerAddr, msg)
	default:
		return fmt.Errorf("unknown message type: %s", msg.Type)
	}
}

// handleBlockAnnounce handles block announcement messages
func (pm *P2PManager) handleBlockAnnounce(peerAddr string, msg *Message) error {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid block announce data")
	}

	announceData := BlockAnnounceData{
		Hash:       getString(data, "hash"),
		Height:     getInt64(data, "height"),
		Parents:    getStringSlice(data, "parents"),
		BlueScore:  getInt64(data, "blue_score"),
		Timestamp:  getInt64(data, "timestamp"),
		ProducerID: getString(data, "producer_id"),
	}

	log.Printf("Received block announcement from %s: %s (height %d)", peerAddr, announceData.Hash, announceData.Height)

	// Check if we already have this block
	if _, exists := pm.dag.GetBlock(announceData.Hash); exists {
		return nil // Already have it
	}

	// Request the full block
	requestMsg := &Message{
		Type:      MessageBlockRequest,
		Timestamp: time.Now().Unix(),
		Nonce:     fmt.Sprintf("%d", time.Now().UnixNano()),
		Data: BlockRequestData{
			Hash: announceData.Hash,
		},
	}

	return pm.sendMessage(peerAddr, requestMsg)
}

// handleBlockRequest handles block request messages
func (pm *P2PManager) handleBlockRequest(peerAddr string, msg *Message) error {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid block request data")
	}

	hash := getString(data, "hash")

	// Get block from storage
	block, err := pm.blockStore.GetBlock(hash)
	if err != nil {
		return fmt.Errorf("block %s not found: %v", hash, err)
	}

	// Send block response
	responseMsg := &Message{
		Type:      MessageBlockResponse,
		Timestamp: time.Now().Unix(),
		Nonce:     fmt.Sprintf("%d", time.Now().UnixNano()),
		Data: BlockResponseData{
			Block: block,
		},
	}

	return pm.sendMessage(peerAddr, responseMsg)
}

// handleBlockResponse handles block response messages
func (pm *P2PManager) handleBlockResponse(peerAddr string, msg *Message) error {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid block response data")
	}

	blockData := getMap(data, "block")
	if blockData == nil {
		return fmt.Errorf("block data missing")
	}

	// Reconstruct block
	block := &dag.Block{
		Hash:           getString(blockData, "hash"),
		Parents:        getStringSlice(blockData, "parents"),
		Height:         getInt64(blockData, "height"),
		BlueScore:      getInt64(blockData, "blue_score"),
		SelectedParent: getString(blockData, "selected_parent"),
		BlueWork:       getInt64(blockData, "blue_work"),
		Timestamp:      getInt64(blockData, "timestamp"),
		Signature:      getString(blockData, "signature"),
		ProducerID:     getString(blockData, "producer_id"),
	}

	log.Printf("Received block %s from peer %s", block.Hash, peerAddr)

	// Add block to DAG
	if err := pm.dag.AddBlock(block); err != nil {
		return fmt.Errorf("failed to add block to DAG: %v", err)
	}

	// Store block
	if err := pm.blockStore.StoreBlock(block); err != nil {
		log.Printf("Failed to store block %s: %v", block.Hash, err)
	}

	// Mark block as known
	pm.peerMutex.Lock()
	pm.knownBlocks[block.Hash] = true
	pm.peerMutex.Unlock()

	// Gossip to other peers
	pm.gossipToOtherPeers(peerAddr, msg)

	return nil
}

// handleGetBlocks handles get blocks messages
func (pm *P2PManager) handleGetBlocks(peerAddr string, msg *Message) error {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid get blocks data")
	}

	fromHeight := getInt64(data, "from_height")
	limit := getInt(data, "limit")

	// Get blocks from storage
	blocks, err := pm.blockStore.LoadBlocks()
	if err != nil {
		return fmt.Errorf("failed to load blocks: %v", err)
	}

	// Filter blocks from specified height
	filteredBlocks := make([]*dag.Block, 0)
	for _, block := range blocks {
		if block.Height >= fromHeight {
			filteredBlocks = append(filteredBlocks, block)
			if limit > 0 && len(filteredBlocks) >= limit {
				break
			}
		}
	}

	// Send blocks
	for _, block := range filteredBlocks {
		responseMsg := &Message{
			Type:      MessageBlockResponse,
			Timestamp: time.Now().Unix(),
			Nonce:     fmt.Sprintf("%d", time.Now().UnixNano()),
			Data: BlockResponseData{
				Block: block,
			},
		}

		if err := pm.sendMessage(peerAddr, responseMsg); err != nil {
			return fmt.Errorf("failed to send block: %v", err)
		}
	}

	return nil
}

// handlePeerInfo handles peer info messages
func (pm *P2PManager) handlePeerInfo(peerAddr string, msg *Message) error {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid peer info data")
	}

	finalizedHeight := getInt64(data, "finalized_height")
	nodeID := getString(data, "node_id")
	version := getString(data, "version")

	// Validate peer info handshake
	if err := pm.validator.ValidatePeerHandshake(peerAddr, nodeID, version); err != nil {
		pm.validator.RecordPeerMisbehavior(peerAddr, fmt.Sprintf("handshake validation failed: %v", err))
		return err
	}

	// Update peer info
	pm.peerMutex.RLock()
	peer, exists := pm.peers[peerAddr]
	pm.peerMutex.RUnlock()

	if exists {
		peer.Mutex.Lock()
		peer.FinalizedHeight = finalizedHeight
		peer.NodeID = nodeID
		peer.Version = version
		peer.Mutex.Unlock()

		log.Printf("Updated peer %s info: height=%d, nodeID=%s, version=%s", peerAddr, finalizedHeight, nodeID, version)
	}

	return nil
}

// handlePing handles ping messages
func (pm *P2PManager) handlePing(peerAddr string, msg *Message) error {
	// Send pong response
	responseMsg := &Message{
		Type:      MessagePong,
		Timestamp: time.Now().Unix(),
		Nonce:     msg.Nonce,
		Data:      nil,
	}

	return pm.sendMessage(peerAddr, responseMsg)
}

// handlePong handles pong messages
func (pm *P2PManager) handlePong(peerAddr string, msg *Message) error {
	// Update peer last seen
	pm.peerMutex.RLock()
	peer, exists := pm.peers[peerAddr]
	pm.peerMutex.RUnlock()

	if exists {
		peer.Mutex.Lock()
		peer.LastSeen = time.Now()
		peer.Mutex.Unlock()
	}

	return nil
}

// gossipToOtherPeers sends a message to all peers except the specified one
func (pm *P2PManager) gossipToOtherPeers(excludePeer string, msg *Message) {
	pm.peerMutex.RLock()
	peers := make([]string, 0, len(pm.peers))
	for addr := range pm.peers {
		if addr != excludePeer {
			peers = append(peers, addr)
		}
	}
	pm.peerMutex.RUnlock()

	for _, peerAddr := range peers {
		if err := pm.sendMessage(peerAddr, msg); err != nil {
			log.Printf("Failed to gossip to peer %s: %v", peerAddr, err)
		}
	}
}

// Helper functions for JSON parsing
func getString(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func getStringSlice(m map[string]interface{}, key string) []string {
	if val, ok := m[key].([]interface{}); ok {
		result := make([]string, len(val))
		for i, v := range val {
			if s, ok := v.(string); ok {
				result[i] = s
			}
		}
		return result
	}
	return []string{}
}

func getInt64(m map[string]interface{}, key string) int64 {
	if val, ok := m[key].(float64); ok {
		return int64(val)
	}
	return 0
}

func getInt(m map[string]interface{}, key string) int {
	if val, ok := m[key].(float64); ok {
		return int(val)
	}
	return 0
}

func getMap(m map[string]interface{}, key string) map[string]interface{} {
	if val, ok := m[key].(map[string]interface{}); ok {
		return val
	}
	return nil
}
