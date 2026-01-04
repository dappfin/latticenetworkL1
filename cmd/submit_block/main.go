package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// BlockSubmission represents a block submission request
type BlockSubmission struct {
	Payload   string `json:"payload"`
	Validator string `json:"validator"`
}

// BlockResponse represents the response from the node
type BlockResponse struct {
	Success    bool   `json:"success"`
	Message    string `json:"message"`
	BlockHash  string `json:"block_hash"`
	BlockCount int    `json:"block_count"`
	Timestamp  int64  `json:"timestamp"`
}

func main() {
	// Parse command line flags
	nodeURL := flag.String("url", "http://localhost:8080", "Node RPC URL")
	payload := flag.String("payload", "test block", "Block payload")
	validator := flag.String("validator", "validator_1", "Validator ID")
	flag.Parse()

	// Append nanosecond timestamp to ensure unique payload
	uniquePayload := fmt.Sprintf("%s %d", *payload, time.Now().UnixNano())

	// Create block submission
	submission := BlockSubmission{
		Payload:   uniquePayload,
		Validator: *validator,
	}

	// Convert to JSON
	jsonData, err := json.Marshal(submission)
	if err != nil {
		log.Fatalf("Failed to marshal submission: %v", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", *nodeURL+"/submit_block", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Send request with timeout
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Failed to send request: %v", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response: %v", err)
	}

	// Parse response
	var response BlockResponse
	if err := json.Unmarshal(body, &response); err != nil {
		log.Fatalf("Failed to parse response: %v", err)
	}

	// Display results
	if response.Success {
		fmt.Printf("Block submitted successfully!\n")
		fmt.Printf("Payload: %s\n", submission.Payload)
		fmt.Printf("Validator: %s\n", submission.Validator)
		fmt.Printf("Block Hash: %s\n", response.BlockHash)
		fmt.Printf("Total blocks in DAG: %d\n", response.BlockCount)
		fmt.Printf("Timestamp: %d\n", response.Timestamp)
	} else {
		fmt.Printf("Block submission failed: %s\n", response.Message)
	}
}
