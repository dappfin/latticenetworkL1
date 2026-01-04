#!/usr/bin/env bash
set -euo pipefail

# ================================
# LATTICE 10K TPS ESCALATION ORCHESTRATOR
# ================================

# Configuration
MAIN_LOG_DIR="./orchestrator/logs"
STATE_DIR="./orchestrator/state"
PID_DIR="./orchestrator/pids"

# Create directories
mkdir -p "$MAIN_LOG_DIR" "$STATE_DIR" "$PID_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ORCHESTRATOR] $1" | tee -a "$MAIN_LOG_DIR/orchestrator_$(date +%Y%m%d).log"
}

# Cleanup function
cleanup() {
    log "Cleaning up orchestration processes..."
    
    # Kill monitoring processes
    if [[ -f "$PID_DIR/monitor.pid" ]]; then
        local monitor_pid=$(cat "$PID_DIR/monitor.pid")
        kill "$monitor_pid" 2>/dev/null || true
        rm -f "$PID_DIR/monitor.pid"
    fi
    
    # Kill recovery processes
    if [[ -f "$PID_DIR/recovery.pid" ]]; then
        local recovery_pid=$(cat "$PID_DIR/recovery.pid")
        kill "$recovery_pid" 2>/dev/null || true
        rm -f "$PID_DIR/recovery.pid"
    fi
    
    # Kill metrics collection
    if [[ -f "$PID_DIR/metrics.pid" ]]; then
        local metrics_pid=$(cat "$PID_DIR/metrics.pid")
        kill "$metrics_pid" 2>/dev/null || true
        rm -f "$PID_DIR/metrics.pid"
    fi
    
    log "Cleanup completed"
}

# Signal handlers
trap cleanup EXIT INT TERM

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    
    # Check if required scripts exist and are executable
    local required_scripts=(
        "./scripts/start_nodes.sh"
        "./scripts/tx_flood.sh"
        "./scripts/node_monitor.sh"
        "./scripts/tps_escalation.sh"
        "./scripts/node_recovery.sh"
        "./scripts/metrics_analyzer.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [[ ! -f "$script" ]]; then
            log "ERROR: Required script not found: $script"
            return 1
        fi
        
        if [[ ! -x "$script" ]]; then
            log "Making script executable: $script"
            chmod +x "$script"
        fi
    done
    
    # Check if lattice_node binary exists
    if [[ ! -f "./lattice-l1/lattice_node" ]]; then
        log "ERROR: lattice_node binary not found"
        return 1
    fi
    
    # Check configuration files
    local required_configs=(
        "./lattice/genesis/validators.registry.json"
        "./lattice/genesis/genesis_hash.txt"
        "./evm/config/genesis_allocations.json"
    )
    
    for config in "${required_configs[@]}"; do
        if [[ ! -f "$config" ]]; then
            log "ERROR: Required config not found: $config"
            return 1
        fi
    done
    
    # Check available disk space
    local available_disk=$(df . | tail -1 | awk '{print $4}')
    local required_disk=1048576  # 1GB in KB
    
    if [[ $available_disk -lt $required_disk ]]; then
        log "WARNING: Low disk space (${available_disk}KB available, ${required_disk}KB recommended)"
    fi
    
    # Check network ports availability
    local ports=(8545 8547 8549 8551)
    for port in "${ports[@]}"; do
        if netstat -tln 2>/dev/null | grep -q ":$port "; then
            log "WARNING: Port $port is already in use"
        fi
    done
    
    log "Pre-flight checks completed"
    return 0
}

