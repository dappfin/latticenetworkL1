package crypto

import (
	"encoding/hex"

	"golang.org/x/crypto/sha3"
)

func Keccak256Hex(data []byte) string {
	hash := sha3.NewLegacyKeccak256()
	hash.Write(data)
	return hex.EncodeToString(hash.Sum(nil))
}
