#!/usr/bin/env bash
set -euo pipefail

# ================================
# LATTICE NODE HEALTH MONITOR
# ================================

LOG_DIR="./monitoring/logs"
METRICS_DIR="./monitoring/metrics"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEM=85
ALERT_THRESHOLD_DISK=90

# Create directories
mkdir -p "$LOG_DIR" "$METRICS_DIR"

# Node configuration
declare -a NODE_PORTS=(8545 8547 8549 8551)
declare -a NODE_PIDS=()
declare -a NODE_STATUS=()

# Initialize monitoring
init_monitoring() {
    echo "=== Lattice Node Health Monitor ===" | tee "$LOG_DIR/monitor_$(date +%Y%m%d_%H%M%S).log"
    echo "Starting comprehensive node monitoring..."
    echo "Timestamp,CPU%,MEM%,DISK%,RPC_Status,Consensus_State,TxPool_Size,Block_Height" > "$METRICS_DIR/metrics_$(date +%Y%m%d).csv"
}

# Check individual node health
check_node_health() {
    local port=$1
    local node_id=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # RPC connectivity check
    local rpc_status="DOWN"
    local consensus_state="UNKNOWN"
    local txpool_size=0
    local block_height=0
    
    if curl -s --max-time 5 -X POST -H 'Content-Type: application/json' \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "http://localhost:$port" >/dev/null 2>&1; then
        rpc_status="UP"
        
        # Get consensus state
        local consensus_result=$(curl -s --max-time 5 -X POST -H 'Content-Type: application/json' \
            --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
            "http://localhost:$port" 2>/dev/null || echo "{}")
        
        if [[ "$consensus_result" != *"error"* ]]; then
            consensus_state="ACTIVE"
            txpool_size=$(echo "$consensus_result" | grep -o '"pendingTransactions":[0-9]*' | cut -d':' -f2 || echo "0")
        else
            consensus_state="ERROR"
        fi
        
        # Get block height
        local block_result=$(curl -s --max-time 5 -X POST -H 'Content-Type: application/json' \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "http://localhost:$port" 2>/dev/null || echo "{}")
        block_height=$(echo "$block_result" | grep -o '"result":"0x[^"]*"' | cut -d'"' -f4 || echo "0")
        block_height=$((block_height))
    fi
    
    # System resource usage (approximation for the node process)
    local cpu_usage=0
    local mem_usage=0
    local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    
    # Log metrics
    echo "$timestamp,$cpu_usage,$mem_usage,$disk_usage,$rpc_status,$consensus_state,$txpool_size,$block_height" >> "$METRICS_DIR/metrics_$(date +%Y%m%d).csv"
    
    # Check for alerts
    if [[ "$rpc_status" == "DOWN" ]]; then
        echo "ALERT: Node $node_id (port $port) RPC is DOWN" | tee -a "$LOG_DIR/alerts_$(date +%Y%m%d).log"
        return 1
    fi
    
    if [[ "$disk_usage" -gt $ALERT_THRESHOLD_DISK ]]; then
        echo "ALERT: Disk usage ${disk_usage}% exceeds threshold" | tee -a "$LOG_DIR/alerts_$(date +%Y%m%d).log"
    fi
    
    return 0
}

# Continuous monitoring loop
start_monitoring() {
    local interval=${1:-10}  # Default 10 seconds
    
    echo "Starting monitoring with ${interval}s interval..."
    
    while true; do
        local healthy_nodes=0
        
        for i in "${!NODE_PORTS[@]}"; do
            if check_node_health "${NODE_PORTS[$i]}" "$((i+1))"; then
                ((healthy_nodes++))
            fi
        done
        
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Healthy nodes: $healthy_nodes/${#NODE_PORTS[@]}" | tee -a "$LOG_DIR/monitor_$(date +%Y%m%d_%H%M%S).log"
        
        # Critical alert if less than 3 nodes healthy
        if [[ $healthy_nodes -lt 3 ]]; then
            echo "CRITICAL: Only $healthy_nodes nodes healthy! System at risk!" | tee -a "$LOG_DIR/critical_$(date +%Y%m%d).log"
        fi
        
        sleep "$interval"
    done
}

# Generate health report
generate_report() {
    local report_file="$LOG_DIR/health_report_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "=== LATTICE NODE HEALTH REPORT ===" > "$report_file"
    echo "Generated: $(date)" >> "$report_file"
    echo "" >> "$report_file"
    
    for i in "${!NODE_PORTS[@]}"; do
        local port=${NODE_PORTS[$i]}
        echo "Node $((i+1)) (Port $port):" >> "$report_file"
        
        if curl -s --max-time 5 -X POST -H 'Content-Type: application/json' \
            --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
            "http://localhost:$port" >/dev/null 2>&1; then
            echo "  Status: HEALTHY" >> "$report_file"
            
            # Get detailed stats
            local stats=$(curl -s --max-time 5 -X POST -H 'Content-Type: application/json' \
                --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
                "http://localhost:$port")
            echo "  Consensus: $stats" >> "$report_file"
        else
            echo "  Status: UNREACHABLE" >> "$report_file"
        fi
        echo "" >> "$report_file"
    done
    
    echo "Report saved to: $report_file"
}

# Main execution
case "${1:-start}" in
    "start")
        init_monitoring
        start_monitoring "${2:-10}"
        ;;
    "report")
        generate_report
        ;;
    "check")
        for i in "${!NODE_PORTS[@]}"; do
            check_node_health "${NODE_PORTS[$i]}" "$((i+1))"
        done
        ;;
    *)
        echo "Usage: $0 {start|report|check} [interval_seconds]"
        exit 1
        ;;
esac
