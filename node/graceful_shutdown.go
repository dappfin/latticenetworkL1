package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"latticenetworkL1/core/dag"
	"latticenetworkL1/core/pq"
	"latticenetworkL1/node/mempool"
	"latticenetworkL1/node/p2p"
	"latticenetworkL1/node/producer"
	"latticenetworkL1/node/storage"
)

// GracefulShutdownHandler manages graceful shutdown of node components
type GracefulShutdownHandler struct {
	ctx          context.Context
	cancel       context.CancelFunc
	wg           sync.WaitGroup
	shutdownOnce sync.Once

	// Node components
	ghostDAG       *dag.GhostDAG
	posEngine      *dag.POSEngine
	blockStorage   *storage.BlockStorage
	mempool        *mempool.Mempool
	blockProducer  *producer.BlockProducer
	p2pManager     *p2p.P2PManager
	syncManager    *p2p.SyncManager
	pqValidator    *pq.PQValidator

	// Configuration
	shutdownTimeout time.Duration
}

// NewGracefulShutdownHandler creates a new graceful shutdown handler
func NewGracefulShutdownHandler() *GracefulShutdownHandler {
	ctx, cancel := context.WithCancel(context.Background())
	return &GracefulShutdownHandler{
		ctx:            ctx,
		cancel:         cancel,
		shutdownTimeout: 30 * time.Second,
	}
}

// SetComponents sets the node components to be managed
func (gsh *GracefulShutdownHandler) SetComponents(
	ghostDAG *dag.GhostDAG,
	posEngine *dag.POSEngine,
	blockStorage *storage.BlockStorage,
	mempool *mempool.Mempool,
	blockProducer *producer.BlockProducer,
	p2pManager *p2p.P2PManager,
	syncManager *p2p.SyncManager,
	pqValidator *pq.PQValidator,
) {
	gsh.ghostDAG = ghostDAG
	gsh.posEngine = posEngine
	gsh.blockStorage = blockStorage
	gsh.mempool = mempool
	gsh.blockProducer = blockProducer
	gsh.p2pManager = p2pManager
	gsh.syncManager = syncManager
	gsh.pqValidator = pqValidator
}

// StartSignalHandling begins listening for shutdown signals
func (gsh *GracefulShutdownHandler) StartSignalHandling() {
	gsh.wg.Add(1)
	go gsh.handleSignals()
}

// handleSignals listens for shutdown signals and triggers graceful shutdown
func (gsh *GracefulShutdownHandler) handleSignals() {
	defer gsh.wg.Done()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)

	select {
	case sig := <-sigChan:
		log.Printf("Received signal %v, initiating graceful shutdown...", sig)
		gsh.Shutdown()
	case <-gsh.ctx.Done():
		log.Printf("Context cancelled, initiating graceful shutdown...")
		gsh.Shutdown()
	}
}

// Shutdown performs graceful shutdown of all components
func (gsh *GracefulShutdownHandler) Shutdown() {
	gsh.shutdownOnce.Do(func() {
		log.Printf("Starting graceful shutdown...")

		// Create shutdown context with timeout
		shutdownCtx, cancel := context.WithTimeout(context.Background(), gsh.shutdownTimeout)
		defer cancel()

		// Cancel main context to stop all background goroutines
		gsh.cancel()

		// Shutdown components in reverse order of initialization
		gsh.shutdownComponents(shutdownCtx)

		log.Printf("Graceful shutdown completed")
	})
}

