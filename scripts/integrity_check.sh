#!/usr/bin/env bash
set -euo pipefail

# ================================
# LATTICE POST-RUN INTEGRITY CHECKS
# ================================

if [ $# -lt 2 ]; then
  echo "Usage: $0 <rpc_url> <metrics_file>"
  echo "Example: $0 http://127.0.0.1:8545 metrics.log"
  exit 1
fi

RPC_URL="$1"
METRICS_FILE="$2"

echo "======================================"
echo "INTEGRITY CHECKS START"
echo "RPC:        $RPC_URL"
echo "Metrics:    $METRICS_FILE"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_rpc_connectivity() {
  echo -n "[*] RPC Connectivity... "
  if curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | \
    jq -e '.result' >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
    return 0
  else
    echo -e "${RED}FAILED${NC}"
    return 1
  fi
}

check_sqlite_integrity() {
  echo -n "[*] SQLite Integrity... "
  local db_path="./data/state.db"
  if [ -f "$db_path" ]; then
    if sqlite3 "$db_path" "PRAGMA integrity_check;" | grep -q "ok"; then
      echo -e "${GREEN}OK${NC}"
      sqlite3 "$db_path" "SELECT COUNT(*) FROM transactions;" | \
        awk '{print "  Transaction count: " $1}'
      return 0
    else
      echo -e "${RED}CORRUPTED${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}NO DB FILE${NC}"
    return 0
  fi
}

check_dag_continuity() {
  echo -n "[*] DAG Continuity... "
  local latest_block=$(curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | \
    jq -r '.result // "null"')
  
  if [ "$latest_block" != "null" ]; then
    local block_num=$((latest_block))
    echo -e "${GREEN}OK${NC}"
    echo "  Latest block: $block_num"
    
    # Check last 10 blocks for gaps
    local gaps=0
    for ((i=1; i<=10; i++)); do
      local check_block=$((block_num - i))
      if [ $check_block -ge 0 ]; then
        local block_exists=$(curl -s -X POST "$RPC_URL" \
          -H "Content-Type: application/json" \
          --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBlockByNumber\",\"params\":[\"0x$(printf "%x" $check_block)\",false],\"id\":1}" | \
          jq -r '.result // null')
        
        if [ "$block_exists" = "null" ]; then
          ((gaps++))
        fi
      fi
    done
    
    if [ $gaps -eq 0 ]; then
      echo "  Block continuity: ${GREEN}No gaps${NC}"
    else
      echo "  Block continuity: ${RED}$gaps gaps${NC}"
    fi
    return 0
  else
    echo -e "${RED}FAILED${NC}"
    return 1
  fi
}

analyze_metrics() {
  echo -n "[*] Metrics Analysis... "
  if [ -f "$METRICS_FILE" ]; then
    local total_lines=$(wc -l < "$METRICS_FILE")
    if [ $total_lines -gt 1 ]; then
      echo -e "${GREEN}OK${NC}"
      echo "  Total samples: $((total_lines - 1))"
      
      # Extract key metrics
      tail -n +2 "$METRICS_FILE" | awk -F',' '
      BEGIN {
        max_block = 0; min_block = 999999999;
        max_mempool = 0; avg_mempool = 0;
        count = 0
      }
      {
        if ($2 != "null") {
          if ($2 > max_block) max_block = $2;
          if ($2 < min_block) min_block = $2;
        }
        if ($3 != "null") {
          if ($3 > max_mempool) max_mempool = $3;
          avg_mempool += $3;
        }
        count++
      }
      END {
        if (count > 0) {
          avg_mempool /= count;
          print "  Block range: " min_block " to " max_block;
          print "  Max mempool: " max_mempool;
          print "  Avg mempool: " sprintf("%.1f", avg_mempool);
        }
      }'
    else
      echo -e "${YELLOW}NO DATA${NC}"
    fi
  else
    echo -e "${YELLOW}NO FILE${NC}"
  fi
}

check_system_resources() {
  echo -n "[*] System Resources... "
  local mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
  local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
  
  echo -e "${GREEN}OK${NC}"
  echo "  Memory: ${mem_usage}%"
  echo "  Disk: ${disk_usage}%"
  
  if (( $(echo "$mem_usage > 90" | bc -l) )); then
    echo -e "  Memory usage: ${RED}HIGH${NC}"
  fi
  
  if [ "$disk_usage" -gt 90 ]; then
    echo -e "  Disk usage: ${RED}HIGH${NC}"
  fi
}

# Run all checks
echo ""
check_rpc_connectivity || echo -e "${RED}CRITICAL: RPC not accessible${NC}"
echo ""

check_sqlite_integrity || echo -e "${RED}CRITICAL: Database corruption detected${NC}"
echo ""

check_dag_continuity || echo -e "${RED}CRITICAL: DAG continuity broken${NC}"
echo ""

analyze_metrics
echo ""

check_system_resources
echo ""

echo "======================================"
echo "INTEGRITY CHECKS COMPLETE"
echo "======================================"
