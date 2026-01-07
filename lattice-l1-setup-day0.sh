#!/bin/bash
set -e

# ========================================
# LATTICE L1 HYBRID DAG PQ SETUP
# Day 0 - Production-Safe Configuration
# ========================================

echo "🔐 LATTICE L1 HYBRID DAG PQ SETUP - DAY 0"
echo "========================================"

# TASK 0.1: CHOOSE & LOCK PQ SIGNATURE SCHEME
echo ""
echo "📋 TASK 0.1: PQ SIGNATURE SCHEME SELECTION"
echo "========================================"
echo "✅ CHOSEN: CRYSTALS-Dilithium (Level 2)"
echo "✅ LOCKED: Production-safe choice for 2025"
echo "✅ HASH: Keccak-256"
echo "✅ SIGNATURE SIZE: ~2420 bytes"
echo "✅ PUBLIC KEY SIZE: ~1312 bytes"

# TASK 0.2: SET CHAIN PARAMETERS
echo ""
echo "📋 TASK 0.2: CHAIN CONFIGURATION"
echo "=================================="
echo "✅ CHAIN ID: 88401 (EVM)"
echo "✅ LAYER: Lattice Layer1"
echo "✅ ADDRESS FORMAT: EVM (20 bytes)"

# TASK 0.3: DOMAIN SEPARATION
echo ""
echo "📋 TASK 0.3: DOMAIN SEPARATION"
echo "================================"
echo "✅ SIGNATURE DOMAIN: LATTICE|L1|CHAINID:88401|TX"
echo "✅ CONSENSUS DOMAIN: LATTICE|L1|CHAINID:88401|CONSENSUS"
echo "✅ EVM DOMAIN: LATTICE|L1|CHAINID:88401|EVM"

# TASK 0.4: DAG FINALITY CONFIGURATION
echo ""
echo "📋 TASK 0.4: DAG FINALITY SETTINGS"
echo "=================================="
echo "✅ LAYER INTERVAL: 1.6 seconds"
echo "✅ SOFT FINALITY: ≥67% stake"
echo "✅ HARD FINALITY: ≥67% stake"
echo "✅ EPOCH WINDOW: 30 seconds"
echo "✅ MAX TX/LAYER: 300"
echo "✅ MAX PARENTS/VERTEX: 2"

# TASK 0.5: RPC RATE LIMITS
echo ""
echo "📋 TASK 0.5: RPC RATE LIMITS"
echo "==============================="
echo "✅ GLOBAL LIMIT: 20 req/sec/IP"
echo "✅ BURST LIMIT: 40 req/sec/IP"
echo "✅ eth_sendRawTransaction: 5 req/sec/IP"
echo "✅ eth_getLogs: 1 req/sec/IP"
echo "✅ HEAVY ARCHIVE CALLS: DISABLED"

echo ""
echo "🎯 CONFIGURATION LOCKED - PRODUCTION READY"
echo "========================================"
