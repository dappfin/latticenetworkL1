#!/usr/bin/env bash
set -euo pipefail

# ================================
# LATTICE AUTOMATED NODE RECOVERY
# ================================

LOG_DIR="./recovery/logs"
STATE_DIR="./recovery/state"
MAX_RECOVERY_ATTEMPTS=3
RECOVERY_COOLDOWN=30
NODE_PORTS=(8545 8547 8549 8551)

# Create directories
mkdir -p "$LOG_DIR" "$STATE_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/recovery_$(date +%Y%m%d).log"
}

# Check if node process is running
is_node_running() {
    local port=$1
    local pid_file="/tmp/lattice_node${port}.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            rm -f "$pid_file"
        fi
    fi
    return 1
}

# Check node RPC connectivity
is_node_responsive() {
    local port=$1
    local timeout=${2:-5}
    
    curl -s --max-time "$timeout" -X POST -H 'Content-Type: application/json' \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "http://localhost:$port" >/dev/null 2>&1
}

# Get detailed node status
get_node_status() {
    local port=$1
    local node_id=$2
    
    echo "Node $node_id (Port $port):"
    
    # Process status
    if is_node_running "$port"; then
        echo "  Process: RUNNING"
    else
        echo "  Process: STOPPED"
    fi
    
    # RPC status
    if is_node_responsive "$port"; then
        echo "  RPC: RESPONDING"
        
        # Get consensus state
        local consensus=$(curl -s --max-time 5 -X POST -H 'Content-Type: application/json' \
            --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
            "http://localhost:$port" 2>/dev/null || echo '{"error":"Failed to get consensus"}')
        
        if [[ "$consensus" != *"error"* ]]; then
            echo "  Consensus: ACTIVE"
            local active=$(echo "$consensus" | grep -o '"activeValidators":[0-9]*' | cut -d':' -f2 || echo "0")
            local total=$(echo "$consensus" | grep -o '"totalValidators":[0-9]*' | cut -d':' -f2 || echo "0")
            echo "  Validators: $active/$total"
        else
            echo "  Consensus: ERROR"
        fi
    else
        echo "  RPC: UNRESPONSIVE"
    fi
    
    echo ""
}

# Kill node process gracefully
kill_node() {
    local port=$1
    local pid_file="/tmp/lattice_node${port}.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        log "Attempting to kill node process $pid (port $port)"
        
        # Try graceful shutdown first
        if kill -TERM "$pid" 2>/dev/null; then
            sleep 5
            
            # Check if it's still running
            if kill -0 "$pid" 2>/dev/null; then
                log "Graceful shutdown failed, force killing process $pid"
                kill -KILL "$pid" 2>/dev/null || true
            fi
        fi
        
        rm -f "$pid_file"
    fi
    
    # Kill any remaining processes on the port
    fuser -k "${port}/tcp" 2>/dev/null || true
}

