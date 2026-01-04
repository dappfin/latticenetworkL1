package rpc

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"latticenetworkL1/core/dag"
	"latticenetworkL1/core/pq"
	"latticenetworkL1/node/mempool"
)

// RateLimiter implements method-specific rate limiting

var (
	rpcOnce sync.Once
)

// RateLimiter implements method-specific rate limiting
type RateLimiter struct {
	clients map[string]*ClientLimits
	mutex   sync.RWMutex
}

// ClientLimits tracks rate limits per client
type ClientLimits struct {
	allRequests       int64
	sendRawTxRequests int64
	getLogsRequests   int64
	lastReset         time.Time
}

// RPCRequest represents a JSON-RPC request
type RPCRequest struct {
	ID      interface{} `json:"id"`
	Jsonrpc string      `json:"jsonrpc"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params"`
}

// RPCResponse represents a JSON-RPC response
type RPCResponse struct {
	ID      interface{} `json:"id"`
	Jsonrpc string      `json:"jsonrpc"`
	Result  interface{} `json:"result,omitempty"`
	Error   *RPCError   `json:"error,omitempty"`
}

// RPCError represents a JSON-RPC error
type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// RPCServer handles Ethereum-compatible RPC requests
type RPCServer struct {
	dag         *dag.GhostDAG
	pqValidator *pq.PQValidator
	posEngine   *dag.POSEngine
	rateLimiter *RateLimiter
	mempool     *mempool.Mempool
}

// NewRPCServer creates a new RPC server instance
func NewRPCServer(d *dag.GhostDAG, pqVal *pq.PQValidator, pos *dag.POSEngine, mempool *mempool.Mempool) *RPCServer {
	return &RPCServer{
		dag:         d,
		pqValidator: pqVal,
		posEngine:   pos,
		rateLimiter: NewRateLimiter(),
		mempool:     mempool,
	}
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		clients: make(map[string]*ClientLimits),
	}
}

// CheckRateLimit checks if a request is allowed based on method-specific limits
func (rl *RateLimiter) CheckRateLimit(clientIP, method string) bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := time.Now()
	client, exists := rl.clients[clientIP]
	if !exists {
		client = &ClientLimits{
			lastReset: now,
		}
		rl.clients[clientIP] = client
	}

	// Reset counters every second
	if now.Sub(client.lastReset) >= time.Second {
		client.allRequests = 0
		client.sendRawTxRequests = 0
		client.getLogsRequests = 0
		client.lastReset = now
	}

	// Check global rate limit (20 req/sec)
	if client.allRequests >= 20 {
		return false
	}

	// Check method-specific limits
	switch method {
	case "eth_sendRawTransaction":
		if client.sendRawTxRequests >= 5 {
			return false
		}
		client.sendRawTxRequests++
	case "eth_getLogs":
		if client.getLogsRequests >= 1 {
			return false
		}
		client.getLogsRequests++
	case "eth_getBlockByNumber", "eth_getBlockByHash", "eth_getTransactionByHash", "eth_getTransactionReceipt":
		// Heavy archive calls - disabled
		return false
	}

	client.allRequests++
	return true
}

// Start starts the RPC server on the specified bind address
func (s *RPCServer) Start(bindAddress string) error {
	// Create a new HTTP mux for this server instance to avoid conflicts
	mux := http.NewServeMux()
	mux.HandleFunc("/rpc", s.handleRPC)

	log.Printf("Starting RPC server on %s", bindAddress)
	return http.ListenAndServe(bindAddress, mux)
}

// StartRPCOnce ensures the RPC server is started exactly once using sync.Once
func StartRPCOnce(server *RPCServer, bindAddress string) {
	rpcOnce.Do(func() {
		go func() {
			log.Printf("Starting RPC server once on %s", bindAddress)
			if err := server.Start(bindAddress); err != nil {
				log.Fatalf("Failed to start RPC server: %v", err)
			}
		}()
	})
}