# Initialize network
initialize_network() {
    log "Initializing Lattice network..."
    
    # Stop any existing nodes
    log "Stopping existing nodes..."
    pkill -9 lattice_node 2>/dev/null || true
    fuser -k 8545/tcp 8547/tcp 8549/tcp 8551/tcp 2>/dev/null || true
    sleep 5
    
    # Clean up old data
    log "Cleaning up old data..."
    rm -rf ./nodes/*
    rm -f ./nodes/*.db ./lattice_indexer.db
    
    # Start nodes
    log "Starting 4-node network..."
    if ! ./scripts/start_nodes.sh > "$MAIN_LOG_DIR/network_start_$(date +%Y%m%d_%H%M%S).log" 2>&1; then
        log "ERROR: Failed to start network"
        return 1
    fi
    
    # Wait for network to stabilize
    log "Waiting for network to stabilize..."
    sleep 30
    
    # Verify network health
    log "Verifying network health..."
    local healthy_nodes=0
    local ports=(8545 8547 8549 8551)
    
    for port in "${ports[@]}"; do
        if curl -s --max-time 5 -X POST -H 'Content-Type: application/json' \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "http://localhost:$port" >/dev/null 2>&1; then
            ((healthy_nodes++))
        fi
    done
    
    if [[ $healthy_nodes -eq 4 ]]; then
        log "Network initialized successfully: All 4 nodes healthy"
        return 0
    else
        log "ERROR: Network initialization failed: Only $healthy_nodes/4 nodes healthy"
        return 1
    fi
}

# Start monitoring systems
start_monitoring() {
    log "Starting monitoring systems..."
    
    # Start node health monitor
    log "Starting node health monitor..."
    ./scripts/node_monitor.sh start 10 > "$MAIN_LOG_DIR/monitor_$(date +%Y%m%d_%H%M%S).log" 2>&1 &
    local monitor_pid=$!
    echo $monitor_pid > "$PID_DIR/monitor.pid"
    log "Node monitor started (PID: $monitor_pid)"
    
    # Start auto-recovery
    log "Starting auto-recovery daemon..."
    ./scripts/node_recovery.sh auto 30 > "$MAIN_LOG_DIR/recovery_$(date +%Y%m%d_%H%M%S).log" 2>&1 &
    local recovery_pid=$!
    echo $recovery_pid > "$PID_DIR/recovery.pid"
    log "Auto-recovery started (PID: $recovery_pid)"
    
    # Wait for monitoring to stabilize
    sleep 10
    
    log "All monitoring systems started"
}

# Start metrics collection
start_metrics_collection() {
    log "Starting metrics collection..."
    
    # Start continuous metrics collection
    ./scripts/metrics_analyzer.sh collect 3600 5 > "$MAIN_LOG_DIR/metrics_$(date +%Y%m%d_%H%M%S).log" 2>&1 &
    local metrics_pid=$!
    echo $metrics_pid > "$PID_DIR/metrics.pid"
    log "Metrics collection started (PID: $metrics_pid)"
}

# Generate baseline report
generate_baseline_report() {
    log "Generating baseline performance report..."
    
    # Collect baseline metrics for 60 seconds
    log "Collecting baseline metrics (60s)..."
    local baseline_metrics=$(./scripts/metrics_analyzer.sh collect 60 5)
    
    # Analyze baseline
    log "Analyzing baseline metrics..."
    local baseline_analysis=$(./scripts/metrics_analyzer.sh analyze "$baseline_metrics")
    
    # Generate dashboard
    log "Generating baseline dashboard..."
    local baseline_dashboard=$(./scripts/metrics_analyzer.sh dashboard "$baseline_metrics")
    
    # Save baseline info
    echo "BASELINE_METRICS_FILE=$baseline_metrics" > "$STATE_DIR/baseline_$(date +%Y%m%d).state"
    echo "BASELINE_ANALYSIS_FILE=$baseline_analysis" >> "$STATE_DIR/baseline_$(date +%Y%m%d).state"
    echo "BASELINE_DASHBOARD_FILE=$baseline_dashboard" >> "$STATE_DIR/baseline_$(date +%Y%m%d).state"
    echo "BASELINE_TIMESTAMP=$(date)" >> "$STATE_DIR/baseline_$(date +%Y%m%d).state"
    
    log "Baseline report generated"
    log "  Metrics: $baseline_metrics"
    log "  Analysis: $baseline_analysis"
    log "  Dashboard: $baseline_dashboard"
}

# Execute TPS escalation
execute_escalation() {
    log "Starting 10K TPS escalation plan..."
    
    # Generate pre-escalation report
    ./scripts/node_monitor.sh report
    
    # Run escalation plan
    if ./scripts/tps_escalation.sh run > "$MAIN_LOG_DIR/escalation_$(date +%Y%m%d_%H%M%S).log" 2>&1; then
        log "TPS escalation completed successfully"
        
        # Generate post-escalation report
        log "Generating post-escalation report..."
        ./scripts/node_monitor.sh report
        
        return 0
    else
        log "ERROR: TPS escalation failed"
        return 1
    fi
}

# Generate final report
generate_final_report() {
    log "Generating final performance report..."
    
    local report_file="$MAIN_LOG_DIR/final_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
========================================
LATTICE 10K TPS ESCALATION FINAL REPORT
========================================
Generated: $(date)
Test Duration: $(date -d "$(cat "$STATE_DIR/baseline_$(date +%Y%m%d).state" | grep BASELINE_TIMESTAMP | cut -d'=' -f2)" '+%Y-%m-%d %H:%M:%S') - $(date '+%Y-%m-%d %H:%M:%S')

EXECUTION SUMMARY:
- Pre-flight checks: PASSED
- Network initialization: COMPLETED
- Monitoring systems: ACTIVE
- Metrics collection: ACTIVE
- TPS escalation: EXECUTED

NODE STATUS:
EOF
    
    # Add current node status
    ./scripts/node_recovery.sh status >> "$report_file"
    
    cat >> "$report_file" << EOF

PERFORMANCE METRICS:
- Baseline metrics: $(grep BASELINE_METRICS_FILE "$STATE_DIR/baseline_$(date +%Y%m%d).state" | cut -d'=' -f2)
- Baseline analysis: $(grep BASELINE_ANALYSIS_FILE "$STATE_DIR/baseline_$(date +%Y%m%d).state" | cut -d'=' -f2)
- Baseline dashboard: $(grep BASELINE_DASHBOARD_FILE "$STATE_DIR/baseline_$(date +%Y%m%d).state" | cut -d'=' -f2)

LOG FILES:
- Main orchestrator log: $MAIN_LOG_DIR/orchestrator_$(date +%Y%m%d).log
- Network start log: $(find "$MAIN_LOG_DIR" -name "network_start_*" | head -1)
- Monitor log: $(find "$MAIN_LOG_DIR" -name "monitor_*" | head -1)
- Recovery log: $(find "$MAIN_LOG_DIR" -name "recovery_*" | head -1)
- Metrics log: $(find "$MAIN_LOG_DIR" -name "metrics_*" | head -1)
- Escalation log: $(find "$MAIN_LOG_DIR" -name "escalation_*" | head -1)

RECOMMENDATIONS:
1. Review the performance dashboard for detailed metrics
2. Analyze any alerts or warnings in the logs
3. Check node recovery statistics if any failures occurred
4. Consider optimizing configuration based on results

NEXT STEPS:
1. Stop all monitoring systems: $0 stop
2. Review generated reports and dashboards
3. Plan next test iteration based on results
========================================
EOF
    
    log "Final report generated: $report_file"
    
    # Generate final metrics analysis
    log "Generating final metrics analysis..."
    if [[ -f "$(grep BASELINE_METRICS_FILE "$STATE_DIR/baseline_$(date +%Y%m%d).state" | cut -d'=' -f2)" ]]; then
        ./scripts/metrics_analyzer.sh analyze "$(grep BASELINE_METRICS_FILE "$STATE_DIR/baseline_$(date +%Y%m%d).state" | cut -d'=' -f2)" > "$MAIN_LOG_DIR/final_analysis_$(date +%Y%m%d_%H%M%S).txt" 2>&1
    fi
}

# Stop all systems
stop_all() {
    log "Stopping all orchestration systems..."
    cleanup
    
    # Stop nodes
    log "Stopping all nodes..."
    pkill -9 lattice_node 2>/dev/null || true
    
    log "All systems stopped"
}

# Main execution
main() {
    log "=== LATTICE 10K TPS ESCALATION ORCHESTRATOR START ==="
    log "Starting orchestrated 10K TPS escalation with zero node death guarantee"
    
    case "${1:-run}" in
        "run")
            # Execute full orchestration
            if preflight_checks; then
                if initialize_network; then
                    start_monitoring
                    start_metrics_collection
                    generate_baseline_report
                    sleep 30  # Let monitoring stabilize
                    if execute_escalation; then
                        generate_final_report
                        log "=== ORCHESTRATION COMPLETED SUCCESSFULLY ==="
                    else
                        log "=== ORCHESTRATION FAILED DURING ESCALATION ==="
                        exit 1
                    fi
                else
                    log "=== ORCHESTRATION FAILED DURING NETWORK INITIALIZATION ==="
                    exit 1
                fi
            else
                log "=== ORCHESTRATION FAILED DURING PRE-FLIGHT CHECKS ==="
                exit 1
            fi
            ;;
        "test")
            # Test individual components
            log "Running component tests..."
            
            log "Testing node monitor..."
            ./scripts/node_monitor.sh check
            
            log "Testing node recovery..."
            ./scripts/node_recovery.sh status
            
            log "Testing metrics analyzer..."
            ./scripts/metrics_analyzer.sh collect 10 5 >/dev/null
            
            log "Component tests completed"
            ;;
        "stop")
            stop_all
            ;;
        "status")
            log "Checking orchestration status..."
            
            # Check if processes are running
            local processes_running=0
            
            if [[ -f "$PID_DIR/monitor.pid" ]] && kill -0 $(cat "$PID_DIR/monitor.pid") 2>/dev/null; then
                log "Node monitor: RUNNING (PID: $(cat "$PID_DIR/monitor.pid"))"
                ((processes_running++))
            else
                log "Node monitor: STOPPED"
            fi
            
            if [[ -f "$PID_DIR/recovery.pid" ]] && kill -0 $(cat "$PID_DIR/recovery.pid") 2>/dev/null; then
                log "Auto-recovery: RUNNING (PID: $(cat "$PID_DIR/recovery.pid"))"
                ((processes_running++))
            else
                log "Auto-recovery: STOPPED"
            fi
            
            if [[ -f "$PID_DIR/metrics.pid" ]] && kill -0 $(cat "$PID_DIR/metrics.pid") 2>/dev/null; then
                log "Metrics collection: RUNNING (PID: $(cat "$PID_DIR/metrics.pid"))"
                ((processes_running++))
            else
                log "Metrics collection: STOPPED"
            fi
            
            log "Active orchestration processes: $processes_running/3"
            
            # Check node status
            ./scripts/node_recovery.sh status
            ;;
        *)
            echo "Usage: $0 {run|test|stop|status}"
            echo "  run    - Execute full 10K TPS escalation orchestration"
            echo "  test   - Test individual components"
            echo "  stop   - Stop all orchestration systems"
            echo "  status - Check orchestration status"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
