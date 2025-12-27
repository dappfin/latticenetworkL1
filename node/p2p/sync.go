package p2p

import (
	"fmt"
	"log"
	"time"

	"latticenetworkL1/core/dag"
)

// SyncManager handles deterministic sync on startup
type SyncManager struct {
	p2pManager   *P2PManager
	dag          *dag.GhostDAG
	blockStore   BlockStore
	syncInterval time.Duration
}

// NewSyncManager creates a new sync manager
func NewSyncManager(p2pManager *P2PManager, dag *dag.GhostDAG, blockStore BlockStore) *SyncManager {
	return &SyncManager{
		p2pManager:   p2pManager,
		dag:          dag,
		blockStore:   blockStore,
		syncInterval: 30 * time.Second, // Check for sync every 30 seconds
	}
}

// StartSync starts the sync process
func (sm *SyncManager) StartSync() {
	log.Printf("Starting deterministic sync process")

	// Initial sync on startup
	if err := sm.performInitialSync(); err != nil {
		log.Printf("Initial sync failed: %v", err)
	}

	// Start periodic sync checks
	go sm.periodicSyncCheck()
}

// performInitialSync performs sync when node starts up
func (sm *SyncManager) performInitialSync() error {
	log.Printf("Performing initial sync from genesis")

	// Get our current finalized height
	ourHeight := sm.blockStore.GetFinalizedHeight()
	log.Printf("Our current finalized height: %d", ourHeight)

	// Get connected peers
	peers := sm.p2pManager.GetConnectedPeers()
	if len(peers) == 0 {
		log.Printf("No connected peers, skipping initial sync")
		return nil
	}

	log.Printf("Connected to %d peers, checking for sync", len(peers))

	// Find the peer with the highest height
	var bestPeer string
	var bestHeight int64

	for _, peerAddr := range peers {
		peerHeight, err := sm.p2pManager.GetPeerFinalizedHeight(peerAddr)
		if err != nil {
			log.Printf("Failed to get height from peer %s: %v", peerAddr, err)
			continue
		}

		log.Printf("Peer %s has finalized height: %d", peerAddr, peerHeight)

		if peerHeight > bestHeight {
			bestHeight = peerHeight
			bestPeer = peerAddr
		}
	}

	if bestPeer == "" {
		log.Printf("No suitable peers found for sync")
		return nil
	}

	if bestHeight <= ourHeight {
		log.Printf("We are up to date (our: %d, best peer: %d)", ourHeight, bestHeight)
		return nil
	}

	log.Printf("Syncing from peer %s (our height: %d, peer height: %d)", bestPeer, ourHeight, bestHeight)

	// Load existing blocks to verify our state
	existingBlocks, err := sm.blockStore.LoadBlocks()
	if err != nil {
		log.Printf("Failed to load existing blocks: %v", err)
	} else {
		log.Printf("Loaded %d existing blocks for verification", len(existingBlocks))
	}

	// Sync blocks from the best peer in batches
	currentHeight := ourHeight + 1
	for currentHeight <= bestHeight {
		batchSize := int64(100) // Process in batches of 100 blocks
		if currentHeight+batchSize > bestHeight {
			batchSize = bestHeight - currentHeight + 1
		}

		log.Printf("Requesting batch from height %d (size: %d)", currentHeight, batchSize)

		// Send sync request
		if err := sm.p2pManager.SyncFromPeer(bestPeer, currentHeight); err != nil {
			log.Printf("Failed to sync batch from peer %s: %v", bestPeer, err)
			// Try next best peer
			if err := sm.tryAlternativePeers(peers, bestPeer, currentHeight); err != nil {
				return fmt.Errorf("failed to sync from any peer: %v", err)
			}
		}

		// Wait for batch to be processed
		time.Sleep(2 * time.Second)

		// Verify progress
		newHeight := sm.blockStore.GetFinalizedHeight()
		if newHeight < currentHeight+batchSize {
			log.Printf("Sync progress slower than expected, got to height %d, expected %d", newHeight, currentHeight+batchSize)
			// Retry this batch
			continue
		}

		currentHeight = newHeight + 1
		log.Printf("Sync progress: height %d/%d (%.1f%%)", currentHeight-1, bestHeight, float64(currentHeight-1)/float64(bestHeight)*100)
	}

	log.Printf("Initial sync completed successfully")
	return nil
}

// tryAlternativePeers tries to sync from alternative peers
func (sm *SyncManager) tryAlternativePeers(peers []string, excludePeer string, fromHeight int64) error {
	for _, peerAddr := range peers {
		if peerAddr == excludePeer {
			continue
		}

		peerHeight, err := sm.p2pManager.GetPeerFinalizedHeight(peerAddr)
		if err != nil || peerHeight < fromHeight {
			continue
		}

		log.Printf("Trying alternative peer %s for sync from height %d", peerAddr, fromHeight)
		if err := sm.p2pManager.SyncFromPeer(peerAddr, fromHeight); err == nil {
			return nil
		}
	}

	return fmt.Errorf("no alternative peers available for sync")
}

// periodicSyncCheck periodically checks if we need to sync
func (sm *SyncManager) periodicSyncCheck() {
	ticker := time.NewTicker(sm.syncInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := sm.checkAndSync(); err != nil {
				log.Printf("Periodic sync check failed: %v", err)
			}
		}
	}
}

// checkAndSync checks if we need to sync and performs sync if needed
func (sm *SyncManager) checkAndSync() error {
	ourHeight := sm.blockStore.GetFinalizedHeight()
	peers := sm.p2pManager.GetConnectedPeers()

	if len(peers) == 0 {
		return nil
	}

	// Check if any peer is ahead of us
	for _, peerAddr := range peers {
		peerHeight, err := sm.p2pManager.GetPeerFinalizedHeight(peerAddr)
		if err != nil {
			continue
		}

		if peerHeight > ourHeight {
			log.Printf("Peer %s is ahead (our: %d, peer: %d), initiating sync", peerAddr, ourHeight, peerHeight)
			return sm.p2pManager.SyncFromPeer(peerAddr, ourHeight)
		}
	}

	return nil
}

// ForceSync forces a sync from all peers
func (sm *SyncManager) ForceSync() error {
	log.Printf("Forcing sync from all peers")
	return sm.performInitialSync()
}
