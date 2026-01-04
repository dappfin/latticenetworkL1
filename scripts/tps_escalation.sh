#!/usr/bin/env bash
set -euo pipefail

# ================================
# LATTICE 10K TPS ESCALATION PLAN
# ================================

# Configuration
LOG_DIR="./escalation/logs"
METRICS_DIR="./escalation/metrics"
RPC_BASE_URL="http://localhost"

# TPS escalation stages (TPS, duration_seconds, description)
declare -a TPS_STAGES=(
    "100 60 Baseline - 100 TPS for 1 minute"
    "500 120 Warm-up - 500 TPS for 2 minutes"
    "1000 180 Moderate - 1K TPS for 3 minutes"
    "2000 240 High - 2K TPS for 4 minutes"
    "3500 300 Very High - 3.5K TPS for 5 minutes"
    "5000 360 Extreme - 5K TPS for 6 minutes"
    "7500 420 Critical - 7.5K TPS for 7 minutes"
    "10000 480 Maximum - 10K TPS for 8 minutes"
)

# Node ports for load distribution
declare -a NODE_PORTS=(8545 8547 8549 8551)

# Safety thresholds
MAX_FAILURE_RATE=5      # 5% failure rate threshold
MAX_LATENCY_MS=1000     # 1 second max latency
MIN_HEALTHY_NODES=3     # Minimum healthy nodes required

# Create directories
mkdir -p "$LOG_DIR" "$METRICS_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/escalation_$(date +%Y%m%d).log"
}

# Check node health before escalation
pre_stage_health_check() {
    local stage=$1
    log "Pre-stage health check for Stage $stage"
    
    local healthy_nodes=0
    for port in "${NODE_PORTS[@]}"; do
        if curl -s --max-time 3 -X POST -H 'Content-Type: application/json' \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "$RPC_BASE_URL:$port" >/dev/null 2>&1; then
            ((healthy_nodes++))
        fi
    done
    
    if [[ $healthy_nodes -lt $MIN_HEALTHY_NODES ]]; then
        log "CRITICAL: Only $healthy_nodes nodes healthy. Halting escalation."
        return 1
    fi
    
    log "Health check passed: $healthy_nodes/${#NODE_PORTS[@]} nodes healthy"
    return 0
}