// handleRPC handles incoming RPC requests
func (s *RPCServer) handleRPC(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		s.sendError(w, nil, -32600, "Only POST requests are allowed")
		return
	}

	// Get client IP for rate limiting
	clientIP := getClientIP(r)

	// Parse RPC request with enhanced error handling
	var rpcReq RPCRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&rpcReq); err != nil {
		var syntaxErr *json.SyntaxError
		var unmarshalErr *json.UnmarshalTypeError

		switch {
		case errors.As(err, &syntaxErr):
			s.sendError(w, nil, -32700, fmt.Sprintf("Invalid JSON syntax at position %d", syntaxErr.Offset))
		case errors.As(err, &unmarshalErr):
			s.sendError(w, nil, -32700, fmt.Sprintf("Invalid JSON type for field '%s'", unmarshalErr.Field))
		case errors.Is(err, io.EOF):
			s.sendError(w, nil, -32700, "Empty request body")
		default:
			s.sendError(w, nil, -32700, fmt.Sprintf("Parse error: %v", err))
		}
		return
	}

	// Validate required fields
	if rpcReq.Jsonrpc == "" {
		s.sendError(w, nil, -32600, "Missing 'jsonrpc' field")
		return
	}
	if rpcReq.Method == "" {
		s.sendError(w, nil, -32600, "Missing 'method' field")
		return
	}
	if rpcReq.Jsonrpc != "2.0" {
		s.sendError(w, nil, -32600, "Unsupported JSON-RPC version")
		return
	}

	// Check rate limits
	if !s.rateLimiter.CheckRateLimit(clientIP, rpcReq.Method) {
		s.sendError(w, rpcReq.ID, -32000, "Rate limit exceeded")
		return
	}

	// Process request
	response := s.processRequest(rpcReq)

	// Send response with error handling
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Failed to encode RPC response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// processRequest processes an individual RPC request
func (s *RPCServer) processRequest(req RPCRequest) RPCResponse {
	switch req.Method {
	case "eth_chainId":
		return RPCResponse{
			ID:      req.ID,
			Jsonrpc: "2.0",
			Result:  "0x15911", // 88401 in hex
		}
	case "eth_blockNumber":
		return RPCResponse{
			ID:      req.ID,
			Jsonrpc: "2.0",
			Result:  fmt.Sprintf("0x%x", s.dag.GetBlockCount()),
		}
	case "eth_sendRawTransaction":
		return s.handleSendRawTransaction(req)
	case "eth_getLogs":
		return s.handleGetLogs(req)
	case "net_version":
		return RPCResponse{
			ID:      req.ID,
			Jsonrpc: "2.0",
			Result:  "88401",
		}
	case "eth_getTransactionCount":
		return RPCResponse{
			ID:      req.ID,
			Jsonrpc: "2.0",
			Result:  "0x0", // Simplified: always return 0 for now
		}
	case "eth_gasPrice":
		return RPCResponse{
			ID:      req.ID,
			Jsonrpc: "2.0",
			Result:  "0x3B9ACA00", // 1 Gwei in hex
		}
	case "lattice_getBlockSignatures":
		return s.handleGetBlockSignatures(req)
	case "lattice_getBlockCount":
		return s.handleGetBlockCount(req)
	case "lattice_submitTransaction":
		return s.handleSubmitTransaction(req)
	case "lattice_getDAGStats":
		return s.handleGetDAGStats(req)
	case "lattice_getLayerInfo":
		return s.handleGetLayerInfo(req)
	case "lattice_getValidatorList":
		return s.handleGetValidatorList(req)
	case "lattice_getValidatorInfo":
		return s.handleGetValidatorInfo(req)
	case "lattice_addValidator":
		return s.handleAddValidator(req)
	case "lattice_removeValidator":
		return s.handleRemoveValidator(req)
	case "lattice_getMempoolInfo":
		return s.handleGetMempoolInfo(req)
	case "lattice_getNetworkStats":
		return s.handleGetNetworkStats(req)
	default:
		return s.sendErrorResponse(req.ID, -32601, "Method not found")
	}
}

// handleSendRawTransaction processes eth_sendRawTransaction requests
func (s *RPCServer) handleSendRawTransaction(req RPCRequest) RPCResponse {
	// Extract raw transaction hex from params
	params, ok := req.Params.([]interface{})
	if !ok || len(params) == 0 {
		return s.sendErrorResponse(req.ID, -32602, "Invalid params: expected raw transaction hex")
	}

	rawTxHex, ok := params[0].(string)
	if !ok {
		return s.sendErrorResponse(req.ID, -32602, "Invalid params: raw transaction must be string")
	}

	// Create a mock transaction from the raw hex
	// In a real implementation, this would decode the raw transaction
	tx := &dag.Transaction{
		From:      "0x" + hex.EncodeToString(generateRandomBytes(20)),
		To:        "0x" + hex.EncodeToString(generateRandomBytes(20)),
		Value:     big.NewInt(1000000000000000000), // 1 ETH
		GasPrice:  big.NewInt(1000000000),          // 1 gwei
		GasLimit:  21000,
		Nonce:     uint64(s.mempool.Size()),
		Data:      []byte(rawTxHex),
		Timestamp: time.Now().Unix(),
	}

	// Generate transaction hash
	tx.Hash = dag.GenerateTxHash(tx)

	// Add to mempool
	if err := s.mempool.Add(tx); err != nil {
		return s.sendErrorResponse(req.ID, -32000, fmt.Sprintf("Failed to add transaction to mempool: %v", err))
	}

	log.Printf("Added transaction %s to mempool (from: %s, to: %s, value: %s)",
		tx.Hash, tx.From, tx.To, tx.Value.String())

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  tx.Hash,
	}
}

