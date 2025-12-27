package main

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"latticenetworkL1/core/dag"
	"latticenetworkL1/core/pq"
)

func main() {
	if len(os.Args) != 3 {
		log.Fatalf("Usage: %s <payload-size> <validator>", os.Args[0])
	}

	payloadSize, err := strconv.Atoi(os.Args[1])
	if err != nil {
		log.Fatalf("Invalid payload size: %v", err)
	}
	validator := os.Args[2]

	// Create a dummy payload
	payload := make([]byte, payloadSize)
	for i := range payload {
		payload[i] = byte(i % 256)
	}

	// Initialize DAG & PQ
	g := dag.NewGhostDAG()
	pqValidator := pq.NewValidator()

	// Simulate block creation
	block := &dag.Block{
		Hash:      fmt.Sprintf("block_%x", payloadSize),
		Parents:   []string{"genesis"},
		Height:    1,
		BlueScore: 1,
		Timestamp: 1766360154,
	}

	sig, err := pqValidator.Sign(payload)
	if err != nil {
		log.Fatalf("PQ signing failed: %v", err)
	}

	// Add block to DAG
	if err := g.AddBlock(block); err != nil {
		log.Fatalf("Failed to add block: %v", err)
	}

	// Estimate gas (stubbed)
	gasUsed := len(payload) + len(sig) // simple approximation
	fmt.Printf("Payload size: %d bytes, PQ signature: %d bytes, Estimated gas: %d\n",
		len(payload), len(sig), gasUsed)
	fmt.Printf("Validator: %s, Total blocks in DAG: %d\n", validator, g.GetBlockCount())
}
