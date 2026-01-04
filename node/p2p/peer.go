package p2p

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"sync"
	"time"

	"latticenetworkL1/core/dag"
)

// Peer represents a remote node in the network
type Peer struct {
	ID      string
	Address string
}

// PeerInfo tracks information about connected peers
type PeerInfo struct {
	Address         string
	LastSeen        time.Time
	FinalizedHeight int64
	Connection      net.Conn
	NodeID          string
	Version         string
	BadPeerScore    int
	Mutex           sync.RWMutex
}

// BlockStore interface for retrieving/storing blocks
type BlockStore interface {
	GetBlock(hash string) (*dag.Block, error)
	StoreBlock(block *dag.Block) error
	GetFinalizedHeight() int64
	LoadBlocks() ([]*dag.Block, error)
}

// P2PManager manages peer connections and block gossip
type P2PManager struct {
	peers       map[string]*PeerInfo
	peerMutex   sync.RWMutex
	dag         *dag.GhostDAG
	blockStore  BlockStore
	listener    net.Listener
	ctx         context.Context
	cancel      context.CancelFunc
	wg          sync.WaitGroup
	ourAddress  string
	nodeID      string
	messageCh   chan *Message
	knownBlocks map[string]bool // Block cache to prevent duplicates
	validator   *PeerValidator  // Peer validation system
}

// NewP2PManager creates a new P2P manager
func NewP2PManager(dag *dag.GhostDAG, blockStore BlockStore, bindAddress string) (*P2PManager, error) {
	listener, err := net.Listen("tcp", bindAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to listen on %s: %v", bindAddress, err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Generate node ID from address
	nodeID := fmt.Sprintf("node_%x", len(bindAddress)*1000)

	return &P2PManager{
		peers:       make(map[string]*PeerInfo),
		dag:         dag,
		blockStore:  blockStore,
		listener:    listener,
		ctx:         ctx,
		cancel:      cancel,
		ourAddress:  bindAddress,
		nodeID:      nodeID,
		messageCh:   make(chan *Message, 1000),
		knownBlocks: make(map[string]bool),
		validator:   NewPeerValidator(),
	}, nil
}

// Start starts the P2P manager
func (pm *P2PManager) Start() {
	log.Printf("Starting P2P manager on %s (node ID: %s)", pm.ourAddress, pm.nodeID)
	pm.wg.Add(2)
	go pm.acceptConnections()
	go pm.messageProcessor()
}

// Stop stops the P2P manager
func (pm *P2PManager) Stop() {
	log.Printf("Stopping P2P manager")
	pm.cancel()
	if pm.listener != nil {
		pm.listener.Close()
	}
	pm.peerMutex.Lock()
	for _, peer := range pm.peers {
		if peer.Connection != nil {
			peer.Connection.Close()
		}
	}
	pm.peerMutex.Unlock()
	pm.wg.Wait()
}

// ConnectToPeer connects to a remote peer
func (pm *P2PManager) ConnectToPeer(address string) error {
	conn, err := net.Dial("tcp", address)
	if err != nil {
		return fmt.Errorf("failed to connect to peer %s: %v", address, err)
	}

	peerInfo := &PeerInfo{
		Address:      address,
		LastSeen:     time.Now(),
		Connection:   conn,
		BadPeerScore: 0,
	}

	pm.peerMutex.Lock()
	pm.peers[address] = peerInfo
	pm.peerMutex.Unlock()

	pm.wg.Add(1)
	go pm.handlePeer(peerInfo)

	log.Printf("Connected to peer %s", address)
	return nil
}

// GetConnectedPeers returns a list of connected peer addresses
func (pm *P2PManager) GetConnectedPeers() []string {
	pm.peerMutex.RLock()
	defer pm.peerMutex.RUnlock()

	peers := make([]string, 0, len(pm.peers))
	for addr := range pm.peers {
		peers = append(peers, addr)
	}
	return peers
}

// GetPeerFinalizedHeight returns the finalized height of a peer
func (pm *P2PManager) GetPeerFinalizedHeight(peerAddress string) (int64, error) {
	pm.peerMutex.RLock()
	peer, exists := pm.peers[peerAddress]
	pm.peerMutex.RUnlock()

	if !exists {
		return 0, fmt.Errorf("peer %s not connected", peerAddress)
	}

	return peer.FinalizedHeight, nil
}

// SyncFromPeer syncs blocks from a peer starting from a given height
func (pm *P2PManager) SyncFromPeer(peerAddress string, fromHeight int64) error {
	log.Printf("Syncing from peer %s from height %d", peerAddress, fromHeight)

	// Send get blocks message
	msg := &Message{
		Type:      MessageGetBlocks,
		Timestamp: time.Now().Unix(),
		Nonce:     fmt.Sprintf("%d", time.Now().UnixNano()),
		Data: GetBlocksData{
			FromHeight: fromHeight,
			Limit:      100, // Limit batch size
		},
	}

	return pm.sendMessage(peerAddress, msg)
}

// GossipBlock broadcasts a finalized block to all connected peers
func (pm *P2PManager) GossipBlock(block *dag.Block) {
	// Check if we already announced this block
	pm.peerMutex.RLock()
	if pm.knownBlocks[block.Hash] {
		pm.peerMutex.RUnlock()
		return
	}
	pm.knownBlocks[block.Hash] = true

	peers := make([]string, 0, len(pm.peers))
	for addr := range pm.peers {
		peers = append(peers, addr)
	}
	pm.peerMutex.RUnlock()

	log.Printf("Gossiping block %s (height %d) to %d peers", block.Hash, block.Height, len(peers))

	// Create block announcement message
	msg := &Message{
		Type:      MessageBlockAnnounce,
		Timestamp: time.Now().Unix(),
		Nonce:     fmt.Sprintf("%d", time.Now().UnixNano()),
		Data: BlockAnnounceData{
			Hash:       block.Hash,
			Height:     block.Height,
			Parents:    block.Parents,
			BlueScore:  block.BlueScore,
			Timestamp:  block.Timestamp,
			ProducerID: block.ProducerID,
		},
	}

	// Send to all connected peers
	for _, peerAddr := range peers {
		if err := pm.sendMessage(peerAddr, msg); err != nil {
			log.Printf("Failed to send block announcement to peer %s: %v", peerAddr, err)
			pm.handlePeerMisbehavior(peerAddr, "failed to send block announcement")
		}
	}
}

// acceptConnections accepts incoming peer connections
func (pm *P2PManager) acceptConnections() {
	defer pm.wg.Done()

	for {
		select {
		case <-pm.ctx.Done():
			return
		default:
			// Set connection timeout
			if pm.listener != nil {
				// pm.listener.SetDeadline(time.Now().Add(12 * time.Second)) // Not available on net.Listener
			}

			conn, err := pm.listener.Accept()
			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					continue // Timeout is normal, try again
				}
				if pm.ctx.Err() != nil {
					return // Context cancelled
				}
				log.Printf("Error accepting connection: %v", err)
				continue
			}

			// Handle new connection
			peerAddr := conn.RemoteAddr().String()
			log.Printf("Accepted connection from %s", peerAddr)

			peerInfo := &PeerInfo{
				Address:      peerAddr,
				LastSeen:     time.Now(),
				Connection:   conn,
				BadPeerScore: 0,
			}

			pm.peerMutex.Lock()
			pm.peers[peerAddr] = peerInfo
			pm.peerMutex.Unlock()

			pm.wg.Add(1)
			go pm.handlePeer(peerInfo)
		}
	}
}

