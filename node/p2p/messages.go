package p2p

import "latticenetworkL1/core/dag"

// MessageType represents the type of P2P message
type MessageType string

const (
	MessageBlockAnnounce MessageType = "block_announce"
	MessageBlockRequest  MessageType = "block_request"
	MessageBlockResponse MessageType = "block_response"
	MessageGetBlocks     MessageType = "get_blocks"
	MessagePeerInfo      MessageType = "peer_info"
	MessagePing          MessageType = "ping"
	MessagePong          MessageType = "pong"
)

// Message represents a P2P message
type Message struct {
	Type      MessageType `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
	Nonce     string      `json:"nonce"`
}

// BlockAnnounceData contains block announcement information
type BlockAnnounceData struct {
	Hash       string   `json:"hash"`
	Height     int64    `json:"height"`
	Parents    []string `json:"parents"`
	BlueScore  int64    `json:"blue_score"`
	Timestamp  int64    `json:"timestamp"`
	ProducerID string   `json:"producer_id"`
}

// BlockRequestData contains block request information
type BlockRequestData struct {
	Hash string `json:"hash"`
}

// BlockResponseData contains block response information
type BlockResponseData struct {
	Block *dag.Block `json:"block"`
}

// GetBlocksData contains get blocks request information
type GetBlocksData struct {
	FromHeight int64 `json:"from_height"`
	Limit      int   `json:"limit"`
}

// PeerInfoData contains peer information
type PeerInfoData struct {
	FinalizedHeight int64  `json:"finalized_height"`
	NodeID          string `json:"node_id"`
	Version         string `json:"version"`
}