# Start individual node
start_node() {
    local port=$1
    local node_id=$2
    local config_index=$((node_id - 1))
    
    log "Starting Node $node_id (Port $port)"
    
    # Kill any existing process
    kill_node "$port"
    
    # Wait for cleanup
    sleep 2
    
    # Start the node with appropriate configuration
    case $node_id in
        1)
            ./lattice-l1/lattice_node \
                --validators ./lattice/genesis/validators.registry.json \
                --rpc-config ./rpc/config/rpc_node1.json \
                --indexer-config ./nodes/indexer_config_node1.json \
                --log-dir ./nodes/node1 \
                --indexer-log-dir ./nodes/node1 \
                --genesis ./lattice/genesis/genesis_hash.txt \
                --evm ./evm/config/genesis_allocations.json \
                > ./nodes/node1/node.log 2>&1 &
            ;;
        2)
            ./lattice-l1/lattice_node \
                --validators ./lattice/genesis/validators.registry.json \
                --rpc-config ./rpc/config/rpc_node2.json \
                --indexer-config ./nodes/indexer_config_node2.json \
                --log-dir ./nodes/node2 \
                --indexer-log-dir ./nodes/node2 \
                --genesis ./lattice/genesis/genesis_hash.txt \
                --evm ./evm/config/genesis_allocations.json \
                > ./nodes/node2/node.log 2>&1 &
            ;;
        3)
            ./lattice-l1/lattice_node \
                --validators ./lattice/genesis/validators.registry.json \
                --rpc-config ./rpc/config/rpc_node3.json \
                --indexer-config ./nodes/indexer_config_node3.json \
                --log-dir ./nodes/node3 \
                --indexer-log-dir ./nodes/node3 \
                --genesis ./lattice/genesis/genesis_hash.txt \
                --evm ./evm/config/genesis_allocations.json \
                > ./nodes/node3/node.log 2>&1 &
            ;;
        4)
            ./lattice-l1/lattice_node \
                --validators ./lattice/genesis/validators.registry.json \
                --rpc-config ./rpc/config/rpc_node4.json \
                --indexer-config ./nodes/indexer_config_node4.json \
                --log-dir ./nodes/node4 \
                --indexer-log-dir ./nodes/node4 \
                --genesis ./lattice/genesis/genesis_hash.txt \
                --evm ./evm/config/genesis_allocations.json \
                > ./nodes/node4/node.log 2>&1 &
            ;;
        *)
            log "Unknown node ID: $node_id"
            return 1
            ;;
    esac
    
    local pid=$!
    echo $pid > "/tmp/lattice_node${port}.pid"
    log "Node $node_id started with PID: $pid"
    
    # Wait for node to initialize
    log "Waiting for Node $node_id to initialize..."
    local max_wait=60
    local wait_count=0
    
    while [[ $wait_count -lt $max_wait ]]; do
        if is_node_responsive "$port" 3; then
            log "Node $node_id is responsive and healthy"
            return 0
        fi
        
        if ! is_node_running "$port"; then
            log "Node $node_id process died during initialization"
            return 1
        fi
        
        sleep 1
        ((wait_count++))
    done
    
    log "Node $node_id failed to become responsive within ${max_wait}s"
    return 1
}

# Recover individual node
recover_node() {
    local port=$1
    local node_id=$2
    local attempt=${3:-1}
    
    log "Recovering Node $node_id (Port $port) - Attempt $attempt/$MAX_RECOVERY_ATTEMPTS"
    
    # Check if recovery attempts exceeded
    if [[ $attempt -gt $MAX_RECOVERY_ATTEMPTS ]]; then
        log "Max recovery attempts exceeded for Node $node_id"
        return 1
    fi
    
    # Get current status
    local was_running=$(is_node_running "$port" && echo "true" || echo "false")
    local was_responsive=$(is_node_responsive "$port" && echo "true" || echo "false")
    
    log "Node $node_id status before recovery: Running=$was_running, Responsive=$was_responsive"
    
    # Attempt recovery
    if start_node "$port" "$node_id"; then
        log "Node $node_id recovery successful"
        
        # Record successful recovery
        echo "$(date '+%Y-%m-%d %H:%M:%S'),$node_id,$port,success,$attempt" >> "$STATE_DIR/recovery_log_$(date +%Y%m%d).csv"
        return 0
    else
        log "Node $node_id recovery failed on attempt $attempt"
        
        # Record failed recovery
        echo "$(date '+%Y-%m-%d %H:%M:%S'),$node_id,$port,failed,$attempt" >> "$STATE_DIR/recovery_log_$(date +%Y%m%d).csv"
        
        # Wait before retry
        if [[ $attempt -lt $MAX_RECOVERY_ATTEMPTS ]]; then
            log "Waiting ${RECOVERY_COOLDOWN}s before retry..."
            sleep "$RECOVERY_COOLDOWN"
            recover_node "$port" "$node_id" $((attempt + 1))
        fi
        
        return 1
    fi
}

# Full network recovery
recover_network() {
    log "Starting full network recovery"
    
    local recovered_nodes=0
    local failed_nodes=0
    
    for i in "${!NODE_PORTS[@]}"; do
        local port=${NODE_PORTS[$i]}
        local node_id=$((i + 1))
        
        if recover_node "$port" "$node_id"; then
            ((recovered_nodes++))
        else
            ((failed_nodes++))
        fi
    done
    
    log "Network recovery complete: $recovered_nodes recovered, $failed_nodes failed"
    
    if [[ $failed_nodes -eq 0 ]]; then
        log "All nodes recovered successfully"
        return 0
    else
        log "Some nodes failed to recover: $failed_nodes/${#NODE_PORTS[@]}"
        return 1
    fi
}

