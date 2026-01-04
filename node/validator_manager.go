package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type PQValidatorKey struct {
	Name         string `json:"name"`
	PQPublicKey  string `json:"pq_public_key"`
	PQPrivateKey string `json:"pq_private_key"`
}

// Load all PQ validator keys from folder (genesis/keys)
func LoadAllPQValidatorKeys(folder string) (map[string]PQValidatorKey, error) {
	keys := make(map[string]PQValidatorKey)

	entries, err := os.ReadDir(folder)
	if err != nil {
		return nil, fmt.Errorf("cannot read key folder: %v", err)
	}

	for _, e := range entries {
		if e.IsDir() {
			continue
		}

		path := filepath.Join(folder, e.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("failed to read key file %s: %v", e.Name(), err)
		}

		var key PQValidatorKey
		if err := json.Unmarshal(data, &key); err != nil {
			return nil, fmt.Errorf("invalid key file %s: %v", e.Name(), err)
		}

		if key.Name == "" || key.PQPublicKey == "" {
			return nil, fmt.Errorf("key file %s missing required fields", e.Name())
		}

		keys[key.Name] = key
		fmt.Printf("Loaded PQ key for %s\n", key.Name)
	}

	return keys, nil
}