// handleGetLogs processes eth_getLogs requests
func (s *RPCServer) handleGetLogs(req RPCRequest) RPCResponse {
	// Return empty logs array for now
	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  []interface{}{},
	}
}

// handleGetBlockSignatures processes lattice_getBlockSignatures requests
func (s *RPCServer) handleGetBlockSignatures(req RPCRequest) RPCResponse {
	// Check if PQ validator has keys loaded
	if s.pqValidator == nil {
		return s.sendErrorResponse(req.ID, -32000, "PQ validator not initialized")
	}

	// Get current block number (layer)
	blockNum := s.dag.GetBlockCount()
	currentLayer := s.posEngine.CurrentLayer

	// Create a test message to sign (block hash + layer for uniqueness)
	testMessage := fmt.Sprintf("block_%d_layer_%d_signature", blockNum, currentLayer)

	// Sign the block with PQ validator
	signature, err := s.pqValidator.Sign([]byte(testMessage))
	if err != nil {
		return s.sendErrorResponse(req.ID, -32000, fmt.Sprintf("Failed to sign block: %v", err))
	}

	// Verify the signature to ensure it's valid
	verified := s.pqValidator.Verify([]byte(testMessage), signature)
	if !verified {
		return s.sendErrorResponse(req.ID, -32000, "Generated signature failed verification")
	}

	// Return comprehensive signature information
	result := map[string]interface{}{
		"block_number":      blockNum,
		"current_layer":     currentLayer,
		"validator_id":      "current_validator",
		"message":           testMessage,
		"signature":         hex.EncodeToString(signature),
		"signature_size":    len(signature),
		"public_key":        hex.EncodeToString(s.pqValidator.GetPublicKey()),
		"public_key_hash":   s.pqValidator.GetPublicKeyHash(),
		"validator_address": s.pqValidator.GetAddressHex(),
		"verified":          verified,
		"timestamp":         time.Now().Unix(),
		"pq_scheme":         "crystals-dilithium-level2",
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  result,
	}
}

// sendError sends an error response with robust error handling
func (s *RPCServer) sendError(w http.ResponseWriter, id interface{}, code int, message string) {
	response := RPCResponse{
		ID:      id,
		Jsonrpc: "2.0",
		Error: &RPCError{
			Code:    code,
			Message: message,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Failed to encode error response: %v", err)
		fmt.Fprintf(w, `{"jsonrpc":"2.0","id":%v,"error":{"code":%d,"message":"Internal error"}}`, id, code)
	}
}

// sendErrorResponse creates an error response
func (s *RPCServer) sendErrorResponse(id interface{}, code int, message string) RPCResponse {
	return RPCResponse{
		ID:      id,
		Jsonrpc: "2.0",
		Error: &RPCError{
			Code:    code,
			Message: message,
		},
	}
}

// getClientIP extracts the client IP address from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for reverse proxy setups)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	if idx := strings.LastIndex(r.RemoteAddr, ":"); idx != -1 {
		return r.RemoteAddr[:idx]
	}

	return r.RemoteAddr
}

// generateRandomBytes generates random bytes of the specified length
func generateRandomBytes(length int) []byte {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return bytes
}

// handleGetBlockCount processes lattice_getBlockCount requests
func (s *RPCServer) handleGetBlockCount(req RPCRequest) RPCResponse {
	blockCount := s.dag.GetBlockCount()

	result := map[string]interface{}{
		"block_count": blockCount,
		"hex":         fmt.Sprintf("0x%x", blockCount),
		"timestamp":   time.Now().Unix(),
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  result,
	}
}