# Run TPS test with monitoring
run_tps_stage() {
    local tps=$1
    local duration=$2
    local description=$3
    local stage_num=$4
    
    log "=== STAGE $stage_num: $description ==="
    log "Target TPS: $tps, Duration: ${duration}s"
    
    # Start monitoring in background
    ./scripts/node_monitor.sh check > "$METRICS_DIR/stage${stage_num}_pre_$(date +%Y%m%d_%H%M%S).txt" 2>&1 &
    local monitor_pid=$!
    
    # Distribute load across nodes
    local tps_per_node=$((tps / ${#NODE_PORTS[@]}))
    local remainder=$((tps % ${#NODE_PORTS[@]}))
    
    log "Load distribution: ${tps_per_node} TPS per node (+${remainder} extra)"
    
    # Start tx flood processes
    declare -a flood_pids=()
    for i in "${!NODE_PORTS[@]}"; do
        local port=${NODE_PORTS[$i]}
        local node_tps=$tps_per_node
        if [[ $i -lt $remainder ]]; then
            ((node_tps++))
        fi
        
        log "Starting $node_tps TPS on node $((i+1)) (port $port)"
        ./scripts/tx_flood.sh "$RPC_BASE_URL:$port" "$node_tps" "$duration" > "$METRICS_DIR/stage${stage_num}_node$((i+1))_$(date +%Y%m%d_%H%M%S).log" 2>&1 &
        flood_pids+=($!)
    done
    
    # Monitor during test
    local start_time=$(date +%s)
    local test_duration=$duration
    
    while [[ $(($(date +%s) - start_time)) -lt $test_duration ]]; do
        # Quick health check
        local current_healthy=0
        for port in "${NODE_PORTS[@]}"; do
            if curl -s --max-time 2 -X POST -H 'Content-Type: application/json' \
                --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                "$RPC_BASE_URL:$port" >/dev/null 2>&1; then
                ((current_healthy++))
            fi
        done
        
        if [[ $current_healthy -lt $MIN_HEALTHY_NODES ]]; then
            log "EMERGENCY: Node health degraded to $current_healthy/${#NODE_PORTS[@]}. Stopping test!"
            # Kill all flood processes
            for pid in "${flood_pids[@]}"; do
                kill -9 "$pid" 2>/dev/null || true
            done
            return 1
        fi
        
        sleep 5
    done
    
    # Wait for all flood processes to complete
    local failed_processes=0
    for pid in "${flood_pids[@]}"; do
        if ! wait "$pid"; then
            ((failed_processes++))
        fi
    done
    
    # Stop monitoring
    kill "$monitor_pid" 2>/dev/null || true
    
    # Post-stage analysis
    ./scripts/node_monitor.sh check > "$METRICS_DIR/stage${stage_num}_post_$(date +%Y%m%d_%H%M%S).txt" 2>&1
    
    if [[ $failed_processes -gt 0 ]]; then
        log "WARNING: $failed_processes flood processes failed"
    fi
    
    log "Stage $stage_num completed successfully"
    return 0
}

# Analyze stage results
analyze_stage_results() {
    local stage_num=$1
    
    log "Analyzing Stage $stage_num results..."
    
    # Parse logs for success rates
    local total_sent=0
    local total_failed=0
    
    for i in "${!NODE_PORTS[@]}"; do
        local log_file=$(find "$METRICS_DIR" -name "stage${stage_num}_node$((i+1))_*" | head -1)
        if [[ -f "$log_file" ]]; then
            local sent=$(grep "Sent OK:" "$log_file" | tail -1 | awk '{print $3}')
            local failed=$(grep "Failed:" "$log_file" | tail -1 | awk '{print $2}')
            
            total_sent=$((total_sent + sent))
            total_failed=$((total_failed + failed))
        fi
    done
    
    local total_tx=$((total_sent + total_failed))
    local failure_rate=0
    if [[ $total_tx -gt 0 ]]; then
        failure_rate=$((total_failed * 100 / total_tx))
    fi
    
    log "Stage $stage_num Results:"
    log "  Total Transactions: $total_tx"
    log "  Successful: $total_sent"
    log "  Failed: $total_failed"
    log "  Failure Rate: ${failure_rate}%"
    
    # Check if failure rate exceeds threshold
    if [[ $failure_rate -gt $MAX_FAILURE_RATE ]]; then
        log "ALERT: Failure rate ${failure_rate}% exceeds threshold ${MAX_FAILURE_RATE}%"
        return 1
    fi
    
    return 0
}

# Recovery procedure
recover_nodes() {
    log "Initiating node recovery procedure..."
    
    # Stop all nodes
    pkill -9 lattice_node 2>/dev/null || true
    sleep 5
    
    # Restart nodes
    log "Restarting all nodes..."
    ./scripts/start_nodes.sh > "$LOG_DIR/recovery_$(date +%Y%m%d_%H%M%S).log" 2>&1
    
    # Wait for stabilization
    log "Waiting for nodes to stabilize..."
    sleep 30
    
    # Verify recovery
    local healthy_nodes=0
    for port in "${NODE_PORTS[@]}"; do
        if curl -s --max-time 5 -X POST -H 'Content-Type: application/json' \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "$RPC_BASE_URL:$port" >/dev/null 2>&1; then
            ((healthy_nodes++))
        fi
    done
    
    if [[ $healthy_nodes -eq ${#NODE_PORTS[@]} ]]; then
        log "Recovery successful: All $healthy_nodes nodes healthy"
        return 0
    else
        log "Recovery incomplete: Only $healthy_nodes/${#NODE_PORTS[@]} nodes healthy"
        return 1
    fi
}

# Main escalation execution
run_escalation_plan() {
    log "Starting 10K TPS Escalation Plan"
    log "Total stages: ${#TPS_STAGES[@]}"
    
    local current_stage=0
    local failed_stage=0
    
    for stage_config in "${TPS_STAGES[@]}"; do
        ((current_stage++))
        
        # Parse stage configuration
        read -r tps duration description <<< "$stage_config"
        
        log "=========================================="
        log "STARTING STAGE $current_stage/${#TPS_STAGES[@]}"
        log "=========================================="
        
        # Pre-stage health check
        if ! pre_stage_health_check "$current_stage"; then
            log "Pre-stage health check failed. Attempting recovery..."
            if ! recover_nodes; then
                log "Recovery failed. Halting escalation at Stage $current_stage."
                break
            fi
            
            # Retry health check
            if ! pre_stage_health_check "$current_stage"; then
                log "Health check still failed after recovery. Halting escalation."
                break
            fi
        fi
        
        # Run the TPS stage
        if run_tps_stage "$tps" "$duration" "$description" "$current_stage"; then
            # Stage completed, analyze results
            if analyze_stage_results "$current_stage"; then
                log "Stage $current_stage passed analysis"
                
                # Cool-down period between stages
                if [[ $current_stage -lt ${#TPS_STAGES[@]} ]]; then
                    log "Cool-down period: 60 seconds"
                    sleep 60
                fi
            else
                log "Stage $current_stage failed analysis. Attempting recovery..."
                failed_stage=$current_stage
                
                if ! recover_nodes; then
                    log "Recovery failed. Halting escalation at Stage $current_stage."
                    break
                fi
                
                # Retry the stage once
                log "Retrying Stage $current_stage..."
                if run_tps_stage "$tps" "$duration" "$description" "${current_stage}_retry"; then
                    if analyze_stage_results "${current_stage}_retry"; then
                        log "Stage $current_stage retry passed"
                    else
                        log "Stage $current_stage retry also failed. Halting escalation."
                        break
                    fi
                else
                    log "Stage $current_stage retry execution failed. Halting escalation."
                    break
                fi
            fi
        else
            log "Stage $current_stage execution failed. Halting escalation."
            failed_stage=$current_stage
            break
        fi
    done
    
    # Final report
    log "=========================================="
    log "ESCALATION PLAN COMPLETE"
    log "=========================================="
    log "Completed Stages: $((current_stage - 1))/${#TPS_STAGES[@]}"
    if [[ $failed_stage -gt 0 ]]; then
        log "Failed at Stage: $failed_stage"
    else
        log "All stages completed successfully!"
    fi
    
    # Generate final health report
    ./scripts/node_monitor.sh report
}

# Main execution
case "${1:-run}" in
    "run")
        run_escalation_plan
        ;;
    "test")
        # Test single stage
        if [[ $# -lt 3 ]]; then
            echo "Usage: $0 test <tps> <duration_seconds>"
            exit 1
        fi
        run_tps_stage "$2" "$3" "Test Run" "test"
        analyze_stage_results "test"
        ;;
    "recover")
        recover_nodes
        ;;
    *)
        echo "Usage: $0 {run|test|recover} [tps] [duration]"
        exit 1
        ;;
esac