// handlePeer handles communication with a peer
func (pm *P2PManager) handlePeer(peer *PeerInfo) {
	defer pm.wg.Done()
	defer func() {
		pm.removePeer(peer.Address)
	}()

	// Send peer info handshake
	if err := pm.sendPeerInfo(peer.Address); err != nil {
		log.Printf("Failed to send peer info to %s: %v", peer.Address, err)
		return
	}

	reader := bufio.NewReader(peer.Connection)

	for {
		select {
		case <-pm.ctx.Done():
			return
		default:
			// Set read timeout
			peer.Connection.SetReadDeadline(time.Now().Add(30 * time.Second))

			// Read message
			line, err := reader.ReadString('\n')
			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					// Send ping to check connection
					if err := pm.sendPing(peer.Address); err != nil {
						log.Printf("Ping failed to peer %s: %v", peer.Address, err)
						return
					}
					continue
				}
				log.Printf("Connection closed with peer %s: %v", peer.Address, err)
				return
			}

			// Parse message
			var msg Message
			if err := json.Unmarshal([]byte(line), &msg); err != nil {
				log.Printf("Invalid message from peer %s: %v", peer.Address, err)
				pm.handlePeerMisbehavior(peer.Address, "invalid message format")
				continue
			}

			// Process message
			if err := pm.processMessage(peer.Address, &msg); err != nil {
				log.Printf("Error processing message from peer %s: %v", peer.Address, err)
				pm.handlePeerMisbehavior(peer.Address, "message processing error")
				continue
			}

			// Update last seen
			peer.Mutex.Lock()
			peer.LastSeen = time.Now()
			peer.Mutex.Unlock()
		}
	}
}

// removePeer removes a peer from the peer list
func (pm *P2PManager) removePeer(address string) {
	pm.peerMutex.Lock()
	defer pm.peerMutex.Unlock()

	if peer, exists := pm.peers[address]; exists {
		if peer.Connection != nil {
			peer.Connection.Close()
		}
		delete(pm.peers, address)
		log.Printf("Removed peer %s", address)
	}
}

// messageProcessor processes messages from the message channel
func (pm *P2PManager) messageProcessor() {
	defer pm.wg.Done()

	for {
		select {
		case <-pm.ctx.Done():
			return
		case msg := <-pm.messageCh:
			// Process message asynchronously
			go func(m *Message) {
				// Handle message based on type
				log.Printf("Processing message type: %s", m.Type)
			}(msg)
		}
	}
}

// handlePeerMisbehavior handles peer misbehavior
func (pm *P2PManager) handlePeerMisbehavior(peerAddr string, reason string) {
	// Use the validator to record misbehavior
	pm.validator.RecordPeerMisbehavior(peerAddr, reason)

	// Check if peer should be removed
	if pm.validator.IsPeerBanned(peerAddr) {
		log.Printf("Removing banned peer %s", peerAddr)
		pm.removePeer(peerAddr)
	}
}