// handleSubmitTransaction processes lattice_submitTransaction requests
func (s *RPCServer) handleSubmitTransaction(req RPCRequest) RPCResponse {
	// Extract transaction parameters
	params, ok := req.Params.([]interface{})
	if !ok || len(params) == 0 {
		return s.sendErrorResponse(req.ID, -32602, "Invalid params: expected transaction object")
	}

	// Parse transaction object
	txData, ok := params[0].(map[string]interface{})
	if !ok {
		return s.sendErrorResponse(req.ID, -32602, "Invalid params: transaction must be object")
	}

	// Extract transaction fields
	from, _ := txData["from"].(string)
	to, _ := txData["to"].(string)
	valueStr, _ := txData["value"].(string)
	gasPriceStr, _ := txData["gasPrice"].(string)
	gasLimitStr, _ := txData["gasLimit"].(string)
	nonceStr, _ := txData["nonce"].(string)
	data, _ := txData["data"].(string)

	// Convert hex strings to appropriate types
	value := big.NewInt(0)
	if valueStr != "" && strings.HasPrefix(valueStr, "0x") {
		value.SetString(valueStr[2:], 16)
	}

	gasPrice := big.NewInt(0)
	if gasPriceStr != "" && strings.HasPrefix(gasPriceStr, "0x") {
		gasPrice.SetString(gasPriceStr[2:], 16)
	}

	gasLimit := uint64(21000)
	if gasLimitStr != "" && strings.HasPrefix(gasLimitStr, "0x") {
		if parsed, err := parseHexUint(gasLimitStr); err == nil {
			gasLimit = parsed
		}
	}

	nonce := uint64(0)
	if nonceStr != "" && strings.HasPrefix(nonceStr, "0x") {
		if parsed, err := parseHexUint(nonceStr); err == nil {
			nonce = parsed
		}
	}

	// Create transaction
	tx := &dag.Transaction{
		From:      from,
		To:        to,
		Value:     value,
		GasPrice:  gasPrice,
		GasLimit:  gasLimit,
		Nonce:     nonce,
		Data:      []byte(data),
		Timestamp: time.Now().Unix(),
	}

	// Generate transaction hash
	tx.Hash = dag.GenerateTxHash(tx)

	// Add to mempool
	if err := s.mempool.Add(tx); err != nil {
		return s.sendErrorResponse(req.ID, -32000, fmt.Sprintf("Failed to add transaction to mempool: %v", err))
	}

	log.Printf("Submitted transaction %s to mempool (from: %s, to: %s, value: %s)",
		tx.Hash, tx.From, tx.To, tx.Value.String())

	result := map[string]interface{}{
		"tx_hash":   tx.Hash,
		"status":    "pending",
		"timestamp": tx.Timestamp,
		"pool_size": s.mempool.Size(),
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  result,
	}
}

// handleGetDAGStats processes lattice_getDAGStats requests
func (s *RPCServer) handleGetDAGStats(req RPCRequest) RPCResponse {
	result := map[string]interface{}{
		"current_layer": s.posEngine.CurrentLayer,
		"layer_finality": map[string]interface{}{
			"soft_finality": s.posEngine.CheckSoftFinality(s.posEngine.CurrentLayer),
			"hard_finality": s.posEngine.CheckHardFinality(),
		},
		"block_count":  s.dag.GetBlockCount(),
		"vertex_count": s.dag.GetBlockCount(), // Same as block count in this implementation
		"mempool": map[string]interface{}{
			"pending": s.mempool.Size(),
		},
		"validator_info": map[string]interface{}{
			"total_validators":  len(s.posEngine.Validators),
			"current_validator": "current_validator", // Simplified
		},
		"timestamp": time.Now().Unix(),
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  result,
	}
}

// parseHexUint parses a hex string to uint64
func parseHexUint(hexStr string) (uint64, error) {
	if strings.HasPrefix(hexStr, "0x") {
		hexStr = hexStr[2:]
	}
	var result uint64
	_, err := fmt.Sscanf(hexStr, "%x", &result)
	return result, err
}

// handleGetLayerInfo returns detailed layer information
func (s *RPCServer) handleGetLayerInfo(req RPCRequest) RPCResponse {
	layerInfo := map[string]interface{}{
		"current_layer":    s.posEngine.CurrentLayer,
		"layer_interval":   1.6, // seconds (from config)
		"hard_finality":    s.posEngine.CheckHardFinality(),
		"soft_finality":    s.posEngine.CheckSoftFinality(s.posEngine.CurrentLayer),
		"total_validators": len(s.posEngine.Validators),
		"total_stake":      s.posEngine.GetTotalStake(),
		"timestamp":        time.Now().Unix(),
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  layerInfo,
	}
}

