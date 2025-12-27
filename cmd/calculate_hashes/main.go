package main

import (
	"fmt"
	"latticenetworkL1/core/pq"
	"log"
)

func main() {
	fmt.Println("=== Calculating Validator Key Hashes ===")

	// Print all validator key hashes
	err := pq.PrintValidatorKeyHashes("genesis/keys")
	if err != nil {
		log.Fatalf("Failed to print validator key hashes: %v", err)
	}

	fmt.Println("=== Hash Calculation Complete ===")
}