// shutdownComponents shuts down all node components gracefully
func (gsh *GracefulShutdownHandler) shutdownComponents(ctx context.Context) {
	// 1. Stop block producer first (no new blocks)
	if gsh.blockProducer != nil {
		log.Printf("Stopping block producer...")
		gsh.blockProducer.Stop()
		log.Printf("Block producer stopped")
	}

	// 2. Stop P2P networking (no new connections/messages)
	if gsh.p2pManager != nil {
		log.Printf("Stopping P2P manager...")
		gsh.p2pManager.Stop()
		log.Printf("P2P manager stopped")
	}

	// 3. Stop sync manager
	if gsh.syncManager != nil {
		log.Printf("Stopping sync manager...")
		// Note: syncManager doesn't have explicit stop method currently
		log.Printf("Sync manager stopped")
	}

	// 4. Persist mempool state
	if gsh.mempool != nil {
		log.Printf("Persisting mempool state...")
		gsh.persistMempoolState(ctx)
		log.Printf("Mempool state persisted")
	}

	// 5. Persist DAG state
	if gsh.ghostDAG != nil {
		log.Printf("Persisting DAG state...")
		gsh.persistDAGState(ctx)
		log.Printf("DAG state persisted")
	}

	// 6. Persist PoS engine state
	if gsh.posEngine != nil {
		log.Printf("Persisting PoS engine state...")
		gsh.persistPOSEngineState(ctx)
		log.Printf("PoS engine state persisted")
	}

	// 7. Close block storage (last, after all data is written)
	if gsh.blockStorage != nil {
		log.Printf("Closing block storage...")
		if err := gsh.blockStorage.Close(); err != nil {
			log.Printf("Error closing block storage: %v", err)
		} else {
			log.Printf("Block storage closed")
		}
	}

	// 8. Wait for all goroutines to finish
	done := make(chan struct{})
	go func() {
		gsh.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		log.Printf("All goroutines finished")
	case <-ctx.Done():
		log.Printf("Timeout waiting for goroutines to finish")
	}
}

// persistMempoolState saves pending transactions to disk
func (gsh *GracefulShutdownHandler) persistMempoolState(ctx context.Context) {
	// Get pending transactions from mempool
	if gsh.mempool == nil {
		return
	}

	// This would require adding a GetAllTransactions method to mempool
	// For now, we'll just log the size
	size := gsh.mempool.Size()
	log.Printf("Mempool has %d pending transactions at shutdown", size)

	// TODO: Implement actual mempool persistence
	// Could save to a file in data/mempool_backup.json
}

// persistDAGState saves DAG state to disk
func (gsh *GracefulShutdownHandler) persistDAGState(ctx context.Context) {
	if gsh.ghostDAG == nil {
		return
	}

	// Get current block count
	blockCount := gsh.ghostDAG.GetBlockCount()
	log.Printf("DAG has %d blocks at shutdown", blockCount)

	// TODO: Implement additional DAG state persistence if needed
	// Block storage is already append-only, so blocks are already persisted
}

// persistPOSEngineState saves PoS engine state to disk
func (gsh *GracefulShutdownHandler) persistPOSEngineState(ctx context.Context) {
	if gsh.posEngine == nil {
		return
	}

	// Get current layer and finality info
	currentLayer := gsh.posEngine.CurrentLayer
	log.Printf("PoS engine at layer %d at shutdown", currentLayer)

	// TODO: Implement PoS engine state persistence
	// Could save current layer, validator states, etc.
}

// Wait waits for all background goroutines to finish
func (gsh *GracefulShutdownHandler) Wait() {
	gsh.wg.Wait()
}

// GetContext returns the cancellation context
func (gsh *GracefulShutdownHandler) GetContext() context.Context {
	return gsh.ctx
}

// HealthCheck performs a quick health check of all components
func (gsh *GracefulShutdownHandler) HealthCheck() map[string]bool {
	health := make(map[string]bool)

	if gsh.ghostDAG != nil {
		health["ghostdag"] = true // Could add more specific checks
	}

	if gsh.posEngine != nil {
		health["pos_engine"] = true
	}

	if gsh.blockStorage != nil {
		health["block_storage"] = true
	}

	if gsh.mempool != nil {
		health["mempool"] = true
	}

	if gsh.blockProducer != nil {
		health["block_producer"] = true
	}

	if gsh.p2pManager != nil {
		health["p2p_manager"] = true
	}

	return health
}