# Continuous monitoring and auto-recovery
start_auto_recovery() {
    local check_interval=${1:-30}  # Default 30 seconds
    
    log "Starting auto-recovery daemon with ${check_interval}s check interval"
    
    while true; do
        local unhealthy_nodes=()
        
        # Check all nodes
        for i in "${!NODE_PORTS[@]}"; do
            local port=${NODE_PORTS[$i]}
            local node_id=$((i + 1))
            
            if ! is_node_responsive "$port" 5; then
                log "Detected unhealthy Node $node_id (Port $port)"
                unhealthy_nodes+=("$port:$node_id")
            fi
        done
        
        # Recover unhealthy nodes
        if [[ ${#unhealthy_nodes[@]} -gt 0 ]]; then
            log "Found ${#unhealthy_nodes[@]} unhealthy nodes, starting recovery"
            
            for node_info in "${unhealthy_nodes[@]}"; do
                IFS=':' read -r port node_id <<< "$node_info"
                recover_node "$port" "$node_id"
            done
        fi
        
        sleep "$check_interval"
    done
}

# Generate recovery report
generate_recovery_report() {
    local report_file="$LOG_DIR/recovery_report_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "=== LATTICE NODE RECOVERY REPORT ===" > "$report_file"
    echo "Generated: $(date)" >> "$report_file"
    echo "" >> "$report_file"
    
    # Current node status
    echo "CURRENT NODE STATUS:" >> "$report_file"
    for i in "${!NODE_PORTS[@]}"; do
        local port=${NODE_PORTS[$i]}
        local node_id=$((i + 1))
        get_node_status "$port" "$node_id" >> "$report_file"
    done
    
    # Recovery statistics
    echo "RECOVERY STATISTICS:" >> "$report_file"
    if [[ -f "$STATE_DIR/recovery_log_$(date +%Y%m%d).csv" ]]; then
        local total_recoveries=$(wc -l < "$STATE_DIR/recovery_log_$(date +%Y%m%d).csv")
        local successful=$(grep ',success,' "$STATE_DIR/recovery_log_$(date +%Y%m%d).csv" | wc -l)
        local failed=$(grep ',failed,' "$STATE_DIR/recovery_log_$(date +%Y%m%d).csv" | wc -l)
        
        echo "  Total recovery attempts: $total_recoveries" >> "$report_file"
        echo "  Successful: $successful" >> "$report_file"
        echo "  Failed: $failed" >> "$report_file"
        echo "  Success rate: $((successful * 100 / total_recoveries))%" >> "$report_file"
    else
        echo "  No recovery attempts recorded today" >> "$report_file"
    fi
    
    echo "Report saved to: $report_file"
}

# Main execution
case "${1:-status}" in
    "status")
        echo "=== LATTICE NODE STATUS ==="
        for i in "${!NODE_PORTS[@]}"; do
            get_node_status "${NODE_PORTS[$i]}" "$((i+1))"
        done
        ;;
    "recover")
        if [[ $# -eq 2 ]]; then
            # Recover specific node
            local node_id=$2
            if [[ $node_id -ge 1 && $node_id -le 4 ]]; then
                recover_node "${NODE_PORTS[$((node_id-1))]}" "$node_id"
            else
                echo "Invalid node ID. Use 1-4."
                exit 1
            fi
        else
            # Recover all nodes
            recover_network
        fi
        ;;
    "auto")
        start_auto_recovery "${2:-30}"
        ;;
    "report")
        generate_recovery_report
        ;;
    "kill")
        if [[ $# -eq 2 ]]; then
            local node_id=$2
            if [[ $node_id -ge 1 && $node_id -le 4 ]]; then
                kill_node "${NODE_PORTS[$((node_id-1))]}"
            else
                echo "Invalid node ID. Use 1-4."
                exit 1
            fi
        else
            echo "Usage: $0 kill <node_id>"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 {status|recover|auto|report|kill} [node_id|interval]"
        echo "  status  - Show current node status"
        echo "  recover - Recover specific node or all nodes"
        echo "  auto    - Start auto-recovery daemon"
        echo "  report  - Generate recovery report"
        echo "  kill    - Kill specific node process"
        exit 1
        ;;
esac