// handleGetValidatorList returns all active validators
func (s *RPCServer) handleGetValidatorList(req RPCRequest) RPCResponse {
	validators := s.posEngine.GetActiveValidators()
	validatorList := make([]map[string]interface{}, len(validators))

	for i, v := range validators {
		validatorList[i] = map[string]interface{}{
			"id":          v.ID,
			"stake":       v.Stake,
			"weight":      v.Weight,
			"pubkey_hash": v.PQPubKeyHash,
		}
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result: map[string]interface{}{
			"validators": validatorList,
			"count":      len(validators),
		},
	}
}

// handleGetValidatorInfo returns detailed information about a specific validator
func (s *RPCServer) handleGetValidatorInfo(req RPCRequest) RPCResponse {
	params, ok := req.Params.([]interface{})
	if !ok || len(params) == 0 {
		return s.sendErrorResponse(req.ID, -32602, "Invalid params: validator ID required")
	}

	validatorID, ok := params[0].(string)
	if !ok {
		return s.sendErrorResponse(req.ID, -32602, "Invalid params: validator ID must be string")
	}

	validator, err := s.posEngine.GetValidatorInfo(validatorID)
	if err != nil {
		return s.sendErrorResponse(req.ID, -32602, fmt.Sprintf("Validator not found: %v", err))
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result: map[string]interface{}{
			"id":          validator.ID,
			"stake":       validator.Stake,
			"weight":      validator.Weight,
			"pubkey_hash": validator.PQPubKeyHash,
		},
	}
}

// handleAddValidator adds a new validator (admin function)
func (s *RPCServer) handleAddValidator(req RPCRequest) RPCResponse {
	params, ok := req.Params.([]interface{})
	if !ok || len(params) < 3 {
		return s.sendErrorResponse(req.ID, -32602, "Invalid params: id, stake, weight, pubkey_hash required")
	}

	id, ok1 := params[0].(string)
	stake, ok2 := params[1].(float64) // JSON numbers are float64
	weight, ok3 := params[2].(float64)
	pubkeyHash, ok4 := params[3].(string)

	if !ok1 || !ok2 || !ok3 || !ok4 {
		return s.sendErrorResponse(req.ID, -32602, "Invalid params: wrong parameter types")
	}

	newValidator := &pq.Validator{
		ID:           id,
		Stake:        uint64(stake),
		Weight:       uint64(weight),
		PQPubKeyHash: pubkeyHash,
	}

	if err := s.posEngine.AddValidator(newValidator); err != nil {
		return s.sendErrorResponse(req.ID, -32603, fmt.Sprintf("Failed to add validator: %v", err))
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  map[string]interface{}{"success": true, "validator_id": id},
	}
}

// handleRemoveValidator removes a validator (admin function)
func (s *RPCServer) handleRemoveValidator(req RPCRequest) RPCResponse {
	params, ok := req.Params.([]interface{})
	if !ok || len(params) == 0 {
		return s.sendErrorResponse(req.ID, -32602, "Invalid params: validator ID required")
	}

	validatorID, ok := params[0].(string)
	if !ok {
		return s.sendErrorResponse(req.ID, -32602, "Invalid params: validator ID must be string")
	}

	if err := s.posEngine.RemoveValidator(validatorID); err != nil {
		return s.sendErrorResponse(req.ID, -32603, fmt.Sprintf("Failed to remove validator: %v", err))
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  map[string]interface{}{"success": true, "removed_validator": validatorID},
	}
}

// handleGetMempoolInfo returns mempool statistics
func (s *RPCServer) handleGetMempoolInfo(req RPCRequest) RPCResponse {
	mempoolInfo := map[string]interface{}{
		"pending_count": s.mempool.Size(),
		"timestamp":     time.Now().Unix(),
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  mempoolInfo,
	}
}

// handleGetNetworkStats returns comprehensive network statistics
func (s *RPCServer) handleGetNetworkStats(req RPCRequest) RPCResponse {
	stats := map[string]interface{}{
		"block_count":     s.dag.GetBlockCount(),
		"current_layer":   s.posEngine.CurrentLayer,
		"validator_count": len(s.posEngine.Validators),
		"total_stake":     s.posEngine.GetTotalStake(),
		"mempool_size":    s.mempool.Size(),
		"hard_finality":   s.posEngine.CheckHardFinality(),
		"soft_finality":   s.posEngine.CheckSoftFinality(s.posEngine.CurrentLayer),
		"network_uptime":  time.Now().Unix(), // Simplified uptime
		"timestamp":       time.Now().Unix(),
	}

	return RPCResponse{
		ID:      req.ID,
		Jsonrpc: "2.0",
		Result:  stats,
	}
}
